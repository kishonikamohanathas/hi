import express from 'express';
import cors from 'cors';
import { seedGeospatialData } from './db';
import { geospatialRouter } from './routes';

const app = express();
const PORT = 3004;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedGeospatialData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Geospatial Discovery Service',
    port: PORT,
    database: '.data/geospatial_service.db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/geospatial', geospatialRouter);
app.use('/', geospatialRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Geospatial Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
