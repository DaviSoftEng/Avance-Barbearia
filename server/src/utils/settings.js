const prisma = require('../db');

const DEFAULT_BOOKING_WINDOW_DAYS = 7;

// Quantos dias à frente o cliente pode agendar (a partir de hoje). Padrão: 7.
async function getBookingWindowDays() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: 'bookingWindowDays' } });
    const n = s ? parseInt(s.value, 10) : DEFAULT_BOOKING_WINDOW_DAYS;
    return Number.isFinite(n) && n >= 1 && n <= 365 ? n : DEFAULT_BOOKING_WINDOW_DAYS;
  } catch {
    return DEFAULT_BOOKING_WINDOW_DAYS;
  }
}

// WhatsApp da barbearia (só dígitos, com DDI 55). Vazio se não configurado.
async function getWhatsapp() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: 'whatsapp' } });
    return s ? s.value : '';
  } catch {
    return '';
  }
}

// Soma dias a uma data "YYYY-MM-DD" e devolve "YYYY-MM-DD" (math em UTC, estável quanto a DST)
function addDaysStr(ymd, days) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const TZ = 'America/Sao_Paulo';

// "Hoje" no fuso do Brasil (YYYY-MM-DD), independente do fuso do servidor.
// Em ambiente de desenvolvimento, permite simular a data via FAKE_TODAY (ex.: testar a semana
// inteira num sábado). NUNCA tem efeito em produção.
function brToday() {
  if (process.env.NODE_ENV !== 'production' && /^\d{4}-\d{2}-\d{2}$/.test(process.env.FAKE_TODAY || '')) {
    return process.env.FAKE_TODAY;
  }
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// Próximo sábado a partir de "ymd" (se "ymd" já é sábado, devolve o próprio). 6 = sábado.
function saturdayOnOrAfter(ymd) {
  const d = new Date(ymd + 'T12:00:00Z');
  const add = (6 - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

// Liga/desliga mestre da agenda. Padrão: aberta (não quebra comportamento existente).
async function getAgendaOpenFlag() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: 'agendaOpen' } });
    return s ? s.value === 'true' : true;
  } catch {
    return true;
  }
}

// Data limite escolhida pelo Ryann (YYYY-MM-DD) ou null se não definida.
async function getAgendaOpenUntil() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: 'agendaOpenUntil' } });
    return s && /^\d{4}-\d{2}-\d{2}$/.test(s.value) ? s.value : null;
  } catch {
    return null;
  }
}

// Estado efetivo da agenda para um "hoje" (YYYY-MM-DD).
// Regra: aberta = flag ligada E hoje <= teto. Teto = min(data escolhida, sábado da semana) —
// o cliente NUNCA marca além do sábado da semana atual. Fecha sozinha no fim do sábado
// (hoje > teto vira verdadeiro no dia seguinte), sem precisar de cron.
async function getAgendaState(today = brToday()) {
  const saturday = saturdayOnOrAfter(today);
  const flag = await getAgendaOpenFlag();
  const until = await getAgendaOpenUntil();
  const ceiling = until && until < saturday ? until : saturday;
  const open = flag && today <= ceiling;
  return { open, flag, openUntil: until, ceiling, saturday, today };
}

module.exports = {
  getBookingWindowDays, getWhatsapp, addDaysStr, DEFAULT_BOOKING_WINDOW_DAYS,
  brToday, saturdayOnOrAfter, getAgendaOpenFlag, getAgendaOpenUntil, getAgendaState,
};
