import { Router } from 'express';
import { AnalyticsController } from './controller';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', AnalyticsController.getOverview);
analyticsRouter.get('/snapshots', AnalyticsController.getSnapshots);
