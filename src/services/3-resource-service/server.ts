import express from 'express';
import cors from 'cors';
import { seedResourceData } from './db';
import { resourceRouter } from './routes';

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedResourceData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Resource Management Service',
    port: PORT,
    database: '.data/resource_service.db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/resources', resourceRouter);
app.use('/', resourceRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Resource Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
