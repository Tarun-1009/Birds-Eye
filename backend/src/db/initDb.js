/**
 * Database Initializer Script
 * Creates cctv_tracker.db with cameras, global_identities, and sightings tables.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from './db.js';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initializeDatabase(customDbPath) {
  const targetDbPath = customDbPath || config.dbPath || path.resolve(__dirname, '../../cctv_tracker.db');
  console.log(`[Database Init] Initializing SQLite database at: ${targetDbPath}`);

  const db = getDatabase(targetDbPath);

  // 1. Cameras Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      stream_url TEXT,
      orientation_coverage TEXT,
      status TEXT DEFAULT 'ONLINE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Global Identities Table (Cross-camera Target Re-Identification)
  db.exec(`
    CREATE TABLE IF NOT EXISTS global_identities (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      target_type TEXT DEFAULT 'Person',
      reference_image_url TEXT,
      first_seen DATETIME,
      last_seen DATETIME,
      total_sightings INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Sightings Table (Detections with orientations FRONT, BACK, LEFT, RIGHT)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sightings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camera_id TEXT NOT NULL,
      global_identity_id TEXT,
      local_track_id INTEGER NOT NULL,
      timestamp DATETIME NOT NULL,
      confidence REAL NOT NULL,
      orientation TEXT NOT NULL CHECK(orientation IN ('FRONT', 'BACK', 'LEFT', 'RIGHT')),
      bbox_x REAL NOT NULL,
      bbox_y REAL NOT NULL,
      bbox_w REAL NOT NULL,
      bbox_h REAL NOT NULL,
      bev_x REAL,
      bev_y REAL,
      crop_image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
      FOREIGN KEY (global_identity_id) REFERENCES global_identities(id) ON DELETE SET NULL
    );
  `);

  // Indexes for query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sightings_camera_id ON sightings(camera_id);
    CREATE INDEX IF NOT EXISTS idx_sightings_global_identity ON sightings(global_identity_id);
    CREATE INDEX IF NOT EXISTS idx_sightings_orientation ON sightings(orientation);
    CREATE INDEX IF NOT EXISTS idx_sightings_timestamp ON sightings(timestamp);
  `);

  console.log('[Database Init] Successfully created tables: cameras, global_identities, sightings.');
  return db;
}

// Auto-run if executed directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase();
}
