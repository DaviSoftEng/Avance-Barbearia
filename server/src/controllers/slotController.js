const prisma = require('../db');

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function generateSlots(openTime, closeTime, interval = 30) {
  const slots = [];
  let current = timeToMinutes(openTime);
  const end = timeToMinutes(closeTime);
  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += interval;
  }
  return slots;
}

exports.getAvailableSlots = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

  try {
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    const bh = await prisma.businessHours.findFirst({ where: { dayOfWeek } });
    if (bh && !bh.isOpen) {
      return res.json({ date, available: [], closed: true });
    }

    const openTime = bh?.openTime || '09:00';
    const closeTime = bh?.closeTime || '19:00';

    const dayBlock = await prisma.dayBlock.findFirst({ where: { date } });
    if (dayBlock && !dayBlock.startTime) {
      return res.json({ date, available: [], blocked: true, reason: dayBlock.reason });
    }

    const booked = await prisma.appointment.findMany({
      where: { date, status: { in: ['confirmed', 'completed'] } },
      select: { time: true },
    });
    const occupied = new Set(booked.map((a) => a.time));

    const recurring = await prisma.recurringBlock.findMany({ where: { dayOfWeek }, select: { time: true } });
    recurring.forEach((r) => occupied.add(r.time));

    if (dayBlock?.startTime && dayBlock?.endTime) {
      const blockStart = timeToMinutes(dayBlock.startTime);
      const blockEnd = timeToMinutes(dayBlock.endTime);
      generateSlots(openTime, closeTime).forEach((s) => {
        const t = timeToMinutes(s);
        if (t >= blockStart && t < blockEnd) occupied.add(s);
      });
    }

    const available = generateSlots(openTime, closeTime).filter((s) => !occupied.has(s));
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
    res.status(201).json(block);
  } catch (e) {
    console.error('[createRecurringBlock]', e);
    res.status(500).json({ error: 'Erro ao criar horário fixo' });
  }
};

exports.deleteRecurringBlock = async (req, res) => {
  try {
    await prisma.recurringBlock.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (e) {
    console.error('[deleteRecurringBlock]', e);
    res.status(500).json({ error: 'Erro ao excluir horário fixo' });
  }
};
