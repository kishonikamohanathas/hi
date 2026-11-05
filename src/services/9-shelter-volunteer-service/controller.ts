import { Request, Response } from 'express';
import { shelterVolunteerDb } from './db';
import { AuthenticatedRequest } from '../common/auth';

export class ShelterVolunteerController {
  // Shelters
  static listShelters(req: Request, res: Response): void {
    const { district, status } = req.query;
    let sql = 'SELECT * FROM shelters WHERE 1=1';
    const params: any[] = [];

    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY district ASC, name ASC';
    const shelters = shelterVolunteerDb.prepare(sql).all(...params);
    res.json({ shelters });
  }

  static addShelter(req: Request, res: Response): void {
    const { name, district, latitude, longitude, capacity, occupancy, contact_person, contact_phone, facilities, status } = req.body;
    if (!name || !district || latitude === undefined || longitude === undefined || !capacity) {
      res.status(400).json({ error: 'Name, district, capacity, and coordinates are required.' });
      return;
    }

    const id = `shl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    shelterVolunteerDb.prepare(`
      INSERT INTO shelters (id, name, district, latitude, longitude, capacity, occupancy, contact_person, contact_phone, status, facilities)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, district, Number(latitude), Number(longitude), Number(capacity), Number(occupancy) || 0, contact_person || '', contact_phone || '', status || 'open', facilities || '');

    const shelter = shelterVolunteerDb.prepare('SELECT * FROM shelters WHERE id = ?').get(id);
    res.status(201).json({ shelter, message: 'Shelter added successfully' });
  }

  static updateShelter(req: Request, res: Response): void {
    const { id } = req.params;
    const { occupancy, status, contact_person, contact_phone } = req.body;

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (occupancy !== undefined) {
      updates.push('occupancy = ?');
      params.push(Number(occupancy));
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (contact_person) {
      updates.push('contact_person = ?');
      params.push(contact_person);
    }
    if (contact_phone) {
      updates.push('contact_phone = ?');
      params.push(contact_phone);
    }

    params.push(id);
    shelterVolunteerDb.prepare(`UPDATE shelters SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = shelterVolunteerDb.prepare('SELECT * FROM shelters WHERE id = ?').get(id);
    res.json({ shelter: updated, message: 'Shelter updated successfully' });
  }

  // Volunteers
  static listVolunteers(req: Request, res: Response): void {
    const { district, availability_status } = req.query;
    let sql = 'SELECT * FROM volunteers WHERE 1=1';
    const params: any[] = [];

    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (availability_status) {
      sql += ' AND availability_status = ?';
      params.push(availability_status);
    }

    sql += ' ORDER BY name ASC';
    const volunteers = shelterVolunteerDb.prepare(sql).all(...params);
    res.json({ volunteers });
  }

  static assignVolunteer(req: Request, res: Response): void {
    const { id } = req.params;
    const { emergency_id, availability_status } = req.body;

    shelterVolunteerDb.prepare(`
      UPDATE volunteers
      SET assigned_emergency_id = ?,
          availability_status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(emergency_id || null, availability_status || 'deployed', id);

    const updated = shelterVolunteerDb.prepare('SELECT * FROM volunteers WHERE id = ?').get(id);
    res.json({ volunteer: updated, message: 'Volunteer deployment updated.' });
  }
}
