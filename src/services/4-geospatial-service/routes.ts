import { Router } from 'express';
import { GeospatialController } from './controller';

export const geospatialRouter = Router();

geospatialRouter.get('/nearby', GeospatialController.getNearby);
geospatialRouter.get('/districts', GeospatialController.getDistricts);
geospatialRouter.post('/distance', GeospatialController.calculateDistance);
