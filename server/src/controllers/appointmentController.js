const prisma = require('../db');

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

exports.createAppointment = async (req, res) => {
  const { clientName, clientPhone, serviceId, date, time, notes } = req.body;
  if (!clientName || !clientPhone || !serviceId || !date || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const phoneRegex = /^[\d\s\(\)\-\+]{7,20}$/;
  if (!phoneRegex.test(clientPhone)) {
    return res.status(400).json({ error: 'Telefone inválido' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: 'Data inválida' });
  }

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(time)) {
    return res.status(400).json({ error: 'Horário inválido' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verifica conflito dentro da transação (evita race condition)
      const conflict = await tx.appointment.findFirst({
        where: { date, time, status: { in: ['confirmed', 'completed'] } },
      });
      if (conflict) throw { status: 409, error: 'Horário já ocupado' };

      const dayOfWeek = new Date(date + 'T12:00:00').getDay();

      const block = await tx.recurringBlock.findFirst({ where: { dayOfWeek, time } });
      if (block) throw { status: 409, error: 'Horário reservado para cliente fixo' };

      // Verifica bloqueio de dia
      const dayBlock = await tx.dayBlock.findFirst({ where: { date } });
      if (dayBlock) {
        if (!dayBlock.startTime) throw { status: 409, error: 'Dia bloqueado na agenda' };
        const t = timeToMinutes(time);
        if (t >= timeToMinutes(dayBlock.startTime) && t < timeToMinutes(dayBlock.endTime)) {
          throw { status: 409, error: 'Horário bloqueado na agenda' };
        }
      }

      // Verifica horário de funcionamento
      const bh = await tx.businessHours.findFirst({ where: { dayOfWeek } });
      if (bh && !bh.isOpen) throw { status: 409, error: 'Barbearia fechada neste dia' };
      if (bh) {
        const t = timeToMinutes(time);
        if (t < timeToMinutes(bh.openTime) || t >= timeToMinutes(bh.closeTime)) {
          throw { status: 409, error: 'Fora do horário de funcionamento' };
        }
      }

      const service = await tx.service.findUnique({ where: { id: parseInt(serviceId) } });
      if (!service) throw { status: 404, error: 'Serviço não encontrado' };

      return tx.appointment.create({
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
    });

    res.status(201).json(result);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.error });
    console.error('[createAppointment]', e);
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
  } catch (e) {
    console.error('[getAppointments]', e);
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
  } catch (e) {
    console.error('[updateStatus]', e);
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
  } catch (e) {
    console.error('[cancelAppointment]', e);
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (e) {
    console.error('[deleteAppointment]', e);
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
};

exports.lookupByPhone = async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Telefone é obrigatório' });

  const phoneRegex = /^[\d\s\(\)\-\+]{7,20}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Telefone inválido' });
  }

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
  } catch (e) {
    console.error('[lookupByPhone]', e);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = getStartOfWeek(new Date());
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const [todayAppts, weekAppts, monthAppts, totalClients, topServices] = await Promise.all([
      prisma.appointment.findMany({ where: { date: today }, include: { service: true } }),
      prisma.appointment.findMany({ where: { date: { gte: startOfWeekStr, lte: today }, status: { in: ['confirmed', 'completed'] } } }),
      prisma.appointment.findMany({ where: { date: { gte: startOfMonthStr, lte: today }, status: { in: ['confirmed', 'completed'] } } }),
      prisma.appointment.groupBy({ by: ['clientPhone'], _count: { clientPhone: true } }),
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
    // Usar Math.round para evitar imprecisão de float
    const todayRevenue = Math.round(todayAppts.filter((a) => a.status === 'completed').reduce((s, a) => s + a.price, 0) * 100) / 100;
    const weekRevenue = Math.round(weekAppts.filter((a) => a.status === 'completed').reduce((s, a) => s + a.price, 0) * 100) / 100;
    const monthRevenue = Math.round(monthAppts.filter((a) => a.status === 'completed').reduce((s, a) => s + a.price, 0) * 100) / 100;

    const servicesData = await prisma.service.findMany({ select: { id: true, name: true } });
    const serviceMap = Object.fromEntries(servicesData.map((s) => [s.id, s.name]));
    const topServicesNamed = topServices.map((s) => ({
      serviceId: s.serviceId,
      name: serviceMap[s.serviceId] || 'Desconhecido',
      count: s._count.serviceId,
      revenue: Math.round((s._sum.price || 0) * 100) / 100,
    }));

    res.json({
      today: { confirmed: todayConfirmed, completed: todayCompleted, total: todayAppts.length, revenue: todayRevenue },
      week: { total: weekAppts.length, revenue: weekRevenue },
      month: { total: monthAppts.length, revenue: monthRevenue },
      totalUniqueClients: totalClients.length,
      topServices: topServicesNamed,
    });
  } catch (e) {
    console.error('[getStats]', e);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

exports.getClients = async (req, res) => {
  const { search } = req.query;
  try {
    const where = {};
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

    const clientMap = {};
    for (const appt of appointments) {
      const key = appt.clientPhone;
      if (!clientMap[key]) {
        clientMap[key] = { clientName: appt.clientName, clientPhone: appt.clientPhone, totalVisits: 0, totalSpent: 0, lastVisit: null, appointments: [] };
      }
      const c = clientMap[key];
      c.appointments.push(appt);
      if (appt.status === 'completed') {
        c.totalVisits++;
        c.totalSpent = Math.round((c.totalSpent + appt.price) * 100) / 100;
      }
      if (!c.lastVisit || appt.date > c.lastVisit) c.lastVisit = appt.date;
    }

    const clients = Object.values(clientMap).sort((a, b) => (b.lastVisit > a.lastVisit ? 1 : -1));
    res.json(clients);
  } catch (e) {
    console.error('[getClients]', e);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
};

function getStartOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
