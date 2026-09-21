const path = require('node:path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
function config() {
  const corsOrigin = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const value = { databaseUrl: process.env.DATABASE_URL, sessionSecret: process.env.SESSION_SECRET, port: Number(process.env.PORT || 3000), nodeEnv: process.env.NODE_ENV || 'development', corsOrigin: corsOrigin.length ? corsOrigin : false };
  if (!value.databaseUrl) throw new Error('DATABASE_URL is required');
  if (!value.sessionSecret || value.sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return value;
}
module.exports = config;
