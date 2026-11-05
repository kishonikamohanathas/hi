import { Router } from 'express';
import { ResourceController } from './controller';
import { authenticate } from '../common/auth';

export const resourceRouter = Router();

resourceRouter.get('/categories', ResourceController.getCategories);
resourceRouter.get('/my-resources', authenticate, ResourceController.getMyResources);
resourceRouter.get('/', ResourceController.listResources);
resourceRouter.get('/:id', ResourceController.getResourceById);
resourceRouter.post('/', authenticate, ResourceController.createResource);
resourceRouter.put('/:id', authenticate, ResourceController.updateResource);
resourceRouter.delete('/:id', authenticate, ResourceController.deleteResource);
resourceRouter.patch('/:id/stock', ResourceController.updateStock);
