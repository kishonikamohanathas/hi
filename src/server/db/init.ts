import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Independent SQLite database instances for modular service boundaries
export const authDb = new Database(path.join(dataDir, 'auth_service.db'));
export const resourceDb = new Database(path.join(dataDir, 'resource_service.db'));
export const emergencyDb = new Database(path.join(dataDir, 'emergency_service.db'));
export const allocationDb = new Database(path.join(dataDir, 'allocation_service.db'));
export const notificationDb = new Database(path.join(dataDir, 'notification_service.db'));

// Configure SQLite for high performance and WAL mode
for (const db of [authDb, resourceDb, emergencyDb, allocationDb, notificationDb]) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

export function initializeDatabases() {
  // 1. Auth Service DB: Users & Profiles
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

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  // 2. Resource Service DB: Resources & Categories
  resourceDb.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      description TEXT,
      urgency_level TEXT DEFAULT 'medium'
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      provider_phone TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      quantity REAL NOT NULL,
      original_quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      price REAL DEFAULT 0,
      resource_type TEXT NOT NULL CHECK(resource_type IN ('free', 'paid')),
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      district TEXT NOT NULL,
      address TEXT,
      availability TEXT NOT NULL DEFAULT 'available' CHECK(availability IN ('available', 'reserved', 'exhausted', 'pending_approval')),
      is_approved INTEGER DEFAULT 1,
      expiry_date TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
    CREATE INDEX IF NOT EXISTS idx_resources_district ON resources(district);
    CREATE INDEX IF NOT EXISTS idx_resources_provider ON resources(provider_id);
    CREATE INDEX IF NOT EXISTS idx_resources_coords ON resources(latitude, longitude);
  `);

  // 3. Emergency Service DB: Incidents, Triage, Shelters, Volunteers
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
    CREATE INDEX IF NOT EXISTS idx_emergencies_priority ON emergencies(priority);
    CREATE INDEX IF NOT EXISTS idx_emergencies_coords ON emergencies(latitude, longitude);
  `);

  // 4. Allocation Service DB: Resource allocations and audit logs
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

    CREATE INDEX IF NOT EXISTS idx_allocations_emergency ON allocations(emergency_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_resource ON allocations(resource_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_provider ON allocations(provider_id);
  `);

  // 5. Notification Service DB
  notificationDb.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      notification_type TEXT NOT NULL CHECK(notification_type IN ('emergency_alert', 'request_update', 'allocation_update', 'provider_status', 'system')),
      reference_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = authDb.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password123!', salt);

  // Pre-seed 4 distinct user accounts for testing all roles
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

  const insertUser = authDb.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, role, status, district, address, organization_name)
    VALUES (@id, @full_name, @email, @phone, @password_hash, @role, @status, @district, @address, @organization_name)
  `);

  for (const u of seedUsers) {
    insertUser.run(u);
  }

  // Pre-seed Resource Categories
  const categories = [
    { id: 'cat_food', name: 'Food & Drinking Water', slug: 'food-water', icon: 'Utensils', description: 'Clean drinking water bottles, non-perishable canned food, and dry rations.', urgency_level: 'critical' },
    { id: 'cat_med', name: 'Medicines & Medical Supplies', slug: 'medicines-medical', icon: 'Pill', description: 'First aid kits, antibiotics, insulin, surgical bandages, and IV fluids.', urgency_level: 'critical' },
    { id: 'cat_blood', name: 'Blood Donation & Blood Banks', slug: 'blood-donation', icon: 'HeartHandshake', description: 'O-Negative, A+, B+ units, rapid donor registry, and cold-chain blood packs.', urgency_level: 'critical' },
    { id: 'cat_shelter', name: 'Emergency Shelters', slug: 'emergency-shelters', icon: 'Home', description: 'Indoor community centers, weatherproof tents, mobile bedding, and sanitation units.', urgency_level: 'high' },
    { id: 'cat_rescue', name: 'Rescue & Transport', slug: 'rescue-transport', icon: 'Truck', description: 'Flat-bottom rescue inflatable boats, 4x4 high-clearance trucks, and ambulances.', urgency_level: 'critical' },
    { id: 'cat_cloth', name: 'Clothing & Essential Supplies', slug: 'clothing-supplies', icon: 'Shirt', description: 'Thermal blankets, waterproof tarpaulins, infant clothing, and hygiene packs.', urgency_level: 'medium' },
    { id: 'cat_vol', name: 'Volunteers & Skilled Crews', slug: 'volunteers', icon: 'Users', description: 'Paramedics, structural search teams, boat handlers, and community cooks.', urgency_level: 'high' },
    { id: 'cat_equip', name: 'Generators & Power Units', slug: 'generators-power', icon: 'Zap', description: 'Heavy-duty diesel generators, solar satellite lamps, and water purification pumps.', urgency_level: 'high' }
  ];

  const insertCat = resourceDb.prepare(`
    INSERT INTO categories (id, name, slug, icon, description, urgency_level)
    VALUES (@id, @name, @slug, @icon, @description, @urgency_level)
  `);

  for (const c of categories) {
    insertCat.run(c);
  }

  // Pre-seed Resources across Sri Lankan districts (realistic coordinates)
  // Colombo: ~6.9271, 79.8612
  // Gampaha: ~7.0917, 79.9999
  // Kandy: ~7.2906, 80.6337
  // Galle: ~6.0535, 80.2210
  // Ratnapura: ~6.6828, 80.4034
  const seedResources = [
    {
      id: 'res_01',
      provider_id: 'usr_prov_01',
      provider_name: 'Apex Relief Logistics (Pvt) Ltd',
      provider_phone: '+94 11 250 8900',
      name: 'Packaged 5L Mineral Drinking Water Bottles',
      category: 'Food & Drinking Water',
      description: 'Sterile seal-packed 5L mineral drinking water bottles ready for high-density flood and disaster relief delivery.',
      quantity: 1250,
      original_quantity: 1500,
      unit: 'Bottles (5L)',
      price: 0,
      resource_type: 'free',
      latitude: 6.9538,
      longitude: 79.9164,
      district: 'Colombo',
      address: 'Apex Logistics Hub, Kelaniya Industrial Zone, Colombo Outer',
      availability: 'available',
      is_approved: 1,
      expiry_date: '2027-12-31',
      image_url: '/src/assets/images/relief_supply_distribution_1793849399746.jpg'
    },
    {
      id: 'res_02',
      provider_id: 'usr_prov_01',
      provider_name: 'Apex Relief Logistics (Pvt) Ltd',
      provider_phone: '+94 11 250 8900',
      name: 'Family Dry Food Ration Packs (7-Day Sustenance)',
      category: 'Food & Drinking Water',
      description: 'Vacuum-sealed food kit containing 5kg rice, dhal, sugar, tea, canned fish, and energy biscuits for a family of 4.',
      quantity: 480,
      original_quantity: 600,
      unit: 'Boxes',
      price: 0,
      resource_type: 'free',
      latitude: 6.9480,
      longitude: 79.8820,
      district: 'Colombo',
      address: 'Orugodawatta Supply Depot, Colombo',
      availability: 'available',
      is_approved: 1,
      expiry_date: '2027-06-30',
      image_url: '/src/assets/images/relief_supply_distribution_1793849399746.jpg'
    },
    {
      id: 'res_03',
      provider_id: 'usr_prov_02',
      provider_name: 'Lanka Life Blood Bank & Medical Depot',
      provider_phone: '+94 81 223 4455',
      name: 'Emergency Trauma & First Aid Triage Kits',
      category: 'Medicines & Medical Supplies',
      description: 'Sterile field dressings, tourniquets, burn gel, antiseptics, trauma shears, and resuscitation masks.',
      quantity: 180,
      original_quantity: 200,
      unit: 'Kits',
      price: 2500,
      resource_type: 'paid',
      latitude: 6.9147,
      longitude: 79.8732,
      district: 'Colombo',
      address: 'National Hospital Medical Annex, Regent St, Colombo 08',
      availability: 'available',
      is_approved: 1,
      expiry_date: '2028-01-15',
      image_url: '/src/assets/images/medical_emergency_response_1793849400628.jpg'
    },
    {
      id: 'res_04',
      provider_id: 'usr_prov_02',
      provider_name: 'Lanka Life Blood Bank & Medical Depot',
      provider_phone: '+94 81 223 4455',
      name: 'O-Negative Rare Universal Blood Units',
      category: 'Blood Donation & Blood Banks',
      description: 'Certified cold-chain stored emergency units of O-Negative red blood cells ready for immediate dispatch.',
      quantity: 35,
      original_quantity: 40,
      unit: 'Units (450ml)',
      price: 0,
      resource_type: 'free',
      latitude: 6.9034,
      longitude: 79.8710,
      district: 'Colombo',
      address: 'Narahenpita Central Blood Transfusion Bank, Colombo 05',
      availability: 'available',
      is_approved: 1,
      expiry_date: '2026-12-10',
      image_url: '/src/assets/images/medical_emergency_response_1793849400628.jpg'
    },
    {
      id: 'res_05',
      provider_id: 'usr_prov_01',
      provider_name: 'Apex Relief Logistics (Pvt) Ltd',
      provider_phone: '+94 11 250 8900',
      name: 'Rigid Inflatable Flood Rescue Boats with 25HP Outboard Motor',
      category: 'Rescue & Transport',
      description: 'Heavy duty shallow-water rescue boats with life jackets, throw bags, and fuel capacity for submerged urban corridors.',
      quantity: 6,
      original_quantity: 8,
      unit: 'Boats',
      price: 0,
      resource_type: 'free',
      latitude: 6.9602,
      longitude: 79.8711,
      district: 'Colombo',
      address: 'Peliyagoda Riverfront Staging Dock, Colombo',
      availability: 'available',
      is_approved: 1,
      expiry_date: '',
      image_url: '/src/assets/images/hero_emergency_operations_1793849399735.jpg'
    },
    {
      id: 'res_06',
      provider_id: 'usr_prov_01',
      provider_name: 'Apex Relief Logistics (Pvt) Ltd',
      provider_phone: '+94 11 250 8900',
      name: 'Heavy Duty Waterproof Tarpaulins & Disaster Blankets',
      category: 'Clothing & Essential Supplies',
      description: 'UV-resistant 18x12ft heavy duty eyeleted tarpaulins and thermal fleece disaster relief blankets.',
      quantity: 850,
      original_quantity: 1000,
      unit: 'Sets',
      price: 1200,
      resource_type: 'paid',
      latitude: 7.0873,
      longitude: 79.9922,
      district: 'Gampaha',
      address: 'Gampaha Town Community Warehouse, Station Rd',
      availability: 'available',
      is_approved: 1,
      expiry_date: '',
      image_url: '/src/assets/images/rescue_shelter_support_1793849400915.jpg'
    },
    {
      id: 'res_07',
      provider_id: 'usr_prov_02',
      provider_name: 'Lanka Life Blood Bank & Medical Depot',
      provider_phone: '+94 81 223 4455',
      name: 'Portable 7.5kVA Silent Diesel Generator with Power Distribution Hub',
      category: 'Generators & Power Units',
      description: 'Field generators capable of powering critical mobile ICU monitors, water pumps, and emergency floodlights.',
      quantity: 5,
      original_quantity: 6,
      unit: 'Generators',
      price: 0,
      resource_type: 'free',
      latitude: 7.2906,
      longitude: 80.6337,
      district: 'Kandy',
      address: 'Peradeniya Engineering Base, Kandy',
      availability: 'available',
      is_approved: 1,
      expiry_date: '',
      image_url: '/src/assets/images/hero_emergency_operations_1793849399735.jpg'
    },
    {
      id: 'res_08',
      provider_id: 'usr_prov_01',
      provider_name: 'Apex Relief Logistics (Pvt) Ltd',
      provider_phone: '+94 11 250 8900',
      name: 'All-Terrain 4x4 Emergency Logistics Supply Truck (3-Ton)',
      category: 'Rescue & Transport',
      description: 'High-axle 4x4 transport vehicle capable of fording up to 1.1m flood waters with experienced relief driver.',
      quantity: 3,
      original_quantity: 4,
      unit: 'Trucks',
      price: 0,
      resource_type: 'free',
      latitude: 6.6828,
      longitude: 80.4034,
      district: 'Ratnapura',
      address: 'Ratnapura Town Council Depot, Main St',
      availability: 'available',
      is_approved: 1,
      expiry_date: '',
      image_url: '/src/assets/images/hero_emergency_operations_1793849399735.jpg'
    }
  ];

  const insertResource = resourceDb.prepare(`
    INSERT INTO resources (
      id, provider_id, provider_name, provider_phone, name, category, description,
      quantity, original_quantity, unit, price, resource_type, latitude, longitude,
      district, address, availability, is_approved, expiry_date, image_url
    ) VALUES (
      @id, @provider_id, @provider_name, @provider_phone, @name, @category, @description,
      @quantity, @original_quantity, @unit, @price, @resource_type, @latitude, @longitude,
      @district, @address, @availability, @is_approved, @expiry_date, @image_url
    )
  `);

  for (const r of seedResources) {
    insertResource.run(r);
  }

  // Pre-seed Emergency Incidents
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

  // Pre-seed Shelters
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

  const insertShelter = emergencyDb.prepare(`
    INSERT INTO shelters (id, name, district, latitude, longitude, capacity, occupancy, contact_person, contact_phone, status, facilities)
    VALUES (@id, @name, @district, @latitude, @longitude, @capacity, @occupancy, @contact_person, @contact_phone, @status, @facilities)
  `);

  for (const s of seedShelters) {
    insertShelter.run(s);
  }

  // Pre-seed Volunteers
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

  const insertVol = emergencyDb.prepare(`
    INSERT INTO volunteers (id, user_id, name, phone, skills, district, latitude, longitude, availability_status, assigned_emergency_id)
    VALUES (@id, @user_id, @name, @phone, @skills, @district, @latitude, @longitude, @availability_status, @assigned_emergency_id)
  `);

  for (const v of seedVolunteers) {
    insertVol.run(v);
  }

  // Pre-seed Resource Allocations
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

  // Pre-seed Notifications
  const seedNotifs = [
    {
      id: 'notif_01',
      user_id: 'usr_cit_01',
      title: 'Emergency Request Verified & In Progress',
      message: 'Your emergency assistance report #emg_01 (Flood in Kotikawatta) has been verified by Coordinator Kavinda Perera. 250 units of Drinking Water have been allocated and are en route.',
      notification_type: 'emergency_alert',
      reference_id: 'emg_01',
      is_read: 0
    },
    {
      id: 'notif_02',
      user_id: 'usr_prov_01',
      title: 'Resource Allocation Approved',
      message: 'Coordinator Kavinda Perera allocated 250 units of Packaged 5L Mineral Drinking Water for Emergency #emg_01. Inventory has been updated automatically.',
      notification_type: 'allocation_update',
      reference_id: 'alc_01',
      is_read: 0
    },
    {
      id: 'notif_03',
      user_id: 'usr_coord_01',
      title: 'New Critical Incident Reported',
      message: 'A critical medical emergency #emg_02 has been reported in Dematagoda. Triage review required.',
      notification_type: 'emergency_alert',
      reference_id: 'emg_02',
      is_read: 0
    }
  ];

  const insertNotif = notificationDb.prepare(`
    INSERT INTO notifications (id, user_id, title, message, notification_type, reference_id, is_read)
    VALUES (@id, @user_id, @title, @message, @notification_type, @reference_id, @is_read)
  `);

  for (const n of seedNotifs) {
    insertNotif.run(n);
  }
}
