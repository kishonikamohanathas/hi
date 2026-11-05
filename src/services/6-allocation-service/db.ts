import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const allocationDb = new Database(path.join(dataDir, 'allocation_service.db'));
allocationDb.pragma('journal_mode = WAL');

allocationDb.exec(`
  CREATE TABLE IF NOT EXISTS allocations (
    id TEXT PRIMARY KEY,
    emergency_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    coordinator_id TEXT,
    coordinator_name TEXT,
    allocated_quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    distance_km REAL,
    status TEXT NOT NULL DEFAULT 'allocated' CHECK(status IN ('pending', 'approved', 'allocated', 'in_transit', 'delivered', 'completed', 'cancelled', 'rejected')),
    notes TEXT,
    allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_alc_emergency ON allocations(emergency_id);
  CREATE INDEX IF NOT EXISTS idx_alc_resource ON allocations(resource_id);
  CREATE INDEX IF NOT EXISTS idx_alc_provider ON allocations(provider_id);
`);

export function seedAllocationData() {
  const count = (allocationDb.prepare('SELECT count(*) as count FROM allocations').get() as { count: number }).count;
  if (count > 0) return;

  const seedAllocations = [
    {
      id: 'alc_01',
      emergency_id: 'emg_01',
      resource_id: 'res_01',
      resource_name: 'Packaged 5L Mineral Drinking Water Bottles',
      provider_id: 'usr_prov_01',
      provider_name: 'Apex Relief Logistics (Pvt) Ltd',
      requester_id: 'usr_cit_01',
      requester_name: 'Sunil Weerasinghe',
      coordinator_id: 'usr_coord_01',
      coordinator_name: 'Kavinda Perera',
      allocated_quantity: 250,
      unit: 'Bottles (5L)',
      distance_km: 1.2,
      status: 'in_transit',
      notes: 'Dispatched via convoy unit Alpha-4 with police escort.'
    },
    {
      id: 'alc_02',
      emergency_id: 'emg_02',
      resource_id: 'res_03',
      resource_name: 'Emergency Trauma & First Aid Triage Kits',
      provider_id: 'usr_prov_02',
      provider_name: 'Lanka Life Blood Bank & Medical Depot',
      requester_id: 'usr_cit_01',
      requester_name: 'Dr. T. Jayawardena (Community Clinic)',
      coordinator_id: 'usr_coord_01',
      coordinator_name: 'Kavinda Perera',
      allocated_quantity: 20,
      unit: 'Kits',
      distance_km: 0.8,
      status: 'delivered',
      notes: 'Delivered directly to clinic receiving nurse.'
    }
  ];

  const insertAlc = allocationDb.prepare(`
    INSERT INTO allocations (
      id, emergency_id, resource_id, resource_name, provider_id, provider_name,
      requester_id, requester_name, coordinator_id, coordinator_name,
      allocated_quantity, unit, distance_km, status, notes
    ) VALUES (
      @id, @emergency_id, @resource_id, @resource_name, @provider_id, @provider_name,
      @requester_id, @requester_name, @coordinator_id, @coordinator_name,
      @allocated_quantity, @unit, @distance_km, @status, @notes
    )
  `);

  for (const a of seedAllocations) {
    insertAlc.run(a);
  }

  // Initial audit log
  allocationDb.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
    VALUES ('aud_01', 'usr_coord_01', 'ALLOCATE_RESOURCE', 'ALLOCATION', 'alc_01', 'Allocated 250 units Drinking Water to Emergency #emg_01')
  `).run();
}
