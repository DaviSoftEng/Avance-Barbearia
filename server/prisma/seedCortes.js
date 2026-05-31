// Cadastra o catálogo real de serviços (com fotos) e desativa os antigos.
// Re-executável: remove serviços /cortes/ sem agendamento antes de recriar.
const prisma = require('../src/db');

const SERVICES = [
  { name: 'Infantil',                          price: 0,   duration: 40, description: 'A partir de 5 anos',                       image: '/cortes/infantil.jpeg' },
  { name: 'Sobrancelha',                       price: 5,   duration: 15, description: 'Design e alinhamento de sobrancelha',      image: '/cortes/sobrancelha.jpeg' },
  { name: 'Pigmentação',                       price: 10,  duration: 20, description: 'Pigmentação para preencher e realçar',     image: '/cortes/pigmentacao.jpeg' },
  { name: 'Acabamento + Pigmentação',          price: 15,  duration: 20, description: 'Acabamento com pigmentação',               image: '/cortes/acabamento-pigmentacao.jpeg' },
  { name: 'Barba',                             price: 20,  duration: 20, description: 'Barba feita e modelada na navalha',        image: '/cortes/barba.jpeg' },
  { name: 'Corte',                             price: 35,  duration: 40, description: 'Corte na máquina e tesoura com acabamento', image: '/cortes/corte.jpeg' },
  { name: 'Corte + Cavanhaque e Pigmentação',  price: 40,  duration: 50, description: 'Corte com cavanhaque e pigmentação',       image: '/cortes/corte-cavanhaque-pigmentacao.jpeg' },
  { name: 'Corte + Pigmentação',               price: 45,  duration: 50, description: 'Corte com pigmentação',                    image: '/cortes/corte-pigmentacao.jpeg' },
  { name: 'Corte + Barba',                     price: 50,  duration: 60, description: 'Corte completo com barba modelada',        image: '/cortes/corte-barba.jpeg' },
  { name: 'Corte + Barba e Sobrancelha',       price: 55,  duration: 70, description: 'Pacote completo: corte, barba e sobrancelha', image: '/cortes/corte-barba-sobrancelha.jpeg' },
  { name: 'Corte + Nevou',                     price: 90,  duration: 90, description: 'Corte com descoloração (nevou)',          image: '/cortes/corte-nevou.jpeg' },
  { name: 'Corte + Reflexo',                   price: 90,  duration: 90, description: 'Corte com reflexo',                        image: '/cortes/corte-reflexo.jpeg' },
  { name: 'Corte + Vermelhou',                 price: 100, duration: 90, description: 'Corte com coloração vermelha',             image: '/cortes/corte-vermelhou.jpeg' },
];

async function main() {
  // Remove serviços /cortes/ já criados que não têm agendamento (re-execução limpa)
  const prev = await prisma.service.findMany({
    where: { image: { startsWith: '/cortes/' } },
    include: { _count: { select: { appointments: true } } },
  });
  const removable = prev.filter((s) => s._count.appointments === 0).map((s) => s.id);
  if (removable.length) {
    await prisma.service.deleteMany({ where: { id: { in: removable } } });
  }

  // Desativa todos os serviços restantes (antigos do seed)
  await prisma.service.updateMany({ data: { active: false } });

  // Cria o catálogo real
  for (const s of SERVICES) {
    await prisma.service.create({ data: { ...s, active: true } });
  }

  const total = await prisma.service.count({ where: { active: true } });
  console.log(`✅ ${total} serviços ativos cadastrados com fotos.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
