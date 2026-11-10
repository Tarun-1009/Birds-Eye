import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../config/index.js';
import {
  getHealth,
  getVideos,
  handleUpload,
  deleteVideo,
  runDetection,
  getDetectionStatus,
  getCameras,
  getSightings,
  getIdentities,
  getCropImage,
  streamVideo,
  clearAllVideos,
  getVideoThumbnail,
} from '../controllers/api.controller.js';

const VIDEOS_DIR = config.videosDir;

// Configure Multer storage to write directly to unified data/videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEOS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const cleanBase = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${cleanBase}-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1 GB max per file
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported video format: ${ext}. Allowed: ${allowedExts.join(', ')}`));
    }
  },
});

const router = Router();

// Health check
router.get('/health', getHealth);

// Video management (Dynamic N feeds)
router.get('/videos', getVideos);
router.post(
  '/upload',
  upload.fields([{ name: 'videos', maxCount: 32 }]),
  handleUpload
);
router.delete('/videos/all', clearAllVideos);
router.delete('/videos', clearAllVideos);
router.delete('/videos/:filename', deleteVideo);
router.get('/videos/thumbnail/:filename', getVideoThumbnail);

// AI Detection execution (Pure automatic discovery)
router.get('/detection/status', getDetectionStatus);
router.post('/detection/run', runDetection);
router.post('/detect', runDetection);

// Multi-camera & Surveillance tracking results
router.get('/cameras', getCameras);
router.get('/sightings', getSightings);
router.get('/identities', getIdentities);
router.get('/crops/:filename', getCropImage);
router.get('/videos/stream/:filename', streamVideo);
router.get('/video/:cameraId', streamVideo);

export default router;
