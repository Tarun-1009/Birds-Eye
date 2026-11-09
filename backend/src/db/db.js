import { DatabaseSync } from 'node:sqlite';
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

  const db = new DatabaseSync(targetPath);

  // Provide compatibility methods matching better-sqlite3
  db.pragma = (str) => db.exec(`PRAGMA ${str};`);
  db.transaction = (fn) => (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
  
  // WAL mode for non-blocking concurrent reads and writes
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  return db;
}

// Default singleton database instance
export const db = getDatabase();

export default db;
