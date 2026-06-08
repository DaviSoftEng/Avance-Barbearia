const prisma = require('../db');
const { audit } = require('../utils/audit');
const { lunchBreak } = require('../utils/businessRules');
const { getBookingWindowDays, addDaysStr } = require('../utils/settings');

const TZ = 'America/Sao_Paulo';

// Data de "hoje" no fuso do Brasil (YYYY-MM-DD), independente do fuso do servidor
function brToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const APPOINTMENT_INCLUDE = {
  services: { include: { service: true } },
};

exports.createAppointment = async (req, res) => {
  const { clientName, clientPhone, serviceIds, date, time, notes } = req.body;

  if (!clientName || !clientPhone || !Array.isArray(serviceIds) || serviceIds.length === 0 || !date || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  if (clientName.length > 120 || (notes && notes.length > 500)) {
    return res.status(400).json({ error: 'Texto muito longo' });
  }
  if (serviceIds.length > 20) {
    return res.status(400).json({ error: 'Serviços demais' });
  }

  const phoneRegex = /^[\d\s\(\)\-\+]{7,20}$/;
  if (!phoneRegex.test(clientPhone)) {
    return res.status(400).json({ error: 'Telefone inválido' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Data inválida' });
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'Horário inválido' });
  }

  // Janela de agendamento: hoje até hoje + N dias (não permite passado nem datas distantes)
  const today = brToday();
  if (date < today) {
    return res.status(409).json({ error: 'Não é possível agendar em data passada' });
  }
  const windowDays = await getBookingWindowDays();
  const maxDate = addDaysStr(today, windowDays);
  if (date > maxDate) {
    return res.status(409).json({ error: `A agenda está aberta só até ${maxDate.split('-').reverse().join('/')}` });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Busca os serviços solicitados
      const services = await tx.service.findMany({
        where: { id: { in: serviceIds.map(Number) }, active: true },
      });
      if (services.length !== serviceIds.length) {
        throw { status: 400, error: 'Um ou mais serviços não encontrados' };
      }

      const totalPrice    = Math.round(services.reduce((s, sv) => s + sv.price, 0) * 100) / 100;
      const totalDuration = services.reduce((s, sv) => s + sv.duration, 0);
      const startMin      = timeToMinutes(time);
      const endMin        = startMin + totalDuration;

      // Verifica horário de funcionamento
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const bh = await tx.businessHours.findFirst({ where: { dayOfWeek } });
      if (bh && !bh.isOpen) throw { status: 409, error: 'Barbearia fechada neste dia' };
      if (bh) {
        if (startMin < timeToMinutes(bh.openTime) || endMin > timeToMinutes(bh.closeTime)) {
          throw { status: 409, error: 'Fora do horário de funcionamento' };
        }
      }

      // Horário de almoço (12h–13h, seg a sex)
      const lunch = lunchBreak(dayOfWeek);
      if (lunch && startMin < lunch.end && endMin > lunch.start) {
        throw { status: 409, error: 'Horário de almoço (12h às 13h)' };
      }

      // Verifica bloqueio de dia
      const dayBlock = await tx.dayBlock.findFirst({ where: { date } });
      if (dayBlock) {
        if (!dayBlock.startTime) throw { status: 409, error: 'Dia bloqueado na agenda' };
        const blockStart = timeToMinutes(dayBlock.startTime);
        const blockEnd   = timeToMinutes(dayBlock.endTime);
        if (startMin < blockEnd && endMin > blockStart) {
          throw { status: 409, error: 'Horário bloqueado na agenda' };
        }
      }

      // Verifica conflito com outros agendamentos (considera duração de cada um)
      const existing = await tx.appointment.findMany({
        where: { date, status: { in: ['confirmed', 'completed'] } },
        select: { time: true, totalDuration: true },
      });
      for (const appt of existing) {
        const aStart = timeToMinutes(appt.time);
        const aEnd   = aStart + (appt.totalDuration || 30);
        if (startMin < aEnd && endMin > aStart) {
          throw { status: 409, error: 'Horário já ocupado' };
        }
      }

      // Verifica conflito com horários fixos (recorrentes)
      const recurring = await tx.recurringBlock.findMany({ where: { dayOfWeek }, select: { time: true } });
      for (const r of recurring) {
        const rStart = timeToMinutes(r.time);
        const rEnd   = rStart + 30;
        if (startMin < rEnd && endMin > rStart) {
          throw { status: 409, error: 'Horário reservado para cliente fixo' };
        }
      }

      return tx.appointment.create({
        data: {
          clientName,
          clientPhone,
          date,
          time,
          notes: notes || '',
          price: totalPrice,
          totalDuration,
          services: {
            create: serviceIds.map((id) => ({ serviceId: Number(id) })),
          },
        },
        include: APPOINTMENT_INCLUDE,
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
    if (date)   where.date   = date;
    if (status) where.status = status;
    const appointments = await prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
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
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' });
  try {
    const appointment = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: APPOINTMENT_INCLUDE,
    });
    audit(req, 'appointment.updateStatus', { id: appointment.id, status });
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
    audit(req, 'appointment.cancel', { id: appointment.id });
    res.json(appointment);
  } catch (e) {
    console.error('[cancelAppointment]', e);
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });
    audit(req, 'appointment.delete', { id: parseInt(req.params.id) });
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
  if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Telefone inválido' });
  try {
    const today = brToday();
    const appointments = await prisma.appointment.findMany({
      where: { clientPhone: phone, date: { gte: today }, status: { in: ['confirmed'] } },
      include: APPOINTMENT_INCLUDE,
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
    const today  = brToday();
    const anchor = new Date(today + 'T00:00:00Z'); // âncora UTC do dia BR, p/ aritmética estável
    const sow    = new Date(anchor); sow.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
    const startOfWeekStr  = sow.toISOString().slice(0, 10);
    const som    = new Date(anchor); som.setUTCDate(1);
    const startOfMonthStr = som.toISOString().slice(0, 10);

    const [todayAppts, weekAppts, monthAppts, totalClients, topServices] = await Promise.all([
      prisma.appointment.findMany({ where: { date: today }, include: APPOINTMENT_INCLUDE }),
      prisma.appointment.findMany({ where: { date: { gte: startOfWeekStr, lte: today }, status: { in: ['confirmed', 'completed'] } } }),
      prisma.appointment.findMany({ where: { date: { gte: startOfMonthStr, lte: today }, status: { in: ['confirmed', 'completed'] } } }),
      prisma.appointment.groupBy({ by: ['clientPhone'], _count: { clientPhone: true } }),
      prisma.appointmentService.groupBy({
        by: ['serviceId'],
        _count: { serviceId: true },
        where: { appointment: { status: { in: ['confirmed', 'completed'] } } },
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      }),
    ]);

    const sum = (arr) => Math.round(arr.reduce((s, a) => s + a.price, 0) * 100) / 100;
    const completed = (arr) => arr.filter((a) => a.status === 'completed');

    const servicesData   = await prisma.service.findMany({ select: { id: true, name: true } });
    const serviceMap     = Object.fromEntries(servicesData.map((s) => [s.id, s.name]));
    const topServicesNamed = topServices.map((s) => ({
      serviceId: s.serviceId,
      name: serviceMap[s.serviceId] || 'Desconhecido',
      count: s._count.serviceId,
    }));

    res.json({
      today:   { confirmed: todayAppts.filter((a) => a.status === 'confirmed').length, completed: completed(todayAppts).length, total: todayAppts.length, revenue: sum(completed(todayAppts)) },
      week:    { total: weekAppts.length,  revenue: sum(completed(weekAppts)) },
      month:   { total: monthAppts.length, revenue: sum(completed(monthAppts)) },
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
    if (search) where.OR = [{ clientName: { contains: search } }, { clientPhone: { contains: search } }];
    const appointments = await prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
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

    res.json(Object.values(clientMap).sort((a, b) => (b.lastVisit > a.lastVisit ? 1 : -1)));
  } catch (e) {
    console.error('[getClients]', e);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
};

exports.updateAppointment = async (req, res) => {
  const id = parseInt(req.params.id);
  const { clientName, clientPhone, serviceIds, date, time, notes } = req.body;

  if (!clientName || !clientPhone || !Array.isArray(serviceIds) || serviceIds.length === 0 || !date || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  if (clientName.length > 120 || (notes && notes.length > 500)) {
    return res.status(400).json({ error: 'Texto muito longo' });
  }
  if (serviceIds.length > 20) {
    return res.status(400).json({ error: 'Serviços demais' });
  }
  const phoneRegex = /^[\d\s\(\)\-\+]{7,20}$/;
  if (!phoneRegex.test(clientPhone)) return res.status(400).json({ error: 'Telefone inválido' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Data inválida' });
  if (!/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ error: 'Horário inválido' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const services = await tx.service.findMany({
        where: { id: { in: serviceIds.map(Number) }, active: true },
      });
      if (services.length !== serviceIds.length) {
        throw { status: 400, error: 'Um ou mais serviços não encontrados' };
      }

      const totalPrice    = Math.round(services.reduce((s, sv) => s + sv.price, 0) * 100) / 100;
      const totalDuration = services.reduce((s, sv) => s + sv.duration, 0);
      const startMin      = timeToMinutes(time);
      const endMin        = startMin + totalDuration;

      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const bh = await tx.businessHours.findFirst({ where: { dayOfWeek } });
      if (bh && !bh.isOpen) throw { status: 409, error: 'Barbearia fechada neste dia' };
      if (bh && (startMin < timeToMinutes(bh.openTime) || endMin > timeToMinutes(bh.closeTime))) {
        throw { status: 409, error: 'Fora do horário de funcionamento' };
      }

      // Horário de almoço (12h–13h, seg a sex)
      const lunch = lunchBreak(dayOfWeek);
      if (lunch && startMin < lunch.end && endMin > lunch.start) {
        throw { status: 409, error: 'Horário de almoço (12h às 13h)' };
      }

      const dayBlock = await tx.dayBlock.findFirst({ where: { date } });
      if (dayBlock) {
        if (!dayBlock.startTime) throw { status: 409, error: 'Dia bloqueado na agenda' };
        if (startMin < timeToMinutes(dayBlock.endTime) && endMin > timeToMinutes(dayBlock.startTime)) {
          throw { status: 409, error: 'Horário bloqueado na agenda' };
        }
      }

      // Conflito com outros agendamentos — exclui o próprio
      const existing = await tx.appointment.findMany({
        where: { date, status: { in: ['confirmed', 'completed'] }, id: { not: id } },
        select: { time: true, totalDuration: true },
      });
      for (const appt of existing) {
        const aStart = timeToMinutes(appt.time);
        const aEnd   = aStart + (appt.totalDuration || 30);
        if (startMin < aEnd && endMin > aStart) {
          throw { status: 409, error: 'Horário já ocupado' };
        }
      }

      await tx.appointmentService.deleteMany({ where: { appointmentId: id } });

      return tx.appointment.update({
        where: { id },
        data: {
          clientName,
          clientPhone,
          date,
          time,
          notes: notes || '',
          price: totalPrice,
          totalDuration,
          services: { create: serviceIds.map((sid) => ({ serviceId: Number(sid) })) },
        },
        include: APPOINTMENT_INCLUDE,
      });
    });

    audit(req, 'appointment.update', { id });
    res.json(result);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.error });
    console.error('[updateAppointment]', e);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
};

// Rota pública — cliente cancela o próprio agendamento (sem token).
// Exige o telefone do agendamento como prova de posse (evita cancelamento em massa por id sequencial).
exports.cancelAppointmentPublic = async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Identificador inválido' });

  const { phone } = req.body || {};
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Telefone é obrigatório para cancelar' });
  }

  try {
    const appt = await prisma.appointment.findUnique({ where: { id } });
    // Mesma resposta para "não existe" e "telefone não confere" — não revela existência de id
    if (!appt || appt.clientPhone !== phone.trim()) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    if (appt.status !== 'confirmed') {
      return res.status(400).json({ error: 'Apenas agendamentos confirmados podem ser cancelados' });
    }
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    res.json(updated);
  } catch (e) {
    console.error('[cancelAppointmentPublic]', e);
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
};
