// Calcula os horários ocupados por clientes fixos numa DATA específica, já considerando
// as exceções da semana (adiantamento/remarcação ou cancelamento). Cada fixo dura 30 min.
//
// Regra:
//  - fixo do dia da semana ocupa o horário, EXCETO se houver exceção (move/cancel) com
//    originalDate == data → nesse caso o horário VAGA naquela semana;
//  - exceção do tipo "move" cujo newDate == data adiciona o fixo no novo horário.
//
// `db` pode ser o prisma client ou um tx de transação (mesma API).

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function recurringOccupied(db, date) {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const blocks = await db.recurringBlock.findMany({ where: { dayOfWeek } });
  const exceptions = await db.recurringException.findMany({
    where: { OR: [{ originalDate: date }, { newDate: date }] },
  });

  const vacated = new Set(
    exceptions.filter((e) => e.originalDate === date).map((e) => e.recurringBlockId)
  );

  const occupied = [];
  for (const b of blocks) {
    if (vacated.has(b.id)) continue; // adiantado/cancelado nesta semana → vaga
    const s = timeToMinutes(b.time);
    occupied.push({ start: s, end: s + 30 });
  }
  for (const e of exceptions) {
    if (e.type === 'move' && e.newDate === date && e.newTime) {
      const s = timeToMinutes(e.newTime);
      occupied.push({ start: s, end: s + 30 });
    }
  }
  return occupied;
}

module.exports = { recurringOccupied };
