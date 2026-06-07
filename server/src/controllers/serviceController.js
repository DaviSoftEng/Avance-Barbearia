const prisma = require('../db');
const { audit } = require('../utils/audit');

exports.getServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ where: { active: true }, orderBy: [{ price: 'asc' }, { id: 'asc' }] });
    res.json(services);
  } catch (e) {
    console.error('[getServices]', e);
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: [{ price: 'asc' }, { id: 'asc' }] });
    res.json(services);
  } catch (e) {
    console.error('[getAllServices]', e);
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
};

exports.createService = async (req, res) => {
  const { name, price, duration, description, image } = req.body;
  if (!name || price == null || !duration || !description) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  try {
    const service = await prisma.service.create({
      data: { name, price: parseFloat(price), duration: parseInt(duration), description, image: image || '' },
    });
    audit(req, 'service.create', { id: service.id, name: service.name });
    res.status(201).json(service);
  } catch (e) {
    console.error('[createService]', e);
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
};

exports.updateService = async (req, res) => {
  const { name, price, duration, description, active, image } = req.body;
  try {
    const data = {};
    if (name != null) data.name = name;
    if (price != null) data.price = parseFloat(price);
    if (duration != null) data.duration = parseInt(duration);
    if (description != null) data.description = description;
    if (active != null) data.active = active;
    if (image != null) data.image = image;

    const service = await prisma.service.update({ where: { id: parseInt(req.params.id) }, data });
    audit(req, 'service.update', { id: service.id });
    res.json(service);
  } catch (e) {
    console.error('[updateService]', e);
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
};

exports.deleteService = async (req, res) => {
  try {
    await prisma.service.update({ where: { id: parseInt(req.params.id) }, data: { active: false } });
    audit(req, 'service.deactivate', { id: parseInt(req.params.id) });
    res.status(204).send();
  } catch (e) {
    console.error('[deleteService]', e);
    res.status(500).json({ error: 'Erro ao desativar serviço' });
  }
};
