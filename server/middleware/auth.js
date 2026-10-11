import { verifyToken } from '../lib/token.js';

export const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Требуется JWT токен в заголовке Authorization: Bearer <token>.',
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'JWT токен недействителен или истек.',
    });
  }
};
