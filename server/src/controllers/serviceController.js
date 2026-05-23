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

exports.getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { price: 'asc' } });
    res.json(services);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
};

exports.createService = async (req, res) => {
  const { name, price, duration, description } = req.body;
  if (!name || price == null || !duration || !description) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  try {
    const service = await prisma.service.create({
      data: { name, price: parseFloat(price), duration: parseInt(duration), description },
    });
    res.status(201).json(service);
  } catch {
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
};

exports.updateService = async (req, res) => {
  const { name, price, duration, description, active } = req.body;
  try {
    const data = {};
    if (name != null) data.name = name;
    if (price != null) data.price = parseFloat(price);
    if (duration != null) data.duration = parseInt(duration);
    if (description != null) data.description = description;
    if (active != null) data.active = active;

    const service = await prisma.service.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(service);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
};

exports.deleteService = async (req, res) => {
  try {
    await prisma.service.update({
      where: { id: parseInt(req.params.id) },
      data: { active: false },
    });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao desativar serviço' });
  }
};
