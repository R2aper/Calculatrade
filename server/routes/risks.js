import express from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  const risks = await prisma.risk.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(risks);
});

router.post('/', async (req, res) => {
  const assetId = String(req.body?.assetId || '');
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, userId: req.user.userId },
  });

  if (!asset) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Указанный актив не существует или не принадлежит текущему пользователю.',
    });
  }

  const risk = await prisma.risk.create({
    data: {
      userId: req.user.userId,
      assetId,
      threat: String(req.body?.threat || '').trim(),
      vulnerability: String(req.body?.vulnerability || '').trim(),
      damage: Number(req.body?.damage ?? 0),
      probability: Number(req.body?.probability ?? 0),
      priority: Number(req.body?.priority ?? 0),
      score: Number(req.body?.score ?? 0),
      residualScore: req.body?.residualScore === undefined ? null : Number(req.body.residualScore),
      measureId: req.body?.measureId || null,
      reduceDamage: req.body?.reduceDamage === undefined ? null : Number(req.body.reduceDamage),
      reduceProb: req.body?.reduceProb === undefined ? null : Number(req.body.reduceProb),
    },
  });

  return res.status(201).json(risk);
});

router.put('/:id', async (req, res) => {
  const existingRisk = await prisma.risk.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!existingRisk) {
    return res.status(404).json({ error: 'Not Found', message: 'Риск не найден.' });
  }

  const risk = await prisma.risk.update({
    where: { id: req.params.id },
    data: {
      threat: String(req.body?.threat ?? existingRisk.threat).trim(),
      vulnerability: String(req.body?.vulnerability ?? existingRisk.vulnerability).trim(),
      damage: Number(req.body?.damage ?? existingRisk.damage),
      probability: Number(req.body?.probability ?? existingRisk.probability),
      priority: Number(req.body?.priority ?? existingRisk.priority),
      score: Number(req.body?.score ?? existingRisk.score),
      residualScore: req.body?.residualScore === undefined ? existingRisk.residualScore : Number(req.body.residualScore),
      measureId: req.body?.measureId === undefined ? existingRisk.measureId : req.body.measureId || null,
      reduceDamage: req.body?.reduceDamage === undefined ? existingRisk.reduceDamage : Number(req.body.reduceDamage),
      reduceProb: req.body?.reduceProb === undefined ? existingRisk.reduceProb : Number(req.body.reduceProb),
    },
  });

  return res.json(risk);
});

router.delete('/:id', async (req, res) => {
  const risk = await prisma.risk.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!risk) {
    return res.status(404).json({ error: 'Not Found', message: 'Риск не найден.' });
  }

  await prisma.risk.delete({
    where: { id: req.params.id },
  });

  return res.json({ success: true, message: 'Риск удалён.' });
});

export default router;
