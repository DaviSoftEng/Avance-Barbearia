const rateLimit = require('express-rate-limit');

const json = (msg) => (req, res) => res.status(429).json({ error: msg });

// Limite global generoso — barra abuso sem atrapalhar uso normal do painel
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json('Muitas requisições. Tente novamente em alguns minutos.'),
});

// Login: estrito, contra força bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'),
});

// Rotas públicas de escrita/consulta (agendar, consultar, cancelar) — contra spam/enumeração
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json('Muitas requisições. Tente novamente em alguns minutos.'),
});

module.exports = { generalLimiter, loginLimiter, publicLimiter };
