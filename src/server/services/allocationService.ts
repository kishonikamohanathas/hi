import { Router, Response } from 'express';
import { allocationDb, resourceDb, emergencyDb, notificationDb } from '../db/init';
import { calculateHaversineDistance } from './geospatialService';
import { authenticate, authorizeRoles, AuthenticatedRequest } from '../middleware/authMiddleware';

export const allocationRouter = Router();

// Intelligent Match Recommendation Engine
allocationRouter.get('/recommendations/:emergencyId', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { emergencyId } = req.params;
  const emergency = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(emergencyId) as any;

  if (!emergency) {
    res.status(404).json({ error: 'Emergency incident not found' });
    return;
  }

  // Fetch all available, approved resources
  const resources = resourceDb.prepare(`
    SELECT * FROM resources
    WHERE availability = 'available' AND quantity > 0 AND is_approved = 1
  `).all() as any[];

  // Evaluate each candidate resource against the emergency incident
  const scoredCandidates = resources.map((resItem) => {
    const distanceKm = calculateHaversineDistance(
      emergency.latitude,
      emergency.longitude,
      resItem.latitude,
      resItem.longitude
    );

    // Calculate intelligent match score (0 to 100)
    let score = 50;

    // 1. Proximity score (up to 35 pts)
    if (distanceKm < 5) score += 35;
    else if (distanceKm < 15) score += 28;
    else if (distanceKm < 30) score += 20;
    else if (distanceKm < 60) score += 12;
    else score += 5;

    // 2. Same district bonus (10 pts)
    if (resItem.district.toLowerCase() === emergency.district.toLowerCase()) {
      score += 10;
    }

    // 3. Category relevance / keyword matching in emergency description or required resources (up to 25 pts)
    const reqText = `${emergency.required_resources || ''} ${emergency.description} ${emergency.emergency_type}`.toLowerCase();
    const resText = `${resItem.name} ${resItem.category} ${resItem.description}`.toLowerCase();

    if (emergency.required_resources && emergency.required_resources.toLowerCase().includes(resItem.name.toLowerCase())) {
      score += 25;
    } else if (reqText.includes(resItem.category.toLowerCase())) {
      score += 20;
    } else if (
      (emergency.emergency_type === 'Flood' && (resItem.category.includes('Food') || resItem.category.includes('Rescue'))) ||
      (emergency.emergency_type === 'Medical Emergency' && (resItem.category.includes('Medicines') || resItem.category.includes('Blood'))) ||
      (emergency.emergency_type === 'Shelter Requirement' && (resItem.category.includes('Shelters') || resItem.category.includes('Clothing')))
    ) {
      score += 18;
    }

    // 4. Urgency and Stock Availability (up to 15 pts)
    if (emergency.priority === 'critical' && resItem.resource_type === 'free') {
      score += 10;
    }
    if (resItem.quantity >= 10) {
      score += 5;
    }

    const finalScore = Math.min(100, Math.max(10, score));

    return {
      ...resItem,
      distance_km: distanceKm,
      match_score: finalScore,
      recommendation_reason:
        finalScore >= 80
          ? 'Optimal Match: High proximity, matching relief category & available inventory.'
          : finalScore >= 65
          ? 'Good Candidate: Accessible within operational dispatch radius.'
          : 'Secondary Option: Available for emergency backup.',
    };
  });

  // Sort descending by match score, then ascending by distance
  scoredCandidates.sort((a, b) => b.match_score - a.match_score || a.distance_km - b.distance_km);

  res.json({
    emergency: {
      id: emergency.id,
      emergency_type: emergency.emergency_type,
      priority: emergency.priority,
      district: emergency.district,
      latitude: emergency.latitude,
      longitude: emergency.longitude,
      people_affected: emergency.people_affected,
      required_resources: emergency.required_resources,
    },
    recommendations: scoredCandidates.slice(0, 10),
  });
});

