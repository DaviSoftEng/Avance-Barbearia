const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Falha cedo e claro se variáveis essenciais não estiverem configuradas
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não definido. Configure-o no .env / variáveis de ambiente.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL não definido. Configure-o no .env / variáveis de ambiente.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');
const slotRoutes = require('./routes/slots');
const businessRoutes = require('./routes/business');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/business', businessRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✂️  Servidor rodando na porta ${PORT}`));
