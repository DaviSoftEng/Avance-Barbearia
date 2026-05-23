const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();
  await prisma.user.create({
    data: {
      name: 'Ryann França',
      email: 'ryann',
      password: await bcrypt.hash('franca', 10),
    },
  });

  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
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

  await prisma.recurringBlock.deleteMany();
  await prisma.recurringBlock.createMany({
    data: [
      { clientName: 'João Silva', dayOfWeek: 1, time: '10:00', notes: 'Cliente fixo - toda segunda' },
      { clientName: 'Pedro Alves', dayOfWeek: 3, time: '14:00', notes: 'Cliente fixo - toda quarta' },
      { clientName: 'Marcos Souza', dayOfWeek: 5, time: '09:00', notes: 'Cliente fixo - toda sexta' },
    ],
  });

  // Horários de funcionamento padrão (seg-sab, dom fechado)
  await prisma.businessHours.deleteMany();
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

  console.log('✅ Seed concluído!');
  console.log('👤 Usuário: ryann');
  console.log('🔑 Senha: franca');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
