import { Request, Response } from 'express';
import { userDb } from './db';
import { AuthenticatedRequest } from '../common/auth';

export class UserController {
  static listUsers(req: Request, res: Response): void {
    const { role, status, search } = req.query;
    let sql = 'SELECT id, full_name, email, phone, role, status, district, address, organization_name, verification_notes, created_at FROM users WHERE 1=1';
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
    const users = userDb.prepare(sql).all(...params);
    res.json({ users });
  }

  static getUserById(req: Request, res: Response): void {
    const user = userDb.prepare('SELECT id, full_name, email, phone, role, status, district, address, organization_name, verification_notes, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  }

  static updateUser(req: Request, res: Response): void {
    const { id } = req.params;
    const { role, status, verification_notes } = req.body;

    const user = userDb.prepare('SELECT id FROM users WHERE id = ?').get(id);
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
    userDb.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);

    const updatedUser = userDb.prepare('SELECT id, full_name, email, phone, role, status, district, address, organization_name, verification_notes FROM users WHERE id = ?').get(id);
    res.json({ user: updatedUser, message: 'User updated successfully' });
  }

  static updateProfile(req: AuthenticatedRequest, res: Response): void {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { full_name, phone, district, address, organization_name } = req.body;
    userDb.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          phone = COALESCE(?, phone),
          district = COALESCE(?, district),
          address = COALESCE(?, address),
          organization_name = COALESCE(?, organization_name),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(full_name, phone, district, address, organization_name, req.user.id);

    const updatedUser = userDb.prepare('SELECT id, full_name, email, phone, role, status, district, address, organization_name FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updatedUser, message: 'Profile updated successfully' });
  }
}
