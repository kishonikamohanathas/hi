import express from 'express';
import cors from 'cors';
import { seedAnalyticsData } from './db';
import { analyticsRouter } from './routes';

const app = express();
const PORT = Number(process.env.PORT) || 3008;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedAnalyticsData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Reporting & Analytics Service',
    port: PORT,
    database: '.data/analytics_service.db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/analytics', analyticsRouter);
app.use('/', analyticsRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Analytics Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
