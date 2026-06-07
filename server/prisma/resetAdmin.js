// Cria/atualiza o usuário admin a partir de ADMIN_EMAIL / ADMIN_PASSWORD do .env.
// Não toca em nenhum outro dado. Use para rotacionar a senha do admin.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('FATAL: defina ADMIN_EMAIL e ADMIN_PASSWORD no .env.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('FATAL: ADMIN_PASSWORD deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, password: hash },
    create: { name, email, password: hash },
  });

  console.log(`✅ Admin atualizado: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
