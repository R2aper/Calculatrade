import express from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  const measures = await prisma.measure.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(measures);
});

router.post('/', async (req, res) => {
  const measure = await prisma.measure.create({
    data: {
      userId: req.user.userId,
      name: String(req.body?.name || '').trim(),
      cost: Number(req.body?.cost ?? 0),
      reduceDamage: Number(req.body?.reduceDamage ?? 0),
      reduceProb: Number(req.body?.reduceProb ?? 0),
      linkedRiskId: req.body?.linkedRiskId || null,
    },
  });

  return res.status(201).json(measure);
});

router.put('/:id', async (req, res) => {
  const existingMeasure = await prisma.measure.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!existingMeasure) {
    return res.status(404).json({ error: 'Not Found', message: 'Мера не найдена.' });
  }

  const measure = await prisma.measure.update({
    where: { id: req.params.id },
    data: {
      name: String(req.body?.name ?? existingMeasure.name).trim(),
      cost: Number(req.body?.cost ?? existingMeasure.cost),
      reduceDamage: Number(req.body?.reduceDamage ?? existingMeasure.reduceDamage),
      reduceProb: Number(req.body?.reduceProb ?? existingMeasure.reduceProb),
      linkedRiskId: req.body?.linkedRiskId === undefined ? existingMeasure.linkedRiskId : req.body.linkedRiskId || null,
    },
  });

  return res.json(measure);
});

router.delete('/:id', async (req, res) => {
  const measure = await prisma.measure.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!measure) {
    return res.status(404).json({ error: 'Not Found', message: 'Мера не найдена.' });
  }

  await prisma.risk.updateMany({
    where: { userId: req.user.userId, measureId: req.params.id },
    data: { measureId: null },
  });

  await prisma.measure.delete({
    where: { id: req.params.id },
  });

  return res.json({ success: true, message: 'Мера удалена.' });
});

router.post('/:id/link-risk', async (req, res) => {
  const measure = await prisma.measure.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!measure) {
    return res.status(404).json({ error: 'Not Found', message: 'Мера не найдена.' });
  }

  const riskId = String(req.body?.riskId || '');
  const risk = await prisma.risk.findFirst({
    where: { id: riskId, userId: req.user.userId },
  });

  if (!risk) {
    return res.status(404).json({ error: 'Not Found', message: 'Риск не найден.' });
  }

  await prisma.risk.updateMany({
    where: { userId: req.user.userId, measureId: req.params.id },
    data: { measureId: null },
  });

  const updatedMeasure = await prisma.measure.update({
    where: { id: req.params.id },
    data: {
      linkedRiskId: risk.id,
    },
  });

  await prisma.risk.update({
    where: { id: risk.id },
    data: {
      measureId: measure.id,
    },
  });

  return res.json(updatedMeasure);
});

router.delete('/:id/link-risk', async (req, res) => {
  const measure = await prisma.measure.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!measure) {
    return res.status(404).json({ error: 'Not Found', message: 'Мера не найдена.' });
  }

  await prisma.risk.updateMany({
    where: { userId: req.user.userId, measureId: req.params.id },
    data: { measureId: null },
  });

  const updatedMeasure = await prisma.measure.update({
    where: { id: req.params.id },
    data: {
      linkedRiskId: null,
    },
  });

  return res.json(updatedMeasure);
});

export default router;