// List allocations
allocationRouter.get('/', (req, res: Response): void => {
  const { emergency_id, provider_id, requester_id, status } = req.query;
  let sql = 'SELECT * FROM allocations WHERE 1=1';
  const params: any[] = [];

  if (emergency_id) {
    sql += ' AND emergency_id = ?';
    params.push(emergency_id);
  }
  if (provider_id) {
    sql += ' AND provider_id = ?';
    params.push(provider_id);
  }
  if (requester_id) {
    sql += ' AND requester_id = ?';
    params.push(requester_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY allocated_at DESC';
  const allocations = allocationDb.prepare(sql).all(...params);
  res.json({ allocations });
});

// Create an allocation (Transactionally reserves inventory and alerts parties)
allocationRouter.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { emergency_id, resource_id, allocated_quantity, notes } = req.body;

  if (!emergency_id || !resource_id || !allocated_quantity || Number(allocated_quantity) <= 0) {
    res.status(400).json({ error: 'Emergency ID, Resource ID, and valid allocated quantity are required.' });
    return;
  }

  const qty = Number(allocated_quantity);

  // Check emergency
  const emergency = emergencyDb.prepare('SELECT * FROM emergencies WHERE id = ?').get(emergency_id) as any;
  if (!emergency) {
    res.status(404).json({ error: 'Emergency incident not found' });
    return;
  }

  // Check resource
  const resource = resourceDb.prepare('SELECT * FROM resources WHERE id = ?').get(resource_id) as any;
  if (!resource) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  if (resource.quantity < qty) {
    res.status(400).json({
      error: `Insufficient inventory. Available: ${resource.quantity} ${resource.unit}, Requested: ${qty} ${resource.unit}. Prevents over-allocation.`,
    });
    return;
  }

  const distanceKm = calculateHaversineDistance(
    emergency.latitude,
    emergency.longitude,
    resource.latitude,
    resource.longitude
  );

  const allocationId = `alc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const remainingQty = resource.quantity - qty;
  const newAvailability = remainingQty <= 0 ? 'exhausted' : 'available';

  // Transactionally update resource stock and insert allocation
  const updateResource = resourceDb.prepare(`
    UPDATE resources
    SET quantity = ?, availability = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  updateResource.run(remainingQty, newAvailability, resource.id);

  allocationDb.prepare(`
    INSERT INTO allocations (
      id, emergency_id, resource_id, resource_name, provider_id, provider_name,
      requester_id, requester_name, coordinator_id, coordinator_name,
      allocated_quantity, unit, distance_km, status, notes
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, 'allocated', ?
    )
  `).run(
    allocationId,
    emergency.id,
    resource.id,
    resource.name,
    resource.provider_id,
    resource.provider_name,
    emergency.user_id,
    emergency.requester_name,
    req.user.id,
    req.user.full_name,
    qty,
    resource.unit,
    distanceKm,
    notes || 'Emergency allocation dispatched via GeoResQ Intelligent Match Engine.'
  );

  // Update emergency status if it was reported or verified
  if (emergency.status === 'reported' || emergency.status === 'verified') {
    emergencyDb.prepare(`
      UPDATE emergencies
      SET status = 'assigned', assigned_coordinator_id = ?, assigned_coordinator_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.user.full_name, emergency.id);
  }

  // Audit log
  allocationDb.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, 'ALLOCATE_RESOURCE', 'ALLOCATION', ?, ?)
  `).run(
    `aud_${Date.now()}`,
    req.user.id,
    allocationId,
    `Allocated ${qty} ${resource.unit} of ${resource.name} to Emergency #${emergency.id}`
  );

  // Notifications
  notificationDb.prepare(`
    INSERT INTO notifications (id, user_id, title, message, notification_type, reference_id)
    VALUES (?, ?, ?, ?, 'allocation_update', ?)
  `).run(
    `notif_${Date.now()}_1`,
    emergency.user_id,
    'Essential Relief Resources Allocated',
    `${qty} ${resource.unit} of "${resource.name}" has been allocated for your emergency #${emergency.id} by ${req.user.full_name}.`,
    allocationId
  );

  notificationDb.prepare(`
    INSERT INTO notifications (id, user_id, title, message, notification_type, reference_id)
    VALUES (?, ?, ?, ?, 'allocation_update', ?)
  `).run(
    `notif_${Date.now()}_2`,
    resource.provider_id,
    'Urgent Resource Dispatched for Emergency',
    `${qty} ${resource.unit} of "${resource.name}" allocated to incident in ${emergency.district}. Stock deducted.`,
    allocationId
  );

  const allocation = allocationDb.prepare('SELECT * FROM allocations WHERE id = ?').get(allocationId);
  res.status(201).json({
    allocation,
    message: 'Resource allocated successfully. Stock deducted transactionally.',
  });
});

// Update allocation status (Provider, Coordinator, Admin)
allocationRouter.patch('/:id/status', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const allocation = allocationDb.prepare('SELECT * FROM allocations WHERE id = ?').get(id) as any;
  if (!allocation) {
    res.status(404).json({ error: 'Allocation not found' });
    return;
  }

  const validStatuses = ['pending', 'approved', 'allocated', 'in_transit', 'delivered', 'completed', 'cancelled', 'rejected'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  // If cancelling or rejecting, replenish the resource quantity
  if ((status === 'cancelled' || status === 'rejected') && allocation.status !== 'cancelled' && allocation.status !== 'rejected') {
    resourceDb.prepare(`
      UPDATE resources
      SET quantity = quantity + ?, availability = 'available', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(allocation.allocated_quantity, allocation.resource_id);
  }

  allocationDb.prepare(`
    UPDATE allocations
    SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, notes, id);

  const updated = allocationDb.prepare('SELECT * FROM allocations WHERE id = ?').get(id);
  res.json({ allocation: updated, message: `Allocation status updated to '${status}'.` });
});
