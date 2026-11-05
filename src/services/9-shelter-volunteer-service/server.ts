import express from 'express';
import cors from 'cors';
import { seedShelterVolunteerData } from './db';
import { shelterVolunteerRouter } from './routes';

const app = express();
const PORT = Number(process.env.PORT) || 3009;

app.use(cors());
app.use(express.json());

// Initialize and seed SQLite database
seedShelterVolunteerData();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Volunteer & Shelter Coordination Service',
    port: PORT,
    database: '.data/shelter_volunteer_service.db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', shelterVolunteerRouter);
app.use('/', shelterVolunteerRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Shelter & Volunteer Service] Running independently on http://0.0.0.0:${PORT}`);
  });
}

export default app;
