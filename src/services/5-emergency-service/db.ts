import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const emergencyDb = new Database(path.join(dataDir, 'emergency_service.db'));
emergencyDb.pragma('journal_mode = WAL');

emergencyDb.exec(`
  CREATE TABLE IF NOT EXISTS emergencies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    emergency_type TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('critical', 'high', 'medium', 'low')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    district TEXT NOT NULL,
    address TEXT,
    people_affected INTEGER DEFAULT 1,
    required_resources TEXT,
    status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported', 'under_review', 'verified', 'assigned', 'in_progress', 'resolved', 'closed')),
    assigned_coordinator_id TEXT,
    assigned_coordinator_name TEXT,
    triage_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS incident_timeline (
    id TEXT PRIMARY KEY,
    emergency_id TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_emg_status ON emergencies(status);
  CREATE INDEX IF NOT EXISTS idx_emg_priority ON emergencies(priority);
  CREATE INDEX IF NOT EXISTS idx_emg_coords ON emergencies(latitude, longitude);
`);

export function seedEmergencyData() {
  const count = (emergencyDb.prepare('SELECT count(*) as count FROM emergencies').get() as { count: number }).count;
  if (count > 0) return;

  const seedEmergencies = [
    {
      id: 'emg_01',
      user_id: 'usr_cit_01',
      requester_name: 'Sunil Weerasinghe',
      contact_phone: '+94 76 543 9012',
      emergency_type: 'Flood',
      description: 'Kelani river tributary overflow in Kotikawatta lowlands. 45 households stranded on second floor roofs with elderly and 12 children. Immediate drinking water, non-perishable food, and boat rescue required.',
      priority: 'critical',
      latitude: 6.9450,
      longitude: 79.9100,
      district: 'Colombo',
      address: 'Kotikawatta Lowland Canal Road, Colombo Outer',
      people_affected: 160,
      required_resources: 'Packaged 5L Mineral Drinking Water Bottles, Rigid Inflatable Flood Rescue Boats with 25HP Outboard Motor',
      status: 'verified',
      assigned_coordinator_id: 'usr_coord_01',
      assigned_coordinator_name: 'Kavinda Perera',
      triage_notes: 'Confirmed by local volunteer unit at 08:30. Water level rising 10cm/hr. Boat unit prioritized.'
    },
    {
      id: 'emg_02',
      user_id: 'usr_cit_01',
      requester_name: 'Dr. T. Jayawardena (Community Clinic)',
      contact_phone: '+94 71 334 5566',
      emergency_type: 'Medical Emergency',
      description: 'Field clinic triage treating 28 trauma patients and severe lacerations following structural wall collapse. Critically low on sterile surgical trauma kits and IV fluids.',
      priority: 'critical',
      latitude: 6.9200,
      longitude: 79.8700,
      district: 'Colombo',
      address: 'Dematagoda Junction Clinic, Colombo 09',
      people_affected: 28,
      required_resources: 'Emergency Trauma & First Aid Triage Kits',
      status: 'in_progress',
      assigned_coordinator_id: 'usr_coord_01',
      assigned_coordinator_name: 'Kavinda Perera',
      triage_notes: 'Urgent medical supply delivery dispatched from Lanka Life Depot.'
    },
    {
      id: 'emg_03',
      user_id: 'usr_cit_01',
      requester_name: 'Nimali Senanayake (Gramaseva Officer)',
      contact_phone: '+94 77 990 1122',
      emergency_type: 'Landslide',
      description: 'Minor hillside earth slip blocking access road to mountain hamlet. 85 families isolated with cut electrical lines. Generators and emergency shelter supplies needed.',
      priority: 'high',
      latitude: 6.6900,
      longitude: 80.4120,
      district: 'Ratnapura',
      address: 'Elapatha Hill Route, Ratnapura District',
      people_affected: 240,
      required_resources: 'Portable 7.5kVA Silent Diesel Generator with Power Distribution Hub, Heavy Duty Waterproof Tarpaulins & Disaster Blankets',
      status: 'under_review',
      assigned_coordinator_id: 'usr_coord_01',
      assigned_coordinator_name: 'Kavinda Perera',
      triage_notes: 'Assessing road clearing machinery with Road Development Authority.'
    },
    {
      id: 'emg_04',
      user_id: 'usr_cit_01',
      requester_name: 'Rev. Dhammaratana Thero',
      contact_phone: '+94 72 445 7788',
      emergency_type: 'Shelter Requirement',
      description: 'Temple community hall converted into impromptu emergency shelter accommodating 110 displaced residents from flooded low-lying lands. Blankets and dry rations exhausted.',
      priority: 'medium',
      latitude: 7.0950,
      longitude: 80.0100,
      district: 'Gampaha',
      address: 'Sri Bodhirajarama Viharaya, Ja-Ela Road, Gampaha',
      people_affected: 110,
      required_resources: 'Family Dry Food Ration Packs (7-Day Sustenance), Heavy Duty Waterproof Tarpaulins & Disaster Blankets',
      status: 'assigned',
      assigned_coordinator_id: 'usr_coord_01',
      assigned_coordinator_name: 'Kavinda Perera',
      triage_notes: 'Assigned to Apex Relief Logistics for 50 family food packs.'
    }
  ];

  const insertEmg = emergencyDb.prepare(`
    INSERT INTO emergencies (
      id, user_id, requester_name, contact_phone, emergency_type, description,
      priority, latitude, longitude, district, address, people_affected,
      required_resources, status, assigned_coordinator_id, assigned_coordinator_name, triage_notes
    ) VALUES (
      @id, @user_id, @requester_name, @contact_phone, @emergency_type, @description,
      @priority, @latitude, @longitude, @district, @address, @people_affected,
      @required_resources, @status, @assigned_coordinator_id, @assigned_coordinator_name, @triage_notes
    )
  `);

  for (const e of seedEmergencies) {
    insertEmg.run(e);
  }
}
