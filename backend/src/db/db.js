import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = config.dbPath || path.resolve(__dirname, '../../cctv_tracker.db');

export function getDatabase(customPath) {
  const targetPath = customPath || dbPath;
  const db = new Database(targetPath);
  
  // Pragmas for performance and referential integrity
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  return db;
}

// Default singleton database instance
export const db = getDatabase();

export default db;
