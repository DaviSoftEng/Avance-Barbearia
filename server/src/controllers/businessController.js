const prisma = require('../db');
const { audit } = require('../utils/audit');
const { getBookingWindowDays } = require('../utils/settings');

// Configurações de agendamento (público — o site precisa saber a janela)
exports.getSettings = async (req, res) => {
  try {
    res.json({ bookingWindowDays: await getBookingWindowDays() });
  } catch (e) {
    console.error('[getSettings]', e);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
};

exports.updateSettings = async (req, res) => {
  const n = parseInt(req.body.bookingWindowDays, 10);
  if (!Number.isFinite(n) || n < 1 || n > 365) {
    return res.status(400).json({ error: 'Janela inválida (use de 1 a 365 dias)' });
  }
  try {
    await prisma.setting.upsert({
      where: { key: 'bookingWindowDays' },
      update: { value: String(n) },
      create: { key: 'bookingWindowDays', value: String(n) },
    });
    audit(req, 'settings.update', { bookingWindowDays: n });
    res.json({ bookingWindowDays: n });
  } catch (e) {
    console.error('[updateSettings]', e);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
};

exports.getBusinessHours = async (req, res) => {
  try {
    const hours = await prisma.businessHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
    res.json(hours);
  } catch (e) {
    console.error('[getBusinessHours]', e);
    res.status(500).json({ error: 'Erro ao buscar horários' });
  }
};

exports.updateBusinessHours = async (req, res) => {
  const { hours } = req.body;
  if (!Array.isArray(hours)) return res.status(400).json({ error: 'Formato inválido' });
  try {
    const updates = await Promise.all(
      hours.map((h) =>
        prisma.businessHours.upsert({
          where: { dayOfWeek: h.dayOfWeek },
          update: { isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
          create: { dayOfWeek: h.dayOfWeek, isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
        })
      )
    );
    audit(req, 'businessHours.update', { days: updates.length });
    res.json(updates);
  } catch (e) {
    console.error('[updateBusinessHours]', e);
    res.status(500).json({ error: 'Erro ao atualizar horários' });
  }
};

exports.getDayBlocks = async (req, res) => {
  try {
    const blocks = await prisma.dayBlock.findMany({ orderBy: { date: 'asc' } });
    res.json(blocks);
  } catch (e) {
    console.error('[getDayBlocks]', e);
    res.status(500).json({ error: 'Erro ao buscar bloqueios' });
  }
};

exports.createDayBlock = async (req, res) => {
  const { date, reason, startTime, endTime } = req.body;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });
  try {
    const block = await prisma.dayBlock.create({
      data: { date, reason: reason || '', startTime: startTime || null, endTime: endTime || null },
    });
    audit(req, 'dayBlock.create', { id: block.id, date });
    res.status(201).json(block);
  } catch (e) {
    console.error('[createDayBlock]', e);
    res.status(500).json({ error: 'Erro ao criar bloqueio' });
  }
};

exports.deleteDayBlock = async (req, res) => {
  try {
    await prisma.dayBlock.delete({ where: { id: parseInt(req.params.id) } });
    audit(req, 'dayBlock.delete', { id: parseInt(req.params.id) });
    res.status(204).send();
  } catch (e) {
    console.error('[deleteDayBlock]', e);
    res.status(500).json({ error: 'Erro ao excluir bloqueio' });
  }
};
