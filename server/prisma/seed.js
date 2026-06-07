const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('FATAL: defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('FATAL: ADMIN_PASSWORD deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  // Upsert: não apaga usuários existentes
  await prisma.user.upsert({
    where: { email },
    update: { name, password: await bcrypt.hash(password, 10) },
    create: { name, email, password: await bcrypt.hash(password, 10) },
  });

  // Serviços, horários fixos e horário de funcionamento: só cria se ainda não houver,
  // para não sobrescrever customizações em uma execução repetida.
  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({
      data: [
        { name: 'Corte Simples', price: 35, duration: 30, description: 'Corte clássico com máquina e tesoura' },
        { name: 'Corte + Barba', price: 55, duration: 45, description: 'Corte completo com acabamento na barba' },
        { name: 'Barba', price: 25, duration: 20, description: 'Aparar e modelar a barba com navalha' },
        { name: 'Hidratação Capilar', price: 45, duration: 40, description: 'Tratamento hidratante para os cabelos' },
        { name: 'Sobrancelha', price: 15, duration: 15, description: 'Design e alinhamento de sobrancelha' },
      ],
    });
  }

  if ((await prisma.recurringBlock.count()) === 0) {
    await prisma.recurringBlock.createMany({
      data: [
        { clientName: 'João Silva', dayOfWeek: 1, time: '10:00', notes: 'Cliente fixo - toda segunda' },
        { clientName: 'Pedro Alves', dayOfWeek: 3, time: '14:00', notes: 'Cliente fixo - toda quarta' },
        { clientName: 'Marcos Souza', dayOfWeek: 5, time: '09:00', notes: 'Cliente fixo - toda sexta' },
      ],
    });
  }

  if ((await prisma.businessHours.count()) === 0) {
    await prisma.businessHours.createMany({
      data: [
        { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '19:00' }, // Dom
        { dayOfWeek: 1, isOpen: true,  openTime: '09:00', closeTime: '19:00' }, // Seg
        { dayOfWeek: 2, isOpen: true,  openTime: '09:00', closeTime: '19:00' }, // Ter
        { dayOfWeek: 3, isOpen: true,  openTime: '09:00', closeTime: '19:00' }, // Qua
        { dayOfWeek: 4, isOpen: true,  openTime: '09:00', closeTime: '19:00' }, // Qui
        { dayOfWeek: 5, isOpen: true,  openTime: '09:00', closeTime: '19:00' }, // Sex
        { dayOfWeek: 6, isOpen: true,  openTime: '09:00', closeTime: '17:00' }, // Sab
      ],
    });
  }

  console.log('✅ Seed concluído!');
  console.log(`👤 Admin configurado: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
