import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import { authenticate } from './middleware/auth.js';
import { prisma } from './db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'calculatrade-server',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Calculatrade API',
    version: '0.1.0',
    status: 'bootstrapped',
  });
});

app.use('/api/auth', authRouter);

app.get('/api/profile', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      login: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Пользователь не найден.',
    });
  }

  return res.json({ user });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} is unavailable.`,
  });
});

app.use((err, req, res, next) => {
  console.error('[server:error]', err);

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'Unexpected server error',
  });
});

app.listen(PORT, () => {
  console.log(`Calculatrade server is running on http://localhost:${PORT}`);
});
