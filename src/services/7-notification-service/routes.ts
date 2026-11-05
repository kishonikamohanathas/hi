import { Router } from 'express';
import { NotificationController } from './controller';
import { authenticate } from '../common/auth';

export const notificationRouter = Router();

notificationRouter.get('/', authenticate, NotificationController.getNotifications);
notificationRouter.post('/', NotificationController.createNotification);
notificationRouter.patch('/:id/read', authenticate, NotificationController.markRead);
notificationRouter.post('/read-all', authenticate, NotificationController.markAllRead);
