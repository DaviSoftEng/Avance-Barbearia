// Log de auditoria de operações administrativas.
// Registra quem fez, o que fez e quando. Saída estruturada (uma linha por evento),
// fácil de redirecionar para arquivo/coletor depois.
function audit(req, action, details = {}) {
  const actor = req?.user ? { id: req.user.id, email: req.user.email } : { id: null, email: 'anon' };
  const entry = {
    ts: new Date().toISOString(),
    action,
    actor,
    ip: req?.ip,
    ...details,
  };
  console.log('[AUDIT]', JSON.stringify(entry));
}

module.exports = { audit };
