// Bateria de testes de integração da API. Limpa o que cria no final.
const BASE = 'http://localhost:3001/api';
let pass = 0, fail = 0;
const created = { appts: [], services: [], blocks: [] };

function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
}
async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

// Próxima data cujo dia-da-semana satisfaz o predicado (fuso BR)
function nextDateWhere(predicate) {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const d = new Date(todayStr + 'T00:00:00Z');
  for (let i = 0; i < 14; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (predicate(d.getUTCDay())) return d.toISOString().slice(0, 10);
  }
  return null;
}

async function main() {
  console.log('\n── AUTH ─────────────────────────');
  const badLogin = await req('POST', '/auth/login', { email: 'ryann', password: 'errada' });
  ok('Login senha errada → 401', badLogin.status === 401, `(got ${badLogin.status})`);
  const login = await req('POST', '/auth/login', { email: 'ryann', password: 'franca' });
  ok('Login correto → token', login.status === 200 && !!login.data?.token, `(got ${login.status})`);
  const token = login.data?.token;

  console.log('\n── PÚBLICO ──────────────────────');
  const services = await req('GET', '/services');
  ok('GET /services → lista', services.status === 200 && Array.isArray(services.data) && services.data.length > 0, `(${services.data?.length})`);
  const svc = services.data[0]; // mais barato (menor duração → mais slots p/ testar)
  const svcDur = svc.duration;

  // Descobre dias abertos/fechados a partir da config real
  const bhData = await req('GET', '/business/hours');
  const openDows = new Set(bhData.data.filter((h) => h.isOpen).map((h) => h.dayOfWeek));
  const closedDows = new Set(bhData.data.filter((h) => !h.isOpen).map((h) => h.dayOfWeek));
  const openDate = nextDateWhere((dow) => openDows.has(dow));
  const closedDate = nextDateWhere((dow) => closedDows.has(dow));
  console.log(`  (dia aberto p/ teste: ${openDate} · dia fechado: ${closedDate})`);

  const slots = await req('GET', `/slots/available?date=${openDate}&duration=${svcDur}`);
  ok('GET /slots dia aberto → horários', slots.status === 200 && Array.isArray(slots.data?.available) && slots.data.available.length > 0, `(${slots.data?.available?.length})`);
  const slot = slots.data?.available?.[0];

  const slotsClosed = await req('GET', `/slots/available?date=${closedDate}&duration=30`);
  ok('GET /slots dia fechado → closed', slotsClosed.data?.closed === true, JSON.stringify(slotsClosed.data));

  console.log('\n── AGENDAMENTO ──────────────────');
  const apptBody = { clientName: 'Teste QA', clientPhone: '21999990000', serviceIds: [svc.id], date: openDate, time: slot };
  const book = await req('POST', '/appointments', apptBody);
  ok('POST agendamento válido → 201', book.status === 201, `(got ${book.status} ${JSON.stringify(book.data)})`);
  if (book.data?.id) created.appts.push(book.data.id);
  ok('Agendamento calcula preço/duração', book.data?.price === svc.price && book.data?.totalDuration === svc.duration);

  const conflict = await req('POST', '/appointments', apptBody);
  ok('POST mesmo horário → 409 conflito', conflict.status === 409, `(got ${conflict.status})`);
  if (conflict.data?.id) created.appts.push(conflict.data.id);

  const badPhone = await req('POST', '/appointments', { ...apptBody, clientPhone: 'abc', time: slots.data.available[2] });
  ok('POST telefone inválido → 400', badPhone.status === 400, `(got ${badPhone.status})`);

  const noSvc = await req('POST', '/appointments', { ...apptBody, serviceIds: [], time: slots.data.available[2] });
  ok('POST sem serviço → 400', noSvc.status === 400, `(got ${noSvc.status})`);

  const closedBook = await req('POST', '/appointments', { ...apptBody, date: closedDate });
  ok('POST em dia fechado → 409', closedBook.status === 409, `(got ${closedBook.status})`);
  if (closedBook.data?.id) created.appts.push(closedBook.data.id);

  // Slot deve sumir após agendamento
  const slotsAfter = await req('GET', `/slots/available?date=${openDate}&duration=${svcDur}`);
  ok('Slot agendado some da lista', !slotsAfter.data.available.includes(slot));

  console.log('\n── LOOKUP / CANCEL PÚBLICO ──────');
  const lookup = await req('GET', `/appointments/lookup?phone=21999990000`);
  ok('Lookup por telefone → encontra', lookup.status === 200 && lookup.data.length >= 1, `(${lookup.data?.length})`);
  const cancelWrong = await req('PATCH', `/appointments/${book.data.id}/cancel-public`, { phone: '21988887777' });
  ok('Cancel com telefone errado → 404', cancelWrong.status === 404, `(got ${cancelWrong.status})`);
  const cancel = await req('PATCH', `/appointments/${book.data.id}/cancel-public`, { phone: '21999990000' });
  ok('Cancel público (telefone certo) → ok', cancel.status === 200 && cancel.data?.status === 'cancelled', `(got ${cancel.status})`);
  const cancelAgain = await req('PATCH', `/appointments/${book.data.id}/cancel-public`, { phone: '21999990000' });
  ok('Cancel de já cancelado → 400', cancelAgain.status === 400, `(got ${cancelAgain.status})`);
  const lookupAfter = await req('GET', `/appointments/lookup?phone=21999990000`);
  ok('Lookup após cancelar → vazio', lookupAfter.data.length === 0, `(${lookupAfter.data?.length})`);
  const slotBack = await req('GET', `/slots/available?date=${openDate}&duration=${svcDur}`);
  ok('Slot volta a ficar livre após cancelar', slotBack.data.available.includes(slot));

  console.log('\n── PROTEÇÃO (sem token) ─────────');
  const noToken = await req('GET', '/appointments');
  ok('GET /appointments sem token → 401', noToken.status === 401, `(got ${noToken.status})`);
  const badToken = await req('GET', '/appointments', null, 'lixo');
  ok('GET /appointments token inválido → 401', badToken.status === 401, `(got ${badToken.status})`);

  console.log('\n── ADMIN (com token) ────────────');
  const stats = await req('GET', '/appointments/stats', null, token);
  ok('GET /stats → estrutura', stats.status === 200 && stats.data?.today && stats.data?.topServices, `(got ${stats.status})`);
  const clients = await req('GET', '/appointments/clients', null, token);
  ok('GET /clients → lista', clients.status === 200 && Array.isArray(clients.data));
  const allAppts = await req('GET', '/appointments', null, token);
  ok('GET /appointments → lista', allAppts.status === 200 && Array.isArray(allAppts.data));

  // Editar um agendamento (recria um confirmado primeiro)
  const book2 = await req('POST', '/appointments', { ...apptBody, time: slots.data.available[3] });
  if (book2.data?.id) created.appts.push(book2.data.id);
  const edit = await req('PUT', `/appointments/${book2.data.id}`, { clientName: 'Teste Editado', clientPhone: '21999990000', serviceIds: [svc.id], date: openDate, time: slots.data.available[4] }, token);
  ok('PUT editar agendamento → ok', edit.status === 200 && edit.data?.clientName === 'Teste Editado', `(got ${edit.status})`);
  const statusUpd = await req('PATCH', `/appointments/${book2.data.id}/status`, { status: 'completed' }, token);
  ok('PATCH status → completed', statusUpd.status === 200 && statusUpd.data?.status === 'completed');
  const badStatus = await req('PATCH', `/appointments/${book2.data.id}/status`, { status: 'xpto' }, token);
  ok('PATCH status inválido → 400', badStatus.status === 400);

  console.log('\n── SERVIÇOS (CRUD) ──────────────');
  const newSvc = await req('POST', '/services', { name: 'QA Serviço', price: 12.5, duration: 25, description: 'teste' }, token);
  ok('POST serviço → 201', newSvc.status === 201, `(got ${newSvc.status})`);
  if (newSvc.data?.id) created.services.push(newSvc.data.id);
  const updSvc = await req('PUT', `/services/${newSvc.data.id}`, { price: 20 }, token);
  ok('PUT serviço → preço atualizado', updSvc.status === 200 && updSvc.data?.price === 20);
  const createNoToken = await req('POST', '/services', { name: 'x', price: 1, duration: 1, description: 'x' });
  ok('POST serviço sem token → 401', createNoToken.status === 401, `(got ${createNoToken.status})`);

  console.log('\n── BUSINESS / BLOCKS ────────────');
  const bh = await req('GET', '/business/hours');
  ok('GET /business/hours → 7 dias', bh.status === 200 && bh.data.length === 7, `(${bh.data?.length})`);
  const block = await req('POST', '/business/blocks', { date: openDate, reason: 'QA' }, token);
  ok('POST bloqueio → 201', block.status === 201, `(got ${block.status})`);
  if (block.data?.id) created.blocks.push(block.data.id);
  const slotsBlocked = await req('GET', `/slots/available?date=${openDate}&duration=30`);
  ok('Dia bloqueado → blocked/closed', slotsBlocked.data?.blocked === true || slotsBlocked.data?.available?.length === 0, JSON.stringify(slotsBlocked.data).slice(0, 80));

  // ── LIMPEZA ──
  console.log('\n── LIMPEZA ──────────────────────');
  for (const id of created.blocks) await req('DELETE', `/business/blocks/${id}`, null, token);
  for (const id of created.services) await req('DELETE', `/services/${id}`, null, token);
  for (const id of created.appts) await req('DELETE', `/appointments/${id}`, null, token);
  console.log(`  🧹 Removidos: ${created.appts.length} agend., ${created.services.length} serv., ${created.blocks.length} bloqueios`);

  console.log(`\n═══ RESULTADO: ${pass} passou, ${fail} falhou ═══\n`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('ERRO FATAL NO TESTE:', e); process.exit(2); });
