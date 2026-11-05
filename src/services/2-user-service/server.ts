import express from 'express';
import cors from 'cors';
import { seedUserData } from './db';
import { userRouter } from './routes';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedUserData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'User Management Service',
    port: PORT,
    database: '.data/user_service.db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/users', userRouter);
app.use('/', userRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[User Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
