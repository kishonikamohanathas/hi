import express from 'express';
import cors from 'cors';
import { seedNotificationData } from './db';
import { notificationRouter } from './routes';

const app = express();
const PORT = Number(process.env.PORT) || 3007;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedNotificationData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Notification Service',
    port: PORT,
    database: '.data/notification_service.db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/notifications', notificationRouter);
app.use('/', notificationRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Notification Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
