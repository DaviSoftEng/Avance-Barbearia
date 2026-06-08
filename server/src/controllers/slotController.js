const prisma = require('../db');
const { audit } = require('../utils/audit');
const { lunchBreak } = require('../utils/businessRules');
const { getBookingWindowDays, addDaysStr } = require('../utils/settings');

const TZ = 'America/Sao_Paulo';

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

  // Fora da janela de agendamento (passado ou além de hoje + N dias) → sem horários
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const windowDays = await getBookingWindowDays();
  if (date < today || date > addDaysStr(today, windowDays)) {
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

    // Horários fixos recorrentes (30 min cada)
    const recurring = await prisma.recurringBlock.findMany({ where: { dayOfWeek }, select: { time: true } });
    recurring.forEach((r) => {
      const s = timeToMinutes(r.time);
      occupied.push({ start: s, end: s + 30 });
    });

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
    const blocks = await prisma.recurringBlock.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }] });
    res.json(blocks);
  } catch (e) {
    console.error('[getRecurringBlocks]', e);
    res.status(500).json({ error: 'Erro ao buscar horários fixos' });
  }
};

exports.createRecurringBlock = async (req, res) => {
  const { clientName, dayOfWeek, time, notes } = req.body;
  if (!clientName || dayOfWeek === undefined || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  try {
    const block = await prisma.recurringBlock.create({
      data: { clientName, dayOfWeek: parseInt(dayOfWeek), time, notes: notes || '' },
    });
    audit(req, 'recurringBlock.create', { id: block.id });
    res.status(201).json(block);
  } catch (e) {
    console.error('[createRecurringBlock]', e);
    res.status(500).json({ error: 'Erro ao criar horário fixo' });
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
