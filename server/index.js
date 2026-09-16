import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

app.use('/api/auth', (req, res) => {
  res.status(501).json({
    error: 'Auth endpoints are not implemented yet.',
    message: 'Stage 2 will add register/login/JWT flow.',
  });
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
