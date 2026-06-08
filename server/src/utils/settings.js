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

// Soma dias a uma data "YYYY-MM-DD" e devolve "YYYY-MM-DD" (math em UTC, estável quanto a DST)
function addDaysStr(ymd, days) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = { getBookingWindowDays, addDaysStr, DEFAULT_BOOKING_WINDOW_DAYS };
