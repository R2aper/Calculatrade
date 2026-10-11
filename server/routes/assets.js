import express from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  const assets = await prisma.asset.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(assets);
});

router.post('/', async (req, res) => {
  const asset = await prisma.asset.create({
    data: {
      userId: req.user.userId,
      name: String(req.body?.name || '').trim(),
      value: Number(req.body?.value ?? 0),
      priority: Number(req.body?.priority ?? 1),
    },
  });

  return res.status(201).json(asset);
});

router.put('/:id', async (req, res) => {
  const existingAsset = await prisma.asset.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!existingAsset) {
    return res.status(404).json({ error: 'Not Found', message: 'Актив не найден.' });
  }

  const asset = await prisma.asset.update({
    where: { id: req.params.id },
    data: {
      name: String(req.body?.name ?? existingAsset.name).trim(),
      value: Number(req.body?.value ?? existingAsset.value),
      priority: Number(req.body?.priority ?? existingAsset.priority),
    },
  });

  return res.json(asset);
});

router.delete('/:id', async (req, res) => {
  const asset = await prisma.asset.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });

  if (!asset) {
    return res.status(404).json({ error: 'Not Found', message: 'Актив не найден.' });
  }

  const linkedRisks = await prisma.risk.findMany({
    where: { userId: req.user.userId, assetId: req.params.id },
    select: { id: true },
  });

  const riskIds = linkedRisks.map((r) => r.id);
  if (riskIds.length > 0) {
    await prisma.measure.updateMany({
      where: { userId: req.user.userId, linkedRiskId: { in: riskIds } },
      data: { linkedRiskId: null },
    });

    await prisma.risk.deleteMany({
      where: { id: { in: riskIds } },
    });
  }

  await prisma.asset.delete({
    where: { id: req.params.id },
  });

  return res.json({ success: true, message: 'Актив удалён.' });
});

export default router;
