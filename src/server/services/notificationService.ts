import { Router, Response } from 'express';
import { notificationDb } from '../db/init';
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware';

export const notificationRouter = Router();

// Get notifications for current authenticated user
notificationRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const notifications = notificationDb.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  const unreadCountRow = notificationDb.prepare(`
    SELECT COUNT(*) as unread_count FROM notifications
    WHERE user_id = ? AND is_read = 0
  `).get(req.user.id) as { unread_count: number };

  res.json({
    notifications,
    unread_count: unreadCountRow.unread_count,
  });
});

// Mark single notification as read
notificationRouter.patch('/:id/read', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  notificationDb.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  res.json({ success: true, message: 'Notification marked as read' });
});

// Mark all as read
notificationRouter.post('/read-all', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  notificationDb.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ?
  `).run(req.user.id);

  res.json({ success: true, message: 'All notifications marked as read' });
});
