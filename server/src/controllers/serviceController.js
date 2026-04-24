const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.getServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });
    res.json(services);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
};
