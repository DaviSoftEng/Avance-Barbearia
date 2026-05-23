const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createAppointment = async (req, res) => {
  const { clientName, clientPhone, serviceId, date, time, notes } = req.body;
  if (!clientName || !clientPhone || !serviceId || !date || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  try {
    const conflict = await prisma.appointment.findFirst({
      where: { date, time, status: { in: ['confirmed', 'completed'] } },
    });
    if (conflict) return res.status(409).json({ error: 'Horário já ocupado' });

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const block = await prisma.recurringBlock.findFirst({ where: { dayOfWeek, time } });
    if (block) return res.status(409).json({ error: 'Horário reservado para cliente fixo' });

    // Verifica bloqueio de dia
    const dayBlock = await prisma.dayBlock.findFirst({ where: { date } });
    if (dayBlock) {
      if (!dayBlock.startTime) return res.status(409).json({ error: 'Dia bloqueado na agenda' });
      if (time >= dayBlock.startTime && time < dayBlock.endTime) {
        return res.status(409).json({ error: 'Horário bloqueado na agenda' });
      }
    }

    // Verifica horário de funcionamento
    const bh = await prisma.businessHours.findFirst({ where: { dayOfWeek } });
    if (bh && !bh.isOpen) return res.status(409).json({ error: 'Barbearia fechada neste dia' });
    if (bh && (time < bh.openTime || time >= bh.closeTime)) {
      return res.status(409).json({ error: 'Fora do horário de funcionamento' });
    }

    const service = await prisma.service.findUnique({ where: { id: parseInt(serviceId) } });
    if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });

    const appointment = await prisma.appointment.create({
      data: {
        clientName,
        clientPhone,
        serviceId: parseInt(serviceId),
        date,
        time,
        notes: notes || '',
        price: service.price,
      },
      include: { service: true },
    });
    res.status(201).json(appointment);
  } catch {
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
};

exports.getAppointments = async (req, res) => {
  const { date, status } = req.query;
  try {
    const where = {};
    if (date) where.date = date;
    if (status) where.status = status;
    const appointments = await prisma.appointment.findMany({
      where,
      include: { service: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    res.json(appointments);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['confirmed', 'completed', 'no_show', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  try {
    const appointment = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: { service: true },
    });
    res.json(appointment);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'cancelled' },
    });
    res.json(appointment);
  } catch {
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
};

// Consulta pública por telefone (sem auth)
exports.lookupByPhone = async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Telefone é obrigatório' });
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await prisma.appointment.findMany({
      where: {
        clientPhone: phone,
        date: { gte: today },
        status: { in: ['confirmed'] },
      },
      include: { service: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    res.json(appointments);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

// Stats e faturamento (admin)
exports.getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = getStartOfWeek(new Date());
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const [todayAppts, weekAppts, monthAppts, totalClients, topServices] = await Promise.all([
      prisma.appointment.findMany({
        where: { date: today },
        include: { service: true },
      }),
      prisma.appointment.findMany({
        where: { date: { gte: startOfWeekStr, lte: today }, status: { in: ['confirmed', 'completed'] } },
      }),
      prisma.appointment.findMany({
        where: { date: { gte: startOfMonthStr, lte: today }, status: { in: ['confirmed', 'completed'] } },
      }),
      prisma.appointment.groupBy({
        by: ['clientPhone'],
        _count: { clientPhone: true },
      }),
      prisma.appointment.groupBy({
        by: ['serviceId'],
        _count: { serviceId: true },
        _sum: { price: true },
        where: { status: { in: ['confirmed', 'completed'] } },
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      }),
    ]);

    const todayConfirmed = todayAppts.filter((a) => a.status === 'confirmed').length;
    const todayCompleted = todayAppts.filter((a) => a.status === 'completed').length;
    const todayRevenue = todayAppts
      .filter((a) => a.status === 'completed')
      .reduce((sum, a) => sum + a.price, 0);
    const weekRevenue = weekAppts.filter((a) => a.status === 'completed').reduce((sum, a) => sum + a.price, 0);
    const monthRevenue = monthAppts.filter((a) => a.status === 'completed').reduce((sum, a) => sum + a.price, 0);

    // Serviços populares com nome
    const servicesData = await prisma.service.findMany({ select: { id: true, name: true } });
    const serviceMap = Object.fromEntries(servicesData.map((s) => [s.id, s.name]));
    const topServicesNamed = topServices.map((s) => ({
      serviceId: s.serviceId,
      name: serviceMap[s.serviceId] || 'Desconhecido',
      count: s._count.serviceId,
      revenue: s._sum.price || 0,
    }));

    res.json({
      today: {
        confirmed: todayConfirmed,
        completed: todayCompleted,
        total: todayAppts.length,
        revenue: todayRevenue,
      },
      week: {
        total: weekAppts.length,
        revenue: weekRevenue,
      },
      month: {
        total: monthAppts.length,
        revenue: monthRevenue,
      },
      totalUniqueClients: totalClients.length,
      topServices: topServicesNamed,
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

// Histórico de clientes agrupado por telefone (admin)
exports.getClients = async (req, res) => {
  const { search } = req.query;
  try {
    const where = { status: { in: ['confirmed', 'completed', 'no_show', 'cancelled'] } };
    if (search) {
      where.OR = [
        { clientName: { contains: search } },
        { clientPhone: { contains: search } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { service: true },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });

    // Agrupa por telefone
    const clientMap = {};
    for (const appt of appointments) {
      const key = appt.clientPhone;
      if (!clientMap[key]) {
        clientMap[key] = {
          clientName: appt.clientName,
          clientPhone: appt.clientPhone,
          totalVisits: 0,
          totalSpent: 0,
          lastVisit: null,
          appointments: [],
        };
      }
      const c = clientMap[key];
      c.appointments.push(appt);
      if (appt.status === 'completed') {
        c.totalVisits++;
        c.totalSpent += appt.price;
      }
      if (!c.lastVisit || appt.date > c.lastVisit) c.lastVisit = appt.date;
    }

    const clients = Object.values(clientMap).sort((a, b) => {
      if (b.lastVisit > a.lastVisit) return 1;
      if (b.lastVisit < a.lastVisit) return -1;
      return 0;
    });

    res.json(clients);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
};

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}
