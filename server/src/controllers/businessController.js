const prisma = require('../db');
const { audit } = require('../utils/audit');
const { getBookingWindowDays, getWhatsapp, getAgendaState } = require('../utils/settings');

async function setKey(key, value) {
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

// Monta o payload de configurações enviado ao front (admin e site público).
// Campos da agenda:
//  - agendaOpen / agendaOpenUntil → estado "cru" (controles do painel do Ryann)
//  - agendaIsOpenNow / agendaMaxDate → estado efetivo (usado pelo site do cliente)
//  - agendaSaturday → sábado da semana atual (teto máximo do seletor de data)
async function buildSettingsPayload() {
  const agenda = await getAgendaState();
  return {
    bookingWindowDays: await getBookingWindowDays(),
    whatsapp: await getWhatsapp(),
    agendaOpen: agenda.flag,
    agendaOpenUntil: agenda.openUntil,
    agendaIsOpenNow: agenda.open,
    agendaMaxDate: agenda.ceiling,
    agendaSaturday: agenda.saturday,
  };
}

// Configurações de agendamento (público — o site precisa saber se a agenda está aberta e o WhatsApp)
exports.getSettings = async (req, res) => {
  try {
    res.json(await buildSettingsPayload());
  } catch (e) {
    console.error('[getSettings]', e);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
};

exports.updateSettings = async (req, res) => {
  const { bookingWindowDays, whatsapp, agendaOpen, agendaOpenUntil } = req.body;
  try {
    if (bookingWindowDays !== undefined) {
      const n = parseInt(bookingWindowDays, 10);
      if (!Number.isFinite(n) || n < 1 || n > 365) {
        return res.status(400).json({ error: 'Janela inválida (use de 1 a 365 dias)' });
      }
      await setKey('bookingWindowDays', String(n));
    }
    if (whatsapp !== undefined) {
      // Guarda só dígitos; garante DDI 55 quando o número tem DDD + 8/9 dígitos
      let digits = String(whatsapp).replace(/\D/g, '');
      if (digits && !digits.startsWith('55') && digits.length >= 10 && digits.length <= 11) {
        digits = '55' + digits;
      }
      await setKey('whatsapp', digits);
    }
    if (agendaOpen !== undefined) {
      await setKey('agendaOpen', agendaOpen ? 'true' : 'false');
    }
    if (agendaOpenUntil !== undefined) {
      // Vazio/null limpa a data. Senão exige formato YYYY-MM-DD (o teto do sábado é aplicado no cálculo).
      if (!agendaOpenUntil) {
        await setKey('agendaOpenUntil', '');
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(agendaOpenUntil)) {
        await setKey('agendaOpenUntil', agendaOpenUntil);
      } else {
        return res.status(400).json({ error: 'Data limite inválida' });
      }
    }
    audit(req, 'settings.update', { bookingWindowDays, whatsappUpdated: whatsapp !== undefined, agendaOpen, agendaOpenUntil });
    res.json(await buildSettingsPayload());
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
