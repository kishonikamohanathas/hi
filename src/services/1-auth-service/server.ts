import express from 'express';
import cors from 'cors';
import { seedAuthData } from './db';
import { authRouter } from './routes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedAuthData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Authentication Service',
    port: PORT,
    database: '.data/auth_service.db',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes: both under /api/auth and root for flexibility
app.use('/api/auth', authRouter);
app.use('/', authRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Auth Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
