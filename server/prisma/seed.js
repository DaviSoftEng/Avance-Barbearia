const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// Catálogo real da Barbearia Avance (as imagens ficam em client/public/cortes)
const SERVICES = [
  { name: 'Infantil',                          price: 0,   duration: 40, description: 'A partir de 5 anos',                         image: '/cortes/infantil.jpeg' },
  { name: 'Sobrancelha',                       price: 5,   duration: 15, description: 'Design e alinhamento de sobrancelha',         image: '/cortes/sobrancelha.jpeg' },
  { name: 'Pigmentação',                       price: 10,  duration: 20, description: 'Pigmentação para preencher e realçar',        image: '/cortes/pigmentacao.jpeg' },
  { name: 'Acabamento + Pigmentação',          price: 15,  duration: 20, description: 'Acabamento com pigmentação',                  image: '/cortes/acabamento-pigmentacao.jpeg' },
  { name: 'Barba',                             price: 20,  duration: 20, description: 'Barba feita e modelada na navalha',           image: '/cortes/barba.jpeg' },
  { name: 'Corte',                             price: 35,  duration: 40, description: 'Corte na máquina e tesoura com acabamento',   image: '/cortes/corte.jpeg' },
  { name: 'Corte + Cavanhaque e Pigmentação',  price: 40,  duration: 50, description: 'Corte com cavanhaque e pigmentação',          image: '/cortes/corte-cavanhaque-pigmentacao.jpeg' },
  { name: 'Corte + Pigmentação',               price: 45,  duration: 50, description: 'Corte com pigmentação',                       image: '/cortes/corte-pigmentacao.jpeg' },
  { name: 'Corte + Barba',                     price: 50,  duration: 60, description: 'Corte completo com barba modelada',           image: '/cortes/corte-barba.jpeg' },
  { name: 'Corte + Barba e Sobrancelha',       price: 55,  duration: 70, description: 'Pacote completo: corte, barba e sobrancelha', image: '/cortes/corte-barba-sobrancelha.jpeg' },
  { name: 'Corte + Nevou',                     price: 90,  duration: 90, description: 'Corte com descoloração (nevou)',             image: '/cortes/corte-nevou.jpeg' },
  { name: 'Corte + Reflexo',                   price: 90,  duration: 90, description: 'Corte com reflexo',                          image: '/cortes/corte-reflexo.jpeg' },
  { name: 'Corte + Vermelhou',                 price: 100, duration: 90, description: 'Corte com coloração vermelha',               image: '/cortes/corte-vermelhou.jpeg' },
];

// Horário de funcionamento real (0=Dom ... 6=Sáb). Dom e Seg fechados.
const HOURS = [
  { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '19:00' }, // Dom
  { dayOfWeek: 1, isOpen: false, openTime: '09:00', closeTime: '19:00' }, // Seg
  { dayOfWeek: 2, isOpen: true,  openTime: '09:00', closeTime: '19:00' }, // Ter
  { dayOfWeek: 3, isOpen: true,  openTime: '09:00', closeTime: '19:00' }, // Qua
  { dayOfWeek: 4, isOpen: true,  openTime: '09:00', closeTime: '19:00' }, // Qui
  { dayOfWeek: 5, isOpen: true,  openTime: '09:00', closeTime: '22:00' }, // Sex
  { dayOfWeek: 6, isOpen: true,  openTime: '09:00', closeTime: '17:00' }, // Sáb
];

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('FATAL: defina ADMIN_EMAIL e ADMIN_PASSWORD no .env / variáveis de ambiente antes do seed.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('FATAL: ADMIN_PASSWORD deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  // Admin (upsert — não apaga nada)
  await prisma.user.upsert({
    where: { email },
    update: { name, password: await bcrypt.hash(password, 10) },
    create: { name, email, password: await bcrypt.hash(password, 10) },
  });

  // Serviços e horários: só cria se ainda não houver (idempotente, não sobrescreve)
  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({ data: SERVICES });
  }
  if ((await prisma.businessHours.count()) === 0) {
    await prisma.businessHours.createMany({ data: HOURS });
  }

  console.log('✅ Seed concluído!');
  console.log(`👤 Admin: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
