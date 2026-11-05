import { Router } from 'express';
import { EmergencyController } from './controller';
import { authenticate } from '../common/auth';

export const emergencyRouter = Router();

emergencyRouter.post('/', authenticate, EmergencyController.reportEmergency);
emergencyRouter.get('/', EmergencyController.listEmergencies);
emergencyRouter.get('/:id', EmergencyController.getEmergencyById);
emergencyRouter.patch('/:id/status', authenticate, EmergencyController.updateStatus);
