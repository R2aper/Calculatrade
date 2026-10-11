import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'calculatrade-dev-secret';

export const signToken = (payload) =>
  jwt.sign(payload, getJwtSecret(), {
    expiresIn: '24h',
  });

export const verifyToken = (token) => jwt.verify(token, getJwtSecret());
