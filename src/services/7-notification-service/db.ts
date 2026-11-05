import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const notificationDb = new Database(path.join(dataDir, 'notification_service.db'));
notificationDb.pragma('journal_mode = WAL');

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

  CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
`);

export function seedNotificationData() {
  const count = (notificationDb.prepare('SELECT count(*) as count FROM notifications').get() as { count: number }).count;
  if (count > 0) return;

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
