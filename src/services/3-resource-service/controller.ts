import { Request, Response } from 'express';
import { resourceDb } from './db';
import { AuthenticatedRequest } from '../common/auth';

export class ResourceController {
  static getCategories(req: Request, res: Response): void {
    const categories = resourceDb.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json({ categories });
  }

  static listResources(req: Request, res: Response): void {
    const { category, district, resource_type, availability, search, provider_id } = req.query;
    let sql = 'SELECT * FROM resources WHERE is_approved = 1';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (resource_type) {
      sql += ' AND resource_type = ?';
      params.push(resource_type);
    }
    if (availability) {
      sql += ' AND availability = ?';
      params.push(availability);
    }
    if (provider_id) {
      sql += ' AND provider_id = ?';
      params.push(provider_id);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';
    const resources = resourceDb.prepare(sql).all(...params);
    res.json({ resources });
  }

  static getMyResources(req: AuthenticatedRequest, res: Response): void {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const resources = resourceDb.prepare('SELECT * FROM resources WHERE provider_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ resources });
  }

  static getResourceById(req: Request, res: Response): void {
    const resource = resourceDb.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    res.json({ resource });
  }

  static createResource(req: AuthenticatedRequest, res: Response): void {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      name, category, description, quantity, unit, price,
      resource_type, latitude, longitude, district, address, expiry_date, image_url
    } = req.body;

    if (!name || !category || quantity === undefined || !unit || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Name, category, quantity, unit, and coordinates are required.' });
      return;
    }

    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const defaultImage = image_url || '/src/assets/images/relief_supply_distribution_1793849399746.jpg';

    resourceDb.prepare(`
      INSERT INTO resources (
        id, provider_id, provider_name, provider_phone, name, category, description,
        quantity, original_quantity, unit, price, resource_type, latitude, longitude,
        district, address, availability, is_approved, expiry_date, image_url
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, 'available', 1, ?, ?
      )
    `).run(
      id,
      req.user.id,
      req.user.full_name,
      req.user.phone || '',
      name,
      category,
      description || '',
      Number(quantity),
      Number(quantity),
      unit,
      Number(price) || 0,
      resource_type || (Number(price) > 0 ? 'paid' : 'free'),
      Number(latitude),
      Number(longitude),
      district || req.user.district || 'Colombo',
      address || '',
      expiry_date || '',
      defaultImage
    );

    const resource = resourceDb.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    res.status(201).json({ resource, message: 'Resource published successfully' });
  }

  static updateResource(req: AuthenticatedRequest, res: Response): void {
    const { id } = req.params;
    const existing = resourceDb.prepare('SELECT * FROM resources WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    const {
      name, category, description, quantity, unit, price,
      resource_type, latitude, longitude, district, address, availability, expiry_date, is_approved
    } = req.body;

    resourceDb.prepare(`
      UPDATE resources SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        quantity = COALESCE(?, quantity),
        unit = COALESCE(?, unit),
        price = COALESCE(?, price),
        resource_type = COALESCE(?, resource_type),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        district = COALESCE(?, district),
        address = COALESCE(?, address),
        availability = COALESCE(?, availability),
        expiry_date = COALESCE(?, expiry_date),
        is_approved = COALESCE(?, is_approved),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, category, description,
      quantity !== undefined ? Number(quantity) : null,
      unit,
      price !== undefined ? Number(price) : null,
      resource_type,
      latitude !== undefined ? Number(latitude) : null,
      longitude !== undefined ? Number(longitude) : null,
      district, address, availability, expiry_date,
      is_approved !== undefined ? Number(is_approved) : null,
      id
    );

    const updated = resourceDb.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    res.json({ resource: updated, message: 'Resource updated successfully' });
  }

  static deleteResource(req: Request, res: Response): void {
    const { id } = req.params;
    const existing = resourceDb.prepare('SELECT id FROM resources WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    resourceDb.prepare('DELETE FROM resources WHERE id = ?').run(id);
    res.json({ message: 'Resource deleted successfully' });
  }

  // Stock reserve / update via REST (used by Allocation Service)
  static updateStock(req: Request, res: Response): void {
    const { id } = req.params;
    const { delta, force_quantity } = req.body;

    const resource = resourceDb.prepare('SELECT * FROM resources WHERE id = ?').get(id) as any;
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    let newQty: number;
    if (force_quantity !== undefined) {
      newQty = Number(force_quantity);
    } else if (delta !== undefined) {
      newQty = resource.quantity + Number(delta);
    } else {
      res.status(400).json({ error: 'delta or force_quantity is required' });
      return;
    }

    if (newQty < 0) {
      res.status(400).json({ error: 'Cannot reduce stock below 0' });
      return;
    }

    const newAvailability = newQty <= 0 ? 'exhausted' : 'available';

    resourceDb.prepare(`
      UPDATE resources
      SET quantity = ?, availability = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newQty, newAvailability, id);

    const updated = resourceDb.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    res.json({ resource: updated, message: 'Stock updated successfully' });
  }
}
