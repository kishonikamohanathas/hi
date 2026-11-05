import { Router, Response } from 'express';
import { emergencyDb, notificationDb } from '../db/init';
import { authenticate, authorizeRoles, AuthenticatedRequest } from '../middleware/authMiddleware';

export const emergencyRouter = Router();

// Submit emergency incident
emergencyRouter.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
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

  // Notify coordinators of new emergency
  notificationDb.prepare(`
    INSERT INTO notifications (id, user_id, title, message, notification_type, reference_id)
    VALUES (?, 'usr_coord_01', ?, ?, 'emergency_alert', ?)
  `).run(
    `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    `🚨 New ${resolvedPriority.toUpperCase()} Emergency: ${emergency_type}`,
    `An incident has been reported in ${district || 'the area'}: "${description.substring(0, 80)}...". Triage verification required.`,
    id
  );

  const emergency = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(id);
  res.status(201).json({ emergency, message: 'Emergency request submitted and queued for emergency coordinator triage.' });
});

// List emergencies (filter by status, priority, district, requester)
emergencyRouter.get('/', (req, res: Response): void => {
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
});

// Get emergency by ID
emergencyRouter.get('/:id', (req, res: Response): void => {
  const emergency = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(req.params.id);
  if (!emergency) {
    res.status(404).json({ error: 'Emergency incident not found' });
    return;
  }
  res.json({ emergency });
});

// Triage & Update Incident status (Coordinator or Admin)
emergencyRouter.patch('/:id/status', authenticate, authorizeRoles('coordinator', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
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

  // Send in-app notification to requester
  if (emergency.user_id) {
    notificationDb.prepare(`
      INSERT INTO notifications (id, user_id, title, message, notification_type, reference_id)
      VALUES (?, ?, ?, ?, 'request_update', ?)
    `).run(
      `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emergency.user_id,
      `Emergency Status Updated: ${status ? status.toUpperCase() : 'Reviewed'}`,
      `Your emergency incident #${id} has been marked as '${status || emergency.status}' by Coordinator ${req.user?.full_name}. ${triage_notes ? 'Note: ' + triage_notes : ''}`,
      id
    );
  }

  const updated = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(id);
  res.json({ emergency: updated, message: 'Incident updated successfully.' });
});

// Shelters endpoints
emergencyRouter.get('/shelters/list', (req, res: Response): void => {
  const shelters = emergencyDb.prepare('SELECT * FROM shelters ORDER BY district ASC, name ASC').all();
  res.json({ shelters });
});

emergencyRouter.post('/shelters/add', authenticate, authorizeRoles('coordinator', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { name, district, latitude, longitude, capacity, occupancy, contact_person, contact_phone, facilities, status } = req.body;
  if (!name || !district || latitude === undefined || longitude === undefined || !capacity) {
    res.status(400).json({ error: 'Name, district, capacity, and coordinates are required.' });
    return;
  }

  const id = `shl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  emergencyDb.prepare(`
    INSERT INTO shelters (id, name, district, latitude, longitude, capacity, occupancy, contact_person, contact_phone, status, facilities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, district, Number(latitude), Number(longitude), Number(capacity), Number(occupancy) || 0, contact_person || '', contact_phone || '', status || 'open', facilities || '');

  const shelter = emergencyDb.prepare('SELECT * FROM shelters WHERE id = ?').get(id);
  res.status(201).json({ shelter, message: 'Shelter added successfully' });
});

// Volunteers endpoints
emergencyRouter.get('/volunteers/list', (req, res: Response): void => {
  const volunteers = emergencyDb.prepare('SELECT * FROM volunteers ORDER BY name ASC').all();
  res.json({ volunteers });
});

emergencyRouter.patch('/volunteers/:id/assign', authenticate, authorizeRoles('coordinator', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { emergency_id, availability_status } = req.body;

  emergencyDb.prepare(`
    UPDATE volunteers
    SET assigned_emergency_id = ?,
        availability_status = ?
    WHERE id = ?
  `).run(emergency_id || null, availability_status || 'deployed', id);

  const updated = emergencyDb.prepare('SELECT * FROM volunteers WHERE id = ?').get(id);
  res.json({ volunteer: updated, message: 'Volunteer deployment updated.' });
});
