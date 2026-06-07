// Garante que o parâmetro :id da rota é um inteiro positivo.
// Responde 400 em vez de deixar um NaN chegar ao Prisma e virar 500.
module.exports = (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Identificador inválido' });
  }
  next();
};
