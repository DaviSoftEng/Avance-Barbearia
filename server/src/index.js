const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');
const slotRoutes = require('./routes/slots');
const businessRoutes = require('./routes/business');

const app = express();

// Confia no primeiro proxy/CDN para que o rate limit use o IP real (X-Forwarded-For)
app.set('trust proxy', 1);

// Cabeçalhos de segurança HTTP. CORP cross-origin pois o SPA roda em outra origem.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// Limite global de requisições (defesa em profundidade)
app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/business', businessRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`✂️  Servidor rodando em ${HOST}:${PORT}`));
