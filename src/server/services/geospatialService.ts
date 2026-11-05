import { Router, Request, Response } from 'express';
import { resourceDb } from '../db/init';

export const geospatialRouter = Router();

// Haversine formula to compute great-circle distance between two coordinates in kilometers
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

export function generateOsmDirectionsUrl(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${fromLat}%2C${fromLng}%3B${toLat}%2C${toLng}`;
}

// Geospatial nearby search
geospatialRouter.get('/nearby', (req: Request, res: Response): void => {
  const {
    lat,
    lng,
    radius = 50, // default 50km
    category,
    district,
    resource_type,
    only_available = 'true',
    limit = 30
  } = req.query;

  if (!lat || !lng) {
    res.status(400).json({ error: 'Latitude and longitude coordinates are required for geospatial discovery.' });
    return;
  }

  const userLat = parseFloat(lat as string);
  const userLng = parseFloat(lng as string);
  const searchRadius = parseFloat(radius as string);

  if (isNaN(userLat) || isNaN(userLng)) {
    res.status(400).json({ error: 'Invalid coordinate parameters.' });
    return;
  }

  let sql = 'SELECT * FROM resources WHERE is_approved = 1';
  const params: any[] = [];

  if (only_available === 'true') {
    sql += " AND availability = 'available' AND quantity > 0";
  }
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

  const allMatching = resourceDb.prepare(sql).all(...params) as any[];

  // Calculate real Haversine distance for each resource and attach directions link
  const calculated = allMatching.map((r) => {
    const distanceKm = calculateHaversineDistance(userLat, userLng, r.latitude, r.longitude);
    const directionsUrl = generateOsmDirectionsUrl(userLat, userLng, r.latitude, r.longitude);
    return {
      ...r,
      distance_km: distanceKm,
      directions_url: directionsUrl,
    };
  });

  // Filter within requested radius (if radius > 0)
  const withinRadius = searchRadius > 0
    ? calculated.filter((r) => r.distance_km <= searchRadius)
    : calculated;

  // Sort nearest first (distance ascending)
  withinRadius.sort((a, b) => a.distance_km - b.distance_km);

  const limited = withinRadius.slice(0, Number(limit));

  res.json({
    user_location: { latitude: userLat, longitude: userLng },
    radius_km: searchRadius,
    total_found: withinRadius.length,
    results: limited,
  });
});

// District spatial statistics
geospatialRouter.get('/districts', (req: Request, res: Response): void => {
  const districtStats = resourceDb.prepare(`
    SELECT district, COUNT(*) as resource_count, SUM(quantity) as total_quantity
    FROM resources
    WHERE availability = 'available'
    GROUP BY district
    ORDER BY resource_count DESC
  `).all();

  res.json({ districts: districtStats });
});
