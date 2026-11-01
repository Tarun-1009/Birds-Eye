import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  dataDir: path.resolve(__dirname, '../../../data'),
  cropsDir: path.resolve(__dirname, '../../../data/crops'),
  videosDir: path.resolve(__dirname, '../../../data/videos'),
  dbPath: process.env.DATABASE_PATH || path.resolve(__dirname, '../../../data/cctv_tracker.db'),
};
