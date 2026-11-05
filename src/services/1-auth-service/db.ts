import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const authDb = new Database(path.join(dataDir, 'auth_service.db'));
authDb.pragma('journal_mode = WAL');

authDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('citizen', 'provider', 'coordinator', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending_verification', 'suspended')),
    district TEXT,
    address TEXT,
    organization_name TEXT,
    verification_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_auth_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_auth_users_role ON users(role);
`);

export function seedAuthData() {
  const count = (authDb.prepare('SELECT count(*) as count FROM users').get() as { count: number }).count;
  if (count > 0) return;

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password123!', salt);

  const seedUsers = [
    {
      id: 'usr_admin_01',
      full_name: 'Dr. Aruni Bandara',
      email: 'admin@georesq.org',
      phone: '+94 77 123 4567',
      password_hash: passwordHash,
      role: 'admin',
      status: 'active',
      district: 'Colombo',
      address: 'Disaster Management Centre, Vidya Mawatha, Colombo 07',
      organization_name: 'National Disaster Relief Command',
    },
    {
      id: 'usr_coord_01',
      full_name: 'Kavinda Perera',
      email: 'coordinator@georesq.org',
      phone: '+94 71 888 2345',
      password_hash: passwordHash,
      role: 'coordinator',
      status: 'active',
      district: 'Colombo',
      address: 'Emergency Response Hub 4, Baseline Rd, Colombo 09',
      organization_name: 'Western Province Emergency Action Team',
    },
    {
      id: 'usr_prov_01',
      full_name: 'Apex Relief Logistics (Pvt) Ltd',
      email: 'provider@georesq.org',
      phone: '+94 11 250 8900',
      password_hash: passwordHash,
      role: 'provider',
      status: 'active',
      district: 'Colombo',
      address: 'Warehouse Complex 12, Kelaniya, Colombo Outer',
      organization_name: 'Apex Humanitarian Supplies',
    },
    {
      id: 'usr_cit_01',
      full_name: 'Sunil Weerasinghe',
      email: 'citizen@georesq.org',
      phone: '+94 76 543 9012',
      password_hash: passwordHash,
      role: 'citizen',
      status: 'active',
      district: 'Gampaha',
      address: '45 Temple Road, Ja-Ela, Gampaha',
      organization_name: 'Community Resident',
    },
    {
      id: 'usr_prov_02',
      full_name: 'Lanka Life Blood Bank & Medical Depot',
      email: 'medsupplies@lankalife.lk',
      phone: '+94 81 223 4455',
      password_hash: passwordHash,
      role: 'provider',
      status: 'active',
      district: 'Kandy',
      address: 'Peradeniya Road, Kandy Central',
      organization_name: 'Central Province Health Logistics',
    }
  ];

  const insert = authDb.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, role, status, district, address, organization_name)
    VALUES (@id, @full_name, @email, @phone, @password_hash, @role, @status, @district, @address, @organization_name)
  `);

  for (const u of seedUsers) {
    insert.run(u);
  }
}
