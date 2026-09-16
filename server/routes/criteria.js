import express from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  const criteria = await prisma.criteria.findUnique({
    where: { userId: req.user.userId },
  });

  return res.json(criteria || null);
});

router.put('/', async (req, res) => {
  const payload = {
    formula: String(req.body?.formula ?? 'damage * probability * priority'),
    damageMax: Number(req.body?.damageMax ?? 4),
    probMax: Number(req.body?.probMax ?? 4),
    priorityMax: Number(req.body?.priorityMax ?? 4),
    riskAppetite: Number(req.body?.riskAppetite ?? 12),
    costPerPoint: Number(req.body?.costPerPoint ?? 50000),
  };

  const criteria = await prisma.criteria.upsert({
    where: { userId: req.user.userId },
    update: payload,
    create: {
      userId: req.user.userId,
      ...payload,
    },
  });

  return res.json(criteria);
});

export default router;
