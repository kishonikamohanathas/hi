import express from 'express';
import cors from 'cors';
import { seedAllocationData } from './db';
import { allocationRouter } from './routes';

const app = express();
const PORT = Number(process.env.PORT) || 3006;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedAllocationData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Resource Allocation Service',
    port: PORT,
    database: '.data/allocation_service.db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/allocations', allocationRouter);
app.use('/', allocationRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Allocation Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
