import express from 'express';
import cors from 'cors';
import { seedEmergencyData } from './db';
import { emergencyRouter } from './routes';

const app = express();
const PORT = Number(process.env.PORT) || 3005;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedEmergencyData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Emergency Management Service',
    port: PORT,
    database: '.data/emergency_service.db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/emergencies', emergencyRouter);
app.use('/', emergencyRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Emergency Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
