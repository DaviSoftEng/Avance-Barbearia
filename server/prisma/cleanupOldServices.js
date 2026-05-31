// Remove serviços antigos (inativos) e os agendamentos de teste ligados a eles.
const prisma = require('../src/db');

async function main() {
  const inactive = await prisma.service.findMany({ where: { active: false }, select: { id: true } });
  const inactiveIds = inactive.map((s) => s.id);

  if (inactiveIds.length === 0) {
    console.log('Nenhum serviço inativo para remover.');
    return;
  }

  // Agendamentos que usam algum serviço inativo
  const links = await prisma.appointmentService.findMany({
    where: { serviceId: { in: inactiveIds } },
    select: { appointmentId: true },
  });
  const apptIds = [...new Set(links.map((l) => l.appointmentId))];

  // Apaga os agendamentos (cascateia os vínculos AppointmentService)
  if (apptIds.length) {
    await prisma.appointment.deleteMany({ where: { id: { in: apptIds } } });
  }

  // Agora os serviços inativos não têm mais referências — pode apagar
  const del = await prisma.service.deleteMany({ where: { id: { in: inactiveIds } } });

  console.log(`🗑️  ${apptIds.length} agendamento(s) de teste removido(s).`);
  console.log(`🗑️  ${del.count} serviço(s) antigo(s) removido(s).`);
  const total = await prisma.service.count();
  console.log(`✅ Restam ${total} serviços (todos ativos, com foto).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
