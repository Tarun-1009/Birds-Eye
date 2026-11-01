/**
 * Database Initializer Script
 * Creates data/cctv_tracker.db matching the PRD specification:
 * - cameras (camera_id, name, video_path, location, status)
 * - global_identities (global_id, entity_type, label, first_seen_camera, first_seen_timestamp, dominant_color)
 * - sightings (id, camera_id, timestamp_sec, global_id, entity_type, local_track_id, frame_index, confidence, orientation, bbox_*, crop_path, carried_items)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from './db.js';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initializeDatabase(customDbPath) {
  const targetDbPath = customDbPath || config.dbPath || path.resolve(__dirname, '../../../data/cctv_tracker.db');
  console.log(`[Database Init] Initializing SQLite database at: ${targetDbPath}`);

  const db = getDatabase(targetDbPath);

  // 1. Cameras Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      camera_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      video_path TEXT NOT NULL,
      location TEXT,
      status TEXT DEFAULT 'ONLINE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Global Identities Table (Cross-camera Target Re-Identification)
  db.exec(`
    CREATE TABLE IF NOT EXISTS global_identities (
      global_id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,           -- 'person' or 'object'
      label TEXT,
      first_seen_camera TEXT NOT NULL,
      first_seen_timestamp REAL NOT NULL,
      dominant_color TEXT,
      reference_image_url TEXT,
      total_sightings INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Sightings Table (Detections with orientations FRONT, BACK, LEFT, RIGHT, N/A)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sightings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camera_id TEXT NOT NULL,
      timestamp_sec REAL NOT NULL,
      global_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      local_track_id INTEGER,
      frame_index INTEGER,
      timestamp TEXT,
      confidence REAL NOT NULL,
      orientation TEXT NOT NULL CHECK(orientation IN ('FRONT', 'BACK', 'LEFT', 'RIGHT', 'N/A')),
      bbox_x REAL NOT NULL,
      bbox_y REAL NOT NULL,
      bbox_w REAL NOT NULL,
      bbox_h REAL NOT NULL,
      bev_x REAL,
      bev_y REAL,
      crop_path TEXT,
      carried_items TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE,
      FOREIGN KEY(global_id) REFERENCES global_identities(global_id) ON DELETE SET NULL
    );
  `);

  // Indexes for query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sightings_camera_id ON sightings(camera_id);
    CREATE INDEX IF NOT EXISTS idx_sightings_global_id ON sightings(global_id);
    CREATE INDEX IF NOT EXISTS idx_sightings_orientation ON sightings(orientation);
    CREATE INDEX IF NOT EXISTS idx_sightings_timestamp ON sightings(timestamp_sec);
  `);

  console.log('[Database Init] Successfully ensured tables: cameras, global_identities, sightings.');
  return db;
}

// Auto-run if executed directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase();
}
