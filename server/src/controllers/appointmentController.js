const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createAppointment = async (req, res) => {
  const { clientName, clientPhone, serviceId, date, time, notes } = req.body;
  if (!clientName || !clientPhone || !serviceId || !date || !time) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  try {
    const conflict = await prisma.appointment.findFirst({
      where: { date, time, status: 'confirmed' },
    });
    if (conflict) return res.status(409).json({ error: 'Horário já ocupado' });

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const block = await prisma.recurringBlock.findFirst({ where: { dayOfWeek, time } });
    if (block) return res.status(409).json({ error: 'Horário reservado para cliente fixo' });

    const appointment = await prisma.appointment.create({
      data: {
        clientName,
        clientPhone,
        serviceId: parseInt(serviceId),
        date,
        time,
        notes: notes || '',
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
