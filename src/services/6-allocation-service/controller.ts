import { Request, Response } from 'express';
import { allocationDb } from './db';
import { AuthenticatedRequest } from '../common/auth';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class AllocationController {
  static async getRecommendations(req: Request, res: Response): Promise<void> {
    const { emergencyId } = req.params;

    try {
      const emergencyServiceUrl = process.env.EMERGENCY_SERVICE_URL || 'http://127.0.0.1:3005';
      const resourceServiceUrl = process.env.RESOURCE_SERVICE_URL || 'http://127.0.0.1:3003';

      // 1. Fetch Emergency from Emergency Service via REST
      const emgResponse = await fetch(`${emergencyServiceUrl}/api/emergencies/${emergencyId}`);
      if (!emgResponse.ok) {
        res.status(404).json({ error: 'Emergency incident not found in Emergency Service' });
        return;
      }
      const emgData = await emgResponse.json() as { emergency: any };
      const emergency = emgData.emergency;

      // 2. Fetch Available Resources from Resource Service via REST
      const resResponse = await fetch(`${resourceServiceUrl}/api/resources?availability=available`);
      if (!resResponse.ok) {
        res.status(502).json({ error: 'Failed to fetch resources from Resource Service' });
        return;
      }
      const resData = await resResponse.json() as { resources: any[] };
      const resources = resData.resources.filter((r: any) => r.quantity > 0);

      // 3. Intelligent Match Scoring
      const scoredCandidates = resources.map((resItem: any) => {
        const distanceKm = calculateDistance(
          emergency.latitude,
          emergency.longitude,
          resItem.latitude,
          resItem.longitude
        );

        let score = 50;

        // Proximity (up to 35 pts)
        if (distanceKm < 5) score += 35;
        else if (distanceKm < 15) score += 28;
        else if (distanceKm < 30) score += 20;
        else if (distanceKm < 60) score += 12;
        else score += 5;

        // District bonus (10 pts)
        if (resItem.district.toLowerCase() === emergency.district.toLowerCase()) {
          score += 10;
        }

        // Category relevance / keyword match
        const reqText = `${emergency.required_resources || ''} ${emergency.description} ${emergency.emergency_type}`.toLowerCase();
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

        // Urgency & stock availability
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

      scoredCandidates.sort((a: any, b: any) => b.match_score - a.match_score || a.distance_km - b.distance_km);

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
    } catch (err: any) {
      res.status(500).json({ error: 'Allocation engine failure: ' + err.message });
    }
  }

  static async createAllocation(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    const emergencyServiceUrl = process.env.EMERGENCY_SERVICE_URL || 'http://127.0.0.1:3005';
    const resourceServiceUrl = process.env.RESOURCE_SERVICE_URL || 'http://127.0.0.1:3003';
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:3007';

    try {
      // 1. Fetch Emergency
      const emgRes = await fetch(`${emergencyServiceUrl}/api/emergencies/${emergency_id}`);
      if (!emgRes.ok) {
        res.status(404).json({ error: 'Emergency incident not found' });
        return;
      }
      const emergency = (await emgRes.json() as any).emergency;

      // 2. Fetch Resource
      const resRes = await fetch(`${resourceServiceUrl}/api/resources/${resource_id}`);
      if (!resRes.ok) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }
      const resource = (await resRes.json() as any).resource;

      if (resource.quantity < qty) {
        res.status(400).json({
          error: `Insufficient inventory. Available: ${resource.quantity} ${resource.unit}, Requested: ${qty} ${resource.unit}. Prevents over-allocation.`,
        });
        return;
      }

      // 3. Atomically deduct stock in Resource Service via REST API
      const stockRes = await fetch(`${resourceServiceUrl}/api/resources/${resource_id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: -qty }),
      });
      if (!stockRes.ok) {
        res.status(500).json({ error: 'Failed to reserve stock in Resource Service' });
        return;
      }

      const distanceKm = calculateDistance(
        emergency.latitude,
        emergency.longitude,
        resource.latitude,
        resource.longitude
      );

      const allocationId = `alc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // 4. Save allocation in SQLite
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

      // 5. Update Emergency status to 'assigned' in Emergency Service via REST
      if (emergency.status === 'reported' || emergency.status === 'verified') {
        fetch(`${emergencyServiceUrl}/api/emergencies/${emergency.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || '',
          },
          body: JSON.stringify({
            status: 'assigned',
            triage_notes: `Allocated ${qty} ${resource.unit} of ${resource.name}`,
          }),
        }).catch(() => {});
      }

      // 6. Log in Audit Trail
      allocationDb.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, 'ALLOCATE_RESOURCE', 'ALLOCATION', ?, ?)
      `).run(
        `aud_${Date.now()}`,
        req.user.id,
        allocationId,
        `Allocated ${qty} ${resource.unit} of ${resource.name} to Emergency #${emergency.id}`
      );

      // 7. Dispatch in-app notifications via Notification Service REST API
      fetch(`${notificationServiceUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: emergency.user_id,
          title: 'Essential Relief Resources Allocated',
          message: `${qty} ${resource.unit} of "${resource.name}" has been allocated for your emergency #${emergency.id} by ${req.user.full_name}.`,
          notification_type: 'allocation_update',
          reference_id: allocationId,
        }),
      }).catch(() => {});

      fetch(`${notificationServiceUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: resource.provider_id,
          title: 'Urgent Resource Dispatched for Emergency',
          message: `${qty} ${resource.unit} of "${resource.name}" allocated to incident in ${emergency.district}. Stock deducted.`,
          notification_type: 'allocation_update',
          reference_id: allocationId,
        }),
      }).catch(() => {});

      const allocation = allocationDb.prepare('SELECT * FROM allocations WHERE id = ?').get(allocationId);
      res.status(201).json({
        allocation,
        message: 'Resource allocated successfully. Stock deducted transactionally via Resource Service.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Allocation failed: ' + err.message });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
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

    // If cancelled or rejected, replenish stock in Resource Service
    if ((status === 'cancelled' || status === 'rejected') && allocation.status !== 'cancelled' && allocation.status !== 'rejected') {
      try {
        const resourceServiceUrl = process.env.RESOURCE_SERVICE_URL || 'http://127.0.0.1:3003';
        await fetch(`${resourceServiceUrl}/api/resources/${allocation.resource_id}/stock`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta: allocation.allocated_quantity }),
        });
      } catch {
        // ignore
      }
    }

    allocationDb.prepare(`
      UPDATE allocations
      SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, notes, id);

    const updated = allocationDb.prepare('SELECT * FROM allocations WHERE id = ?').get(id);
    res.json({ allocation: updated, message: `Allocation status updated to '${status}'.` });
  }

  static listAllocations(req: Request, res: Response): void {
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
  }

  static getAuditLogs(req: Request, res: Response): void {
    const auditLogs = allocationDb.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all();
    res.json({ audit_logs: auditLogs });
  }
}
