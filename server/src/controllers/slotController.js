const prisma = require('../db');
const { audit } = require('../utils/audit');
const { lunchBreak } = require('../utils/businessRules');
const { getAgendaState, brToday, saturdayOnOrAfter } = require('../utils/settings');
const { recurringOccupied } = require('../utils/recurring');
const { normalizePhone } = require('../utils/phone');

const RECURRING_INCLUDE = { services: { include: { service: true } } };

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Intervalo entre os horários oferecidos ao cliente (de hora em hora)
const SLOT_INTERVAL = 60;

function generateSlots(openTime, closeTime, interval = SLOT_INTERVAL) {
  const slots = [];
  let current = timeToMinutes(openTime);
  const end   = timeToMinutes(closeTime);
  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += interval;
  }
  return slots;
}

exports.getAvailableSlots = async (req, res) => {
  const { date, duration } = req.query;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

  // Agenda fechada (Ryann não abriu, ou já passou do teto) → sem horários
  const today = brToday();
  const agenda = await getAgendaState(today);
  if (!agenda.open) {
    return res.json({ date, available: [], agendaClosed: true });
  }
  // Fora da janela: passado, ou além do teto (data escolhida pelo Ryann / sábado da semana)
  if (date < today || date > agenda.ceiling) {
    return res.json({ date, available: [], outOfWindow: true });
  }

  const requestedDuration = Math.max(parseInt(duration) || 30, 30);

  try {
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    const bh = await prisma.businessHours.findFirst({ where: { dayOfWeek } });
    if (bh && !bh.isOpen) return res.json({ date, available: [], closed: true });

    const openTime  = bh?.openTime  || '09:00';
    const closeTime = bh?.closeTime || '19:00';

    const dayBlock = await prisma.dayBlock.findFirst({ where: { date } });
    if (dayBlock && !dayBlock.startTime) {
      return res.json({ date, available: [], blocked: true, reason: dayBlock.reason });
    }

    // Monta lista de intervalos ocupados (start, end em minutos)
    const occupied = [];

    // Agendamentos existentes com sua duração real
    const booked = await prisma.appointment.findMany({
      where: { date, status: { in: ['confirmed', 'completed'] } },
      select: { time: true, totalDuration: true },
    });
    booked.forEach((a) => {
      const s = timeToMinutes(a.time);
      occupied.push({ start: s, end: s + (a.totalDuration || 30) });
    });

    // Horários fixos recorrentes (30 min cada), já com adiantamentos/cancelamentos da semana
    (await recurringOccupied(prisma, date)).forEach((o) => occupied.push(o));

    // Bloqueio parcial de horário
    if (dayBlock?.startTime && dayBlock?.endTime) {
      occupied.push({ start: timeToMinutes(dayBlock.startTime), end: timeToMinutes(dayBlock.endTime) });
    }

    // Horário de almoço (12h–13h, seg a sex)
    const lunch = lunchBreak(dayOfWeek);
    if (lunch) occupied.push(lunch);

    const closeMin = timeToMinutes(closeTime);

    // Um slot está disponível se [slotStart, slotStart + duration) não sobrepõe nenhum intervalo ocupado
    // e não ultrapassa o horário de fechamento
    const available = generateSlots(openTime, closeTime).filter((slot) => {
      const slotStart = timeToMinutes(slot);
      const slotEnd   = slotStart + requestedDuration;
      if (slotEnd > closeMin) return false;
      return !occupied.some((o) => slotStart < o.end && slotEnd > o.start);
    });

    res.json({ date, available });
  } catch (e) {
    console.error('[getAvailableSlots]', e);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

exports.getRecurringBlocks = async (req, res) => {
  try {
    const blocks = await prisma.recurringBlock.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
      include: RECURRING_INCLUDE,
    });
    res.json(blocks);
  } catch (e) {
    console.error('[getRecurringBlocks]', e);
    res.status(500).json({ error: 'Erro ao buscar horários fixos' });
  }
};

