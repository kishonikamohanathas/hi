import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const analyticsDb = new Database(path.join(dataDir, 'analytics_service.db'));
analyticsDb.pragma('journal_mode = WAL');

analyticsDb.exec(`
  CREATE TABLE IF NOT EXISTS platform_snapshots (
    id TEXT PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    total_users INTEGER NOT NULL,
    total_resources INTEGER NOT NULL,
    total_emergencies INTEGER NOT NULL,
    resolved_emergencies INTEGER NOT NULL,
    total_allocations INTEGER NOT NULL,
    response_rate_percent REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS district_monthly_stats (
    id TEXT PRIMARY KEY,
    district TEXT NOT NULL,
    month_year TEXT NOT NULL,
    incident_count INTEGER NOT NULL,
    supplies_delivered INTEGER NOT NULL
  );
`);

export function seedAnalyticsData() {
  const count = (analyticsDb.prepare('SELECT count(*) as count FROM platform_snapshots').get() as { count: number }).count;
  if (count > 0) return;

  const snapshots = [
    { id: 'snp_01', snapshot_date: '2026-10-01', total_users: 38, total_resources: 6, total_emergencies: 3, resolved_emergencies: 2, total_allocations: 2, response_rate_percent: 66.7 },
    { id: 'snp_02', snapshot_date: '2026-11-01', total_users: 48, total_resources: 8, total_emergencies: 4, resolved_emergencies: 3, total_allocations: 4, response_rate_percent: 75.0 },
  ];

  const insert = analyticsDb.prepare(`
    INSERT INTO platform_snapshots (id, snapshot_date, total_users, total_resources, total_emergencies, resolved_emergencies, total_allocations, response_rate_percent)
    VALUES (@id, @snapshot_date, @total_users, @total_resources, @total_emergencies, @resolved_emergencies, @total_allocations, @response_rate_percent)
  `);

  for (const s of snapshots) {
    insert.run(s);
  }
}
