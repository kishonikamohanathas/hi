import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const shelterVolunteerDb = new Database(path.join(dataDir, 'shelter_volunteer_service.db'));
shelterVolunteerDb.pragma('journal_mode = WAL');

shelterVolunteerDb.exec(`
  CREATE TABLE IF NOT EXISTS shelters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    district TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    capacity INTEGER NOT NULL,
    occupancy INTEGER DEFAULT 0,
    contact_person TEXT,
    contact_phone TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'full', 'evacuating', 'closed')),
    facilities TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS volunteers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    skills TEXT NOT NULL,
    district TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    availability_status TEXT DEFAULT 'available' CHECK(availability_status IN ('available', 'deployed', 'off_duty')),
    assigned_emergency_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_shelters_district ON shelters(district);
  CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(availability_status);
`);

export function seedShelterVolunteerData() {
  const shelterCount = (shelterVolunteerDb.prepare('SELECT count(*) as count FROM shelters').get() as { count: number }).count;
  if (shelterCount === 0) {
    const seedShelters = [
      {
        id: 'shl_01',
        name: 'Sugathadasa Indoor Sports Complex Emergency Relief Center',
        district: 'Colombo',
        latitude: 6.9458,
        longitude: 79.8698,
        capacity: 650,
        occupancy: 280,
        contact_person: 'Major R. Wickramasinghe',
        contact_phone: '+94 11 243 1290',
        status: 'open',
        facilities: 'Backup Generators, Medical Clinic, Sanitized Showers, Kitchen, Secure Women/Children Wing'
      },
      {
        id: 'shl_02',
        name: 'Kelaniya Raja Maha Viharaya Community Refuge Hall',
        district: 'Colombo',
        latitude: 6.9530,
        longitude: 79.9190,
        capacity: 350,
        occupancy: 310,
        contact_person: 'H.M. Karunaratne',
        contact_phone: '+94 11 291 1844',
        status: 'open',
        facilities: 'Community Kitchen, Drinking Water Tank, First Aid Room'
      },
      {
        id: 'shl_03',
        name: 'Gampaha Municipal Council Indoor Gymnasium',
        district: 'Gampaha',
        latitude: 7.0890,
        longitude: 79.9980,
        capacity: 400,
        occupancy: 120,
        contact_person: 'S. Alwis',
        contact_phone: '+94 33 222 4589',
        status: 'open',
        facilities: 'Clean Beds, Restrooms, Hot Meals Service'
      }
    ];

    const insertShelter = shelterVolunteerDb.prepare(`
      INSERT INTO shelters (id, name, district, latitude, longitude, capacity, occupancy, contact_person, contact_phone, status, facilities)
      VALUES (@id, @name, @district, @latitude, @longitude, @capacity, @occupancy, @contact_person, @contact_phone, @status, @facilities)
    `);

    for (const s of seedShelters) {
      insertShelter.run(s);
    }
  }

  const volCount = (shelterVolunteerDb.prepare('SELECT count(*) as count FROM volunteers').get() as { count: number }).count;
  if (volCount === 0) {
    const seedVolunteers = [
      {
        id: 'vol_01',
        user_id: 'usr_cit_01',
        name: 'Pradeep Kumara',
        phone: '+94 77 345 6789',
        skills: 'Rescue Boat Operator, First Aid Certified, Swiftwater Rescue',
        district: 'Colombo',
        latitude: 6.948,
        longitude: 79.912,
        availability_status: 'deployed',
        assigned_emergency_id: 'emg_01'
      },
      {
        id: 'vol_02',
        user_id: 'usr_cit_01',
        name: 'Anjali Fernando',
        phone: '+94 71 678 1234',
        skills: 'Registered Nurse, Triage Assessment, Pediatric Care',
        district: 'Colombo',
        latitude: 6.921,
        longitude: 79.872,
        availability_status: 'deployed',
        assigned_emergency_id: 'emg_02'
      },
      {
        id: 'vol_03',
        user_id: 'usr_cit_01',
        name: 'Roshan De Silva',
        phone: '+94 76 999 4321',
        skills: 'Ham Radio Operator, 4WD Driver, Logistics Packing',
        district: 'Gampaha',
        latitude: 7.091,
        longitude: 80.001,
        availability_status: 'available',
        assigned_emergency_id: null
      }
    ];

    const insertVol = shelterVolunteerDb.prepare(`
      INSERT INTO volunteers (id, user_id, name, phone, skills, district, latitude, longitude, availability_status, assigned_emergency_id)
      VALUES (@id, @user_id, @name, @phone, @skills, @district, @latitude, @longitude, @availability_status, @assigned_emergency_id)
    `);

    for (const v of seedVolunteers) {
      insertVol.run(v);
    }
  }
}