// Normaliza serviceIds vindos do body em uma lista de inteiros distintos.
function parseServiceIds(serviceIds) {
  if (!Array.isArray(serviceIds)) return [];
  return [...new Set(serviceIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
}

exports.createRecurringBlock = async (req, res) => {
  const { clientName, clientPhone, dayOfWeek, time, notes, serviceIds } = req.body;
  if (!clientName || dayOfWeek === undefined || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  const ids = parseServiceIds(serviceIds);
  try {
    const block = await prisma.recurringBlock.create({
      data: {
        clientName,
        clientPhone: clientPhone ? normalizePhone(clientPhone) : '',
        dayOfWeek: parseInt(dayOfWeek),
        time,
        notes: notes || '',
        services: { create: ids.map((id) => ({ serviceId: id })) },
      },
      include: RECURRING_INCLUDE,
    });
    audit(req, 'recurringBlock.create', { id: block.id });
    res.status(201).json(block);
  } catch (e) {
    console.error('[createRecurringBlock]', e);
    res.status(500).json({ error: 'Erro ao criar horário fixo' });
  }
};

exports.updateRecurringBlock = async (req, res) => {
  const id = parseInt(req.params.id);
  const { clientName, clientPhone, dayOfWeek, time, notes, serviceIds } = req.body;
  if (!clientName || dayOfWeek === undefined || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  const ids = parseServiceIds(serviceIds);
  try {
    const block = await prisma.$transaction(async (tx) => {
      await tx.recurringBlockService.deleteMany({ where: { recurringBlockId: id } });
      return tx.recurringBlock.update({
        where: { id },
        data: {
          clientName,
          clientPhone: clientPhone ? normalizePhone(clientPhone) : '',
          dayOfWeek: parseInt(dayOfWeek),
          time,
          notes: notes || '',
          services: { create: ids.map((sid) => ({ serviceId: sid })) },
        },
        include: RECURRING_INCLUDE,
      });
    });
    audit(req, 'recurringBlock.update', { id });
    res.json(block);
  } catch (e) {
    console.error('[updateRecurringBlock]', e);
    res.status(500).json({ error: 'Erro ao atualizar horário fixo' });
  }
};

exports.deleteRecurringBlock = async (req, res) => {
  try {
    await prisma.recurringBlock.delete({ where: { id: parseInt(req.params.id) } });
    audit(req, 'recurringBlock.delete', { id: parseInt(req.params.id) });
    res.status(204).send();
  } catch (e) {
    console.error('[deleteRecurringBlock]', e);
    res.status(500).json({ error: 'Erro ao excluir horário fixo' });
  }
};

// Registra o atendimento de um cliente fixo numa data → cria um agendamento "completed"
// com o(s) serviço(s) do fixo, fazendo o valor entrar no faturamento e no histórico.
exports.completeRecurring = async (req, res) => {
  const recurringBlockId = parseInt(req.params.id);
  const { date, time } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'Data inválida' });
  }
  if (time && !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'Horário inválido' });
  }
  try {
    const block = await prisma.recurringBlock.findUnique({
      where: { id: recurringBlockId },
      include: RECURRING_INCLUDE,
    });
    if (!block) return res.status(404).json({ error: 'Cliente fixo não encontrado' });
    if (block.services.length === 0) {
      return res.status(400).json({ error: 'Configure o serviço do cliente fixo antes de concluir.' });
    }

    // Evita registrar o mesmo fixo duas vezes na mesma data
    const already = await prisma.appointment.findFirst({
      where: { recurringBlockId, date, status: { in: ['confirmed', 'completed'] } },
    });
    if (already) return res.status(409).json({ error: 'Este cliente fixo já foi registrado nesta data.' });

    const services = block.services.map((s) => s.service);
    const totalPrice    = Math.round(services.reduce((sum, sv) => sum + sv.price, 0) * 100) / 100;
    const totalDuration = services.reduce((sum, sv) => sum + sv.duration, 0);

    const appointment = await prisma.appointment.create({
      data: {
        clientName: block.clientName,
        clientPhone: block.clientPhone || '',
        date,
        time: time || block.time,
        status: 'completed',
        price: totalPrice,
        totalDuration,
        recurringBlockId,
        services: { create: services.map((sv) => ({ serviceId: sv.id })) },
      },
      include: { services: { include: { service: true } } },
    });
    audit(req, 'recurringBlock.complete', { recurringBlockId, appointmentId: appointment.id, date });
    res.status(201).json(appointment);
  } catch (e) {
    console.error('[completeRecurring]', e);
    res.status(500).json({ error: 'Erro ao registrar atendimento do cliente fixo' });
  }
};

// ── Exceções da semana (adiantar/remarcar ou cancelar um cliente fixo numa data) ──

exports.getRecurringExceptions = async (req, res) => {
  try {
    const exceptions = await prisma.recurringException.findMany({
      include: { recurringBlock: { include: RECURRING_INCLUDE } },
      orderBy: { originalDate: 'asc' },
    });
    res.json(exceptions);
  } catch (e) {
    console.error('[getRecurringExceptions]', e);
    res.status(500).json({ error: 'Erro ao buscar exceções' });
  }
};

exports.createRecurringException = async (req, res) => {
  const recurringBlockId = parseInt(req.params.id);
  const { originalDate, type, newDate, newTime } = req.body;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(originalDate || '')) {
    return res.status(400).json({ error: 'Data original inválida' });
  }
  if (!['move', 'cancel'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }
  if (type === 'move') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate || '') || !/^\d{2}:\d{2}$/.test(newTime || '')) {
      return res.status(400).json({ error: 'Informe o novo dia e horário' });
    }
    // Remarcação só dentro da mesma semana (mesmo sábado de referência)
    if (saturdayOnOrAfter(originalDate) !== saturdayOnOrAfter(newDate)) {
      return res.status(400).json({ error: 'A remarcação deve ser na mesma semana' });
    }
  }

  try {
    const block = await prisma.recurringBlock.findUnique({ where: { id: recurringBlockId } });
    if (!block) return res.status(404).json({ error: 'Cliente fixo não encontrado' });

    // Uma exceção por (fixo, data original): substitui a anterior se existir
    await prisma.recurringException.deleteMany({ where: { recurringBlockId, originalDate } });
    const exception = await prisma.recurringException.create({
      data: {
        recurringBlockId,
        originalDate,
        type,
        newDate: type === 'move' ? newDate : null,
        newTime: type === 'move' ? newTime : null,
      },
    });
    audit(req, 'recurringException.create', { id: exception.id, recurringBlockId, type });
    res.status(201).json(exception);
  } catch (e) {
    console.error('[createRecurringException]', e);
    res.status(500).json({ error: 'Erro ao criar exceção' });
  }
};

exports.deleteRecurringException = async (req, res) => {
  try {
    await prisma.recurringException.delete({ where: { id: parseInt(req.params.id) } });
    audit(req, 'recurringException.delete', { id: parseInt(req.params.id) });
    res.status(204).send();
  } catch (e) {
    console.error('[deleteRecurringException]', e);
    res.status(500).json({ error: 'Erro ao excluir exceção' });
  }
};
