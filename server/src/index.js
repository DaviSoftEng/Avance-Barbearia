const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Falha cedo e claro se variáveis essenciais não estiverem configuradas
const PLACEHOLDER_SECRET = 'substitua-por-uma-chave-forte-de-pelo-menos-32-caracteres';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === PLACEHOLDER_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET ausente, igual ao placeholder ou com menos de 32 caracteres.');
  console.error('Gere uma chave: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL não definido. Configure-o no .env / variáveis de ambiente.');
  process.exit(1);
}

const { generalLimiter } = require('./middleware/rateLimit');
const { uploadsDir } = require('./middleware/upload');
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');
const slotRoutes = require('./routes/slots');
const businessRoutes = require('./routes/business');

const app = express();

// Confia no primeiro proxy/CDN para que o rate limit use o IP real (X-Forwarded-For)
app.set('trust proxy', 1);

// Cabeçalhos de segurança HTTP. CSP liberando o necessário (imagens https, mapa do Google,
// estilos inline do React) sem abrir mão do principal (script-src 'self').
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      styleSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'", 'https:'],
      frameSrc: ["'self'", 'https://*.google.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null, // não força HTTPS (o Railway já serve por HTTPS; evita quebrar preview HTTP)
    },
  },
}));

// Origens permitidas (CLIENT_URL aceita várias separadas por vírgula).
// O domínio público do Railway é adicionado automaticamente.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}
// CORS só nas rotas de API (cross-origin em dev). Os arquivos do site são mesma-origem
// e não passam por aqui — evita o CORS barrar os próprios assets do build.
const corsMiddleware = cors({
  origin(origin, cb) {
    // Permite sem origin (curl/app nativo) ou origem conhecida. Caso contrário, não
    // autoriza (sem erro 500): o navegador bloqueia se for cross-origin; mesma-origem passa.
    cb(null, !origin || allowedOrigins.includes(origin));
  },
});
app.use('/api', corsMiddleware);
app.use(express.json({ limit: '100kb' }));

// Fotos enviadas pelo painel (servidas estaticamente)
app.use('/uploads', express.static(uploadsDir));

// Limite global de requisições (defesa em profundidade)
app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/business', businessRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 404 em JSON para rotas de API não encontradas
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Em produção, o próprio Express serve o site (build do React). Em dev o Vite cuida disso.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: qualquer rota que não seja /api ou /uploads devolve o index.html
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`✂️  Servidor rodando em ${HOST}:${PORT}`));
