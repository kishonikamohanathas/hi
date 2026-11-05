import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const resourceDb = new Database(path.join(dataDir, 'resource_service.db'));
resourceDb.pragma('journal_mode = WAL');

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

  CREATE INDEX IF NOT EXISTS idx_res_category ON resources(category);
  CREATE INDEX IF NOT EXISTS idx_res_district ON resources(district);
  CREATE INDEX IF NOT EXISTS idx_res_provider ON resources(provider_id);
`);

export function seedResourceData() {
  const catCount = (resourceDb.prepare('SELECT count(*) as count FROM categories').get() as { count: number }).count;
  if (catCount === 0) {
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
  }

  const resCount = (resourceDb.prepare('SELECT count(*) as count FROM resources').get() as { count: number }).count;
  if (resCount === 0) {
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
  }
}
