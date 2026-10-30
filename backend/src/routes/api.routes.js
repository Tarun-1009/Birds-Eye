import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getHealth,
  getVideos,
  handleUpload,
  deleteVideo,
  deleteTarget,
  runDetection,
  getCameras,
  getSightings,
  getIdentities,
} from '../controllers/api.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const TARGETS_DIR = path.join(UPLOADS_DIR, 'targets');

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'videos') {
      cb(null, VIDEOS_DIR);
    } else if (file.fieldname === 'target') {
      cb(null, TARGETS_DIR);
    } else {
      cb(new Error(`Unexpected field: ${file.fieldname}`));
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const cleanBase = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${cleanBase}-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max per file
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'videos') {
      const validVideoExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
      if (validVideoExts.includes(ext)) {
        return cb(null, true);
      }
      return cb(new Error(`Invalid video format for ${file.originalname}`));
    }
    if (file.fieldname === 'target') {
      const validImageExts = ['.jpg', '.jpeg', '.png', '.webp'];
      if (validImageExts.includes(ext)) {
        return cb(null, true);
      }
      return cb(new Error(`Invalid photo format for ${file.originalname}`));
    }
    cb(new Error(`Unknown upload field: ${file.fieldname}`));
  },
});

const uploadFields = upload.fields([
  { name: 'videos', maxCount: 20 },
  { name: 'target', maxCount: 1 },
]);

const router = Router();

// Surveillance Ingestion & Uploads
router.get('/health', getHealth);
router.get('/videos', getVideos);
router.post('/upload', uploadFields, handleUpload);
router.delete('/videos/:id', deleteVideo);
router.delete('/target', deleteTarget);
router.post('/detect', runDetection);

// CCTV Tracker SQLite Database Endpoints
router.get('/cameras', getCameras);
router.get('/sightings', getSightings);
router.get('/identities', getIdentities);

export default router;
