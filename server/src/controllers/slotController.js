const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateSlots(startHour = 9, endHour = 19, interval = 30) {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

exports.getAvailableSlots = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

  try {
    const booked = await prisma.appointment.findMany({
      where: { date, status: 'confirmed' },
      select: { time: true },
    });
    const occupied = new Set(booked.map((a) => a.time));

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const recurring = await prisma.recurringBlock.findMany({
      where: { dayOfWeek },
      select: { time: true },
    });
    recurring.forEach((r) => occupied.add(r.time));

    const allSlots = generateSlots();
    const available = allSlots.filter((s) => !occupied.has(s));
    res.json({ date, available });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

exports.getRecurringBlocks = async (req, res) => {
  try {
    const blocks = await prisma.recurringBlock.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
    });
    res.json(blocks);
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Erro ao criar horário fixo' });
  }
};

exports.deleteRecurringBlock = async (req, res) => {
  try {
    await prisma.recurringBlock.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao excluir horário fixo' });
  }
};
