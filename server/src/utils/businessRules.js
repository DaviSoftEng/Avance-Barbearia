// Regras fixas de funcionamento da barbearia.

// Horário de almoço: 12h às 13h, de segunda (1) a sexta (5). Sábado (6) e domingo (0) não têm.
const LUNCH = { startMin: 12 * 60, endMin: 13 * 60, days: [1, 2, 3, 4, 5] };

// Retorna o intervalo de almoço (em minutos do dia) para o dia da semana, ou null se não houver.
function lunchBreak(dayOfWeek) {
  return LUNCH.days.includes(dayOfWeek) ? { start: LUNCH.startMin, end: LUNCH.endMin } : null;
}

module.exports = { lunchBreak };
