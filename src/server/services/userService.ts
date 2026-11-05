import { Router, Response } from 'express';
import { authDb } from '../db/init';
import { authenticate, authorizeRoles, AuthenticatedRequest } from '../middleware/authMiddleware';

export const userRouter = Router();

// Get all users (Admin only)
userRouter.get('/', authenticate, authorizeRoles('admin'), (req, res: Response): void => {
  const { role, status, search } = req.query;
  let sql = 'SELECT id, full_name, email, phone, role, status, district, address, organization_name, created_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (full_name LIKE ? OR email LIKE ? OR organization_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';
  const users = authDb.prepare(sql).all(...params);
  res.json({ users });
});

// Update user role or status (Admin only)
userRouter.patch('/:id', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { role, status, verification_notes } = req.body;

  const user = authDb.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (role) {
    updates.push('role = ?');
    params.push(role);
  }
  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (verification_notes !== undefined) {
    updates.push('verification_notes = ?');
    params.push(verification_notes);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields provided for update' });
    return;
  }

  params.push(id);
  authDb.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);

  const updatedUser = authDb.prepare('SELECT id, full_name, email, phone, role, status, district, address, organization_name FROM users WHERE id = ?').get(id);
  res.json({ user: updatedUser, message: 'User updated successfully' });
});

// Update own profile
userRouter.put('/profile', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { full_name, phone, district, address, organization_name } = req.body;
  authDb.prepare(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        district = COALESCE(?, district),
        address = COALESCE(?, address),
        organization_name = COALESCE(?, organization_name),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(full_name, phone, district, address, organization_name, req.user.id);

  const updatedUser = authDb.prepare('SELECT id, full_name, email, phone, role, status, district, address, organization_name FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: updatedUser, message: 'Profile updated successfully' });
});
