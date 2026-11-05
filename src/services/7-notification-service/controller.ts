import { Request, Response } from 'express';
import { notificationDb } from './db';
import { AuthenticatedRequest } from '../common/auth';

export class NotificationController {
  static getNotifications(req: AuthenticatedRequest, res: Response): void {
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
  }

  static createNotification(req: Request, res: Response): void {
    const { user_id, title, message, notification_type, reference_id } = req.body;

    if (!user_id || !title || !message) {
      res.status(400).json({ error: 'user_id, title, and message are required' });
      return;
    }

    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    notificationDb.prepare(`
      INSERT INTO notifications (id, user_id, title, message, notification_type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user_id, title, message, notification_type || 'system', reference_id || null);

    const created = notificationDb.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    res.status(201).json({ notification: created, message: 'Notification created successfully' });
  }

  static markRead(req: AuthenticatedRequest, res: Response): void {
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
  }

  static markAllRead(req: AuthenticatedRequest, res: Response): void {
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
  }
}
