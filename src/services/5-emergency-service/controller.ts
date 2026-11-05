import { Request, Response } from 'express';
import { emergencyDb } from './db';
import { AuthenticatedRequest } from '../common/auth';

export class EmergencyController {
  static async reportEmergency(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      emergency_type, description, priority, latitude, longitude,
      district, address, contact_phone, people_affected, required_resources
    } = req.body;

    if (!emergency_type || !description || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Emergency type, description, and valid coordinates are required.' });
      return;
    }

    const id = `emg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const resolvedPriority = ['critical', 'high', 'medium', 'low'].includes(priority) ? priority : 'high';

    emergencyDb.prepare(`
      INSERT INTO emergencies (
        id, user_id, requester_name, contact_phone, emergency_type, description,
        priority, latitude, longitude, district, address, people_affected,
        required_resources, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, 'reported'
      )
    `).run(
      id,
      req.user.id,
      req.user.full_name,
      contact_phone || 'Emergency Line',
      emergency_type,
      description,
      resolvedPriority,
      Number(latitude),
      Number(longitude),
      district || req.user.district || 'Colombo',
      address || 'Disaster site coordinates',
      Number(people_affected) || 1,
      required_resources || ''
    );

    // Record timeline entry
    emergencyDb.prepare(`
      INSERT INTO incident_timeline (id, emergency_id, action, performed_by, notes)
      VALUES (?, ?, 'INCIDENT_REPORTED', ?, ?)
    `).run(`tml_${Date.now()}`, id, req.user.full_name, `Reported ${emergency_type} in ${district}`);

    // Inter-Service REST API call to Notification Service (Port 3007)
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:3007';
      await fetch(`${notificationServiceUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'usr_coord_01',
          title: `🚨 New ${resolvedPriority.toUpperCase()} Emergency: ${emergency_type}`,
          message: `An incident has been reported in ${district || 'the area'}: "${description.substring(0, 80)}...". Triage verification required.`,
          notification_type: 'emergency_alert',
          reference_id: id,
        }),
      });
    } catch {
      // notification failure does not block emergency creation
    }

    const emergency = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(id);
    res.status(201).json({ emergency, message: 'Emergency request submitted and queued for emergency coordinator triage.' });
  }

  static listEmergencies(req: Request, res: Response): void {
    const { status, priority, district, user_id, search } = req.query;
    let sql = 'SELECT * FROM emergencies WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority);
    }
    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (user_id) {
      sql += ' AND user_id = ?';
      params.push(user_id);
    }
    if (search) {
      sql += ' AND (description LIKE ? OR requester_name LIKE ? OR emergency_type LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC";
    const emergencies = emergencyDb.prepare(sql).all(...params);
    res.json({ emergencies });
  }

  static getEmergencyById(req: Request, res: Response): void {
    const emergency = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(req.params.id);
    if (!emergency) {
      res.status(404).json({ error: 'Emergency incident not found' });
      return;
    }
    const timeline = emergencyDb.prepare('SELECT * FROM incident_timeline WHERE emergency_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ emergency, timeline });
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status, priority, triage_notes } = req.body;

    const emergency = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(id) as any;
    if (!emergency) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (triage_notes !== undefined) {
      updates.push('triage_notes = ?');
      params.push(triage_notes);
    }

    if (req.user?.role === 'coordinator' || req.user?.role === 'admin') {
      updates.push('assigned_coordinator_id = ?', 'assigned_coordinator_name = ?');
      params.push(req.user.id, req.user.full_name);
    }

    params.push(id);
    emergencyDb.prepare(`UPDATE emergencies SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Record timeline entry
    emergencyDb.prepare(`
      INSERT INTO incident_timeline (id, emergency_id, action, performed_by, notes)
      VALUES (?, ?, 'STATUS_UPDATED', ?, ?)
    `).run(`tml_${Date.now()}`, id, req.user?.full_name || 'System', `Status changed to ${status || emergency.status}`);

    // Inter-Service REST API call to Notification Service (Port 3007)
    if (emergency.user_id) {
      try {
        const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:3007';
        await fetch(`${notificationServiceUrl}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: emergency.user_id,
            title: `Emergency Status Updated: ${status ? status.toUpperCase() : 'Reviewed'}`,
            message: `Your emergency incident #${id} has been marked as '${status || emergency.status}' by Coordinator ${req.user?.full_name}. ${triage_notes ? 'Note: ' + triage_notes : ''}`,
            notification_type: 'request_update',
            reference_id: id,
          }),
        });
      } catch {
        // ignore notification error
      }
    }

    const updated = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(id);
    res.json({ emergency: updated, message: 'Incident updated successfully.' });
  }
}
