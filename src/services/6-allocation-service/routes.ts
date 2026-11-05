import { Router } from 'express';
import { AllocationController } from './controller';
import { authenticate } from '../common/auth';

export const allocationRouter = Router();

allocationRouter.get('/', AllocationController.listAllocations);
allocationRouter.get('/recommendations/:emergencyId', AllocationController.getRecommendations);
allocationRouter.get('/audit-logs', AllocationController.getAuditLogs);
allocationRouter.post('/', authenticate, AllocationController.createAllocation);
allocationRouter.patch('/:id/status', AllocationController.updateStatus);
