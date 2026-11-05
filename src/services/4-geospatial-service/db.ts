import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const geospatialDb = new Database(path.join(dataDir, 'geospatial_service.db'));
geospatialDb.pragma('journal_mode = WAL');

geospatialDb.exec(`
  CREATE TABLE IF NOT EXISTS district_coordinates (
    id TEXT PRIMARY KEY,
    district_name TEXT UNIQUE NOT NULL,
    province TEXT NOT NULL,
    center_latitude REAL NOT NULL,
    center_longitude REAL NOT NULL,
    emergency_hub_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS spatial_search_logs (
    id TEXT PRIMARY KEY,
    query_latitude REAL NOT NULL,
    query_longitude REAL NOT NULL,
    radius_km REAL NOT NULL,
    category TEXT,
    results_count INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export function seedGeospatialData() {
  const count = (geospatialDb.prepare('SELECT count(*) as count FROM district_coordinates').get() as { count: number }).count;
  if (count > 0) return;

  const districts = [
    { id: 'dst_cmb', district_name: 'Colombo', province: 'Western', center_latitude: 6.9271, center_longitude: 79.8612, emergency_hub_phone: '+94 11 213 6136' },
    { id: 'dst_gmp', district_name: 'Gampaha', province: 'Western', center_latitude: 7.0840, center_longitude: 80.0098, emergency_hub_phone: '+94 33 222 2235' },
    { id: 'dst_klt', district_name: 'Kalutara', province: 'Western', center_latitude: 6.5854, center_longitude: 79.9607, emergency_hub_phone: '+94 34 222 2235' },
    { id: 'dst_knd', district_name: 'Kandy', province: 'Central', center_latitude: 7.2906, center_longitude: 80.6337, emergency_hub_phone: '+94 81 223 4455' },
    { id: 'dst_gll', district_name: 'Galle', province: 'Southern', center_latitude: 6.0535, center_longitude: 80.2210, emergency_hub_phone: '+94 91 223 4567' },
    { id: 'dst_rtn', district_name: 'Ratnapura', province: 'Sabaragamuwa', center_latitude: 6.6828, center_longitude: 80.4034, emergency_hub_phone: '+94 45 222 2235' },
    { id: 'dst_jfn', district_name: 'Jaffna', province: 'Northern', center_latitude: 9.6615, center_longitude: 80.0255, emergency_hub_phone: '+94 21 222 2235' }
  ];

  const insert = geospatialDb.prepare(`
    INSERT INTO district_coordinates (id, district_name, province, center_latitude, center_longitude, emergency_hub_phone)
    VALUES (@id, @district_name, @province, @center_latitude, @center_longitude, @emergency_hub_phone)
  `);

  for (const d of districts) {
    insert.run(d);
  }
}
