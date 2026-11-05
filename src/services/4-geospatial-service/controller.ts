import { Request, Response } from 'express';
import { geospatialDb } from './db';

// Haversine formula
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
  return Math.round(d * 10) / 10;
}

export function generateOsmDirectionsUrl(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${fromLat}%2C${fromLng}%3B${toLat}%2C${toLng}`;
}

export class GeospatialController {
  // Discovery endpoint communicating with Resource Service via HTTP REST
  static async getNearby(req: Request, res: Response): Promise<void> {
    const {
      lat,
      lng,
      radius = 50,
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

    try {
      // Real REST API communication: fetch resources from Resource Management Service (Port 3003)
      const resourceServiceUrl = process.env.RESOURCE_SERVICE_URL || 'http://127.0.0.1:3003';
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category as string);
      if (district) queryParams.append('district', district as string);
      if (resource_type) queryParams.append('resource_type', resource_type as string);
      if (only_available === 'true') queryParams.append('availability', 'available');

      const response = await fetch(`${resourceServiceUrl}/api/resources?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Resource service responded with status ${response.status}`);
      }
      const data = await response.json() as { resources: any[] };
      const allResources = data.resources || [];

      // Calculate real Haversine distance and route links
      const calculated = allResources.map((r: any) => {
        const distanceKm = calculateHaversineDistance(userLat, userLng, r.latitude, r.longitude);
        const directionsUrl = generateOsmDirectionsUrl(userLat, userLng, r.latitude, r.longitude);
        return {
          ...r,
          distance_km: distanceKm,
          directions_url: directionsUrl,
        };
      });

      // Filter within radius
      const withinRadius = searchRadius > 0
        ? calculated.filter((r) => r.distance_km <= searchRadius)
        : calculated;

      // Sort nearest first
      withinRadius.sort((a, b) => a.distance_km - b.distance_km);

      const limited = withinRadius.slice(0, Number(limit));

      // Log spatial search query
      try {
        geospatialDb.prepare(`
          INSERT INTO spatial_search_logs (id, query_latitude, query_longitude, radius_km, category, results_count)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(`log_${Date.now()}`, userLat, userLng, searchRadius, (category as string) || 'all', limited.length);
      } catch {
        // ignore log error
      }

      res.json({
        user_location: { latitude: userLat, longitude: userLng },
        radius_km: searchRadius,
        total_found: withinRadius.length,
        results: limited,
      });
    } catch (err: any) {
      res.status(502).json({ error: 'Failed to communicate with Resource Service: ' + err.message });
    }
  }

  static getDistricts(req: Request, res: Response): void {
    const districts = geospatialDb.prepare('SELECT * FROM district_coordinates ORDER BY district_name ASC').all();
    res.json({ districts });
  }

  static calculateDistance(req: Request, res: Response): void {
    const { from_lat, from_lng, to_lat, to_lng } = req.body;
    if (from_lat === undefined || from_lng === undefined || to_lat === undefined || to_lng === undefined) {
      res.status(400).json({ error: 'from_lat, from_lng, to_lat, to_lng are required' });
      return;
    }

    const distance = calculateHaversineDistance(Number(from_lat), Number(from_lng), Number(to_lat), Number(to_lng));
    const directionsUrl = generateOsmDirectionsUrl(Number(from_lat), Number(from_lng), Number(to_lat), Number(to_lng));

    res.json({
      distance_km: distance,
      directions_url: directionsUrl,
    });
  }
}
