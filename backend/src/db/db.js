import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getDatabase(customPath) {
  const targetPath = customPath || config.dbPath || path.resolve(__dirname, '../../../data/cctv_tracker.db');
  
  // Ensure target directory exists
  const parentDir = path.dirname(targetPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const db = new Database(targetPath);
  
  // WAL mode for non-blocking concurrent reads and writes
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  return db;
}

// Default singleton database instance
export const db = getDatabase();

export default db;
