import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { signToken } from '../lib/token.js';

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user.id,
  login: user.login,
  createdAt: user.createdAt,
});

const getTokenFromRequest = (req) => {
  const headerToken = req.headers.authorization;
  if (headerToken && headerToken.startsWith('Bearer ')) {
    return headerToken.slice(7);
  }

  return req.body?.token || null;
};

router.post('/register', async (req, res) => {
  const login = String(req.body?.login || '').trim();
  const password = String(req.body?.password || '');

  if (!login || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Логин и пароль обязательны.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Пароль должен содержать минимум 6 символов.',
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { login },
  });

  if (existingUser) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Пользователь с таким логином уже существует.',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      login,
      passwordHash,
    },
  });

  const token = signToken({ userId: user.id });

  return res.status(201).json({
    token,
    user: sanitizeUser(user),
  });
});

router.post('/login', async (req, res) => {
  const login = String(req.body?.login || '').trim();
  const password = String(req.body?.password || '');

  if (!login || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Логин и пароль обязательны.',
    });
  }

  const user = await prisma.user.findUnique({
    where: { login },
  });

  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Неверный логин или пароль.',
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Неверный логин или пароль.',
    });
  }

  const token = signToken({ userId: user.id });

  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Токен успешно удалён на стороне клиента.',
  });
});

router.post('/refresh', (req, res) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Требуется текущий JWT токен.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'calculatrade-dev-secret');
    const refreshedToken = signToken({ userId: decoded.userId });

    return res.json({
      token: refreshedToken,
    });
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'JWT токен недействителен или истек.',
    });
  }
});

export default router;
