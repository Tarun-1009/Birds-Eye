import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import db from '../db/db.js';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Unified Directories - Single Source of Truth
const VIDEOS_DIR = config.videosDir; // data/videos
const CROPS_DIR = config.cropsDir;   // data/crops
const THUMBNAILS_DIR = path.resolve(config.dataDir, 'thumbnails');
const LEGACY_UPLOADS_DIR = path.resolve(__dirname, '../../uploads/videos');
const METADATA_FILE = path.resolve(config.dataDir, 'metadata.json');

// Ensure all required directories exist
[VIDEOS_DIR, CROPS_DIR, THUMBNAILS_DIR, LEGACY_UPLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper: Format file bytes
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper: Read persistent metadata
export function getMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read metadata.json:', err.message);
  }
  return { videos: [] };
}

// Helper: Save persistent metadata
export function saveMetadata(data) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write metadata.json:', err.message);
  }
}

// Helper: Synchronize physical video files in data/videos with the cameras table
export function syncCamerasWithUploadedVideos() {
  try {
    if (!fs.existsSync(VIDEOS_DIR)) return;
    
    // Check both VIDEOS_DIR and any leftovers in LEGACY_UPLOADS_DIR
    const legacyFiles = fs.existsSync(LEGACY_UPLOADS_DIR) 
      ? fs.readdirSync(LEGACY_UPLOADS_DIR).filter(f => !f.startsWith('.'))
      : [];
    
    // Migrate any legacy uploads into unified VIDEOS_DIR
    for (const lf of legacyFiles) {
      const src = path.join(LEGACY_UPLOADS_DIR, lf);
      const dest = path.join(VIDEOS_DIR, lf);
      if (!fs.existsSync(dest)) {
        try { fs.renameSync(src, dest); } catch (e) {}
      } else {
        try { fs.unlinkSync(src); } catch (e) {}
      }
    }

    const files = fs.readdirSync(VIDEOS_DIR).filter((f) => !f.startsWith('.'));

    // Remove camera entries whose video file no longer exists
    const allCams = db.prepare(`SELECT * FROM cameras`).all();
    for (const cam of allCams) {
      const base = path.basename(cam.video_path);
      if (!files.includes(base)) {
        db.prepare(`DELETE FROM sightings WHERE camera_id = ?`).run(cam.camera_id);
        db.prepare(`DELETE FROM cameras WHERE camera_id = ?`).run(cam.camera_id);
      }
    }

    // Register active cameras for ALL uploaded videos dynamically (no 4-video limit)
    files.forEach((file, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const camId = `cam_${num}`;
      const name = `Camera ${idx + 1}`;
      const videoRelPath = `data/videos/${file}`;

      const existing = db.prepare(`SELECT * FROM cameras WHERE video_path LIKE ?`).get(`%${file}%`);
      if (existing) {
        db.prepare(`UPDATE cameras SET video_path = ?, name = ?, status = 'ONLINE' WHERE camera_id = ?`).run(
          videoRelPath,
          name,
          existing.camera_id
        );
      } else {
        db.prepare(`INSERT INTO cameras (camera_id, name, video_path, location, status) VALUES (?, ?, ?, ?, ?)`).run(
          camId,
          name,
          videoRelPath,
          `Zone ${idx + 1}`,
          'ONLINE'
        );
      }
    });

    // Clean orphan identities
    db.prepare(`DELETE FROM global_identities WHERE global_id NOT IN (SELECT DISTINCT global_id FROM sightings)`).run();
  } catch (err) {
    console.error('Failed to sync cameras table:', err);
  }
}

// Initial camera sync
syncCamerasWithUploadedVideos();

// GET /api/health
export async function getHealth(req, res) {
  return res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    mode: 'production-clean',
  });
}

// GET /api/videos
export async function getVideos(req, res) {
  try {
    syncCamerasWithUploadedVideos();
    const meta = getMetadata();
    const diskVideos = [];

    if (fs.existsSync(VIDEOS_DIR)) {
      const files = fs.readdirSync(VIDEOS_DIR);
      for (const file of files) {
        if (file.startsWith('.')) continue;
        const filePath = path.join(VIDEOS_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const known = meta.videos.find((v) => v.filename === file);
          const cleanBase = path.parse(file).name;
          diskVideos.push({
            id: file, // Use actual filename as identifier to prevent mismatch bugs
            filename: file,
            originalName: known?.originalName || file,
            size: stat.size,
            formattedSize: formatBytes(stat.size),
            uploadedAt: known?.uploadedAt || stat.mtime.toISOString(),
            streamUrl: `/api/videos/stream/${file}`,
            thumbnailUrl: `/api/videos/thumbnail/${file}`,
          });
        }
      }
    }

    return res.json({
      success: true,
      videos: diskVideos,
    });
  } catch (err) {
    console.error('Error fetching videos:', err);
    return res.status(500).json({ error: 'Failed to retrieve videos' });
  }
}

// POST /api/upload
export async function handleUpload(req, res) {
  try {
    const meta = getMetadata();
    const uploadedVideos = req.files?.videos || [];

    const newVideoRecords = uploadedVideos.map((f, idx) => ({
      id: f.filename,
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
      formattedSize: formatBytes(f.size),
      uploadedAt: new Date().toISOString(),
      streamUrl: `/api/videos/stream/${f.filename}`,
      thumbnailUrl: `/api/videos/thumbnail/${f.filename}`,
    }));

    meta.videos.push(...newVideoRecords);
    saveMetadata(meta);

    syncCamerasWithUploadedVideos();

    // Generate thumbnails immediately in background
    for (const f of uploadedVideos) {
      const videoPath = path.join(VIDEOS_DIR, f.filename);
      const thumbPath = path.join(THUMBNAILS_DIR, `${path.parse(f.filename).name}.jpg`);
      const pythonPath = path.resolve(__dirname, '../../../ai_engine/venv/Scripts/python.exe');
      const scriptPath = path.resolve(__dirname, '../../../ai_engine/extract_thumbnail.py');
      spawn(pythonPath, [scriptPath, videoPath, thumbPath, '1.0']);
    }

    return res.status(201).json({
      success: true,
      message: `Uploaded ${uploadedVideos.length} video(s) successfully`,
      videos: newVideoRecords,
    });
  } catch (err) {
    console.error('Upload handling error:', err);
    return res.status(500).json({ error: 'Failed to process upload' });
  }
}

// GET /api/videos/thumbnail/:filename
export async function getVideoThumbnail(req, res) {
  try {
    let { filename } = req.params;
    if (filename.startsWith('vid-')) {
      filename = filename.replace(/^vid-/, '');
    }

    const cleanBase = path.parse(filename).name;
    const thumbFile = path.join(THUMBNAILS_DIR, `${cleanBase}.jpg`);

    if (fs.existsSync(thumbFile)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return fs.createReadStream(thumbFile).pipe(res);
    }

    // Attempt on-demand generation from video
    const videoFile = path.join(VIDEOS_DIR, filename);
    if (!fs.existsSync(videoFile)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const pythonPath = path.resolve(__dirname, '../../../ai_engine/venv/Scripts/python.exe');
    const scriptPath = path.resolve(__dirname, '../../../ai_engine/extract_thumbnail.py');
    const result = spawnSync(pythonPath, [scriptPath, videoFile, thumbFile, '1.0'], { timeout: 10000 });

    if (fs.existsSync(thumbFile)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return fs.createReadStream(thumbFile).pipe(res);
    }

    return res.status(500).json({ error: 'Failed to generate thumbnail frame' });
  } catch (err) {
    console.error('Thumbnail error:', err);
    return res.status(500).json({ error: 'Failed to get thumbnail' });
  }
}

// DELETE /api/videos/:filename
export async function deleteVideo(req, res) {
  try {
    let { filename } = req.params;
    if (filename.startsWith('vid-')) {
      filename = filename.replace(/^vid-/, '');
    }

    const targets = [
      path.join(VIDEOS_DIR, filename),
      path.join(LEGACY_UPLOADS_DIR, filename),
      path.join(THUMBNAILS_DIR, `${path.parse(filename).name}.jpg`),
    ];

    let deletedAny = false;
    targets.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deletedAny = true;
        } catch (e) {
          console.error(`Error deleting ${filePath}:`, e.message);
        }
      }
    });

    const meta = getMetadata();
    meta.videos = meta.videos.filter((v) => v.filename !== filename && v.id !== filename);
    saveMetadata(meta);

    // Clean up SQLite records associated with this video
    const cam = db.prepare(`SELECT camera_id FROM cameras WHERE video_path LIKE ?`).get(`%${filename}%`);
    if (cam) {
      // Delete crops for this camera's sightings
      const sightings = db.prepare(`SELECT crop_path FROM sightings WHERE camera_id = ?`).all(cam.camera_id);
      for (const s of sightings) {
        if (s.crop_path && fs.existsSync(s.crop_path)) {
          try { fs.unlinkSync(s.crop_path); } catch (e) {}
        }
      }
      db.prepare(`DELETE FROM sightings WHERE camera_id = ?`).run(cam.camera_id);
      db.prepare(`DELETE FROM cameras WHERE camera_id = ?`).run(cam.camera_id);
      db.prepare(`DELETE FROM global_identities WHERE global_id NOT IN (SELECT DISTINCT global_id FROM sightings)`).run();
    }

    syncCamerasWithUploadedVideos();

    return res.json({
      success: true,
      message: `Deleted video ${filename}`,
    });
  } catch (err) {
    console.error('Delete video error:', err);
    return res.status(500).json({ error: 'Failed to delete video' });
  }
}

// DELETE /api/videos/all or DELETE /api/videos
export async function clearAllVideos(req, res) {
  try {
    // 1. Purge data/videos
    if (fs.existsSync(VIDEOS_DIR)) {
      const files = fs.readdirSync(VIDEOS_DIR);
      for (const f of files) {
        if (f.startsWith('.')) continue;
        try { fs.unlinkSync(path.join(VIDEOS_DIR, f)); } catch (e) {}
      }
    }

    // 2. Purge legacy uploads
    if (fs.existsSync(LEGACY_UPLOADS_DIR)) {
      const files = fs.readdirSync(LEGACY_UPLOADS_DIR);
      for (const f of files) {
        if (f.startsWith('.')) continue;
        try { fs.unlinkSync(path.join(LEGACY_UPLOADS_DIR, f)); } catch (e) {}
      }
    }

    // 3. Purge thumbnails
    if (fs.existsSync(THUMBNAILS_DIR)) {
      const files = fs.readdirSync(THUMBNAILS_DIR);
      for (const f of files) {
        if (f.startsWith('.')) continue;
        try { fs.unlinkSync(path.join(THUMBNAILS_DIR, f)); } catch (e) {}
      }
    }

    // 4. Purge crops
    if (fs.existsSync(CROPS_DIR)) {
      const crops = fs.readdirSync(CROPS_DIR);
      for (const c of crops) {
        if (c.startsWith('.')) continue;
        try { fs.unlinkSync(path.join(CROPS_DIR, c)); } catch (e) {}
      }
    }

    saveMetadata({ videos: [] });

    db.prepare(`DELETE FROM sightings`).run();
    db.prepare(`DELETE FROM global_identities`).run();
    db.prepare(`DELETE FROM cameras`).run();

    return res.json({
      success: true,
      message: 'All video recordings, camera feeds, thumbnails, and tracking records wiped completely.',
    });
  } catch (err) {
    console.error('Clear all error:', err);
    return res.status(500).json({ error: 'Failed to clear all records' });
  }
}

// Progress tracking state for polling
let detectionStatus = {
  isRunning: false,
  percent: 0,
  stage: 'Ready',
  camera: null,
  frame: 0,
  totalFrames: 0,
  identitiesCount: 0,
  sightingsCount: 0,
  error: null,
  updatedAt: new Date().toISOString()
};

// GET /api/detection/status
export async function getDetectionStatus(req, res) {
  return res.json(detectionStatus);
}

// POST /api/detection/run
export async function runDetection(req, res) {
  if (detectionStatus.isRunning) {
    return res.status(409).json({ error: 'Detection pipeline is already running.', status: detectionStatus });
  }

  const videoFiles = fs.existsSync(VIDEOS_DIR) 
    ? fs.readdirSync(VIDEOS_DIR).filter(f => !f.startsWith('.'))
    : [];

  if (videoFiles.length === 0) {
    return res.status(400).json({ error: 'No videos uploaded. Please upload feeds first.' });
  }

  detectionStatus = {
    isRunning: true,
    percent: 5,
    stage: 'Initializing AI Models (YOLO11 + OSNet)...',
    camera: null,
    frame: 0,
    totalFrames: 0,
    identitiesCount: 0,
    sightingsCount: 0,
    error: null,
    updatedAt: new Date().toISOString()
  };

  syncCamerasWithUploadedVideos();

  try {
    const pythonPath = path.resolve(__dirname, '../../../ai_engine/venv/Scripts/python.exe');
    const pipelineScript = path.resolve(__dirname, '../../../ai_engine/pipeline.py');

    const args = [
      pipelineScript,
      '--clear',
      '--sample-step', String(req.body?.sampleStep || 15),
      '--conf', String(req.body?.conf || 0.25),
    ];

    console.log(`[AI Pipeline Agent] Executing: ${pythonPath} ${args.join(' ')}`);

    const child = spawn(pythonPath, args, {
      cwd: path.resolve(__dirname, '../../../ai_engine'),
    });

    let outputLog = '';
    let errorLog = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      outputLog += text;
      
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('JSON_PROGRESS:')) {
          try {
            const jsonPart = line.split('JSON_PROGRESS:')[1].trim();
            const data = JSON.parse(jsonPart);
            if (data.type === 'progress') {
              detectionStatus.percent = data.percent;
              detectionStatus.stage = data.stage;
              if (data.camera) detectionStatus.camera = data.camera;
              if (data.frame) detectionStatus.frame = data.frame;
              if (data.total_frames) detectionStatus.totalFrames = data.total_frames;
              if (data.identities_count !== undefined) detectionStatus.identitiesCount = data.identities_count;
              if (data.sightings_count !== undefined) detectionStatus.sightingsCount = data.sightings_count;
              detectionStatus.updatedAt = new Date().toISOString();
            }
          } catch (e) {}
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      errorLog += chunk.toString();
      console.error(`[AI Pipeline ERR] ${chunk.toString().trim()}`);
    });

    child.on('close', (code) => {
      syncCamerasWithUploadedVideos();
      if (code === 0) {
        detectionStatus.isRunning = false;
        detectionStatus.percent = 100;
        detectionStatus.stage = 'AI Multi-Angle Tracking Complete!';
        detectionStatus.updatedAt = new Date().toISOString();
        console.log('[AI Pipeline Agent] Pipeline execution completed successfully.');
      } else {
        detectionStatus.isRunning = false;
        detectionStatus.error = errorLog || `Process exited with code ${code}`;
        detectionStatus.updatedAt = new Date().toISOString();
        console.error(`[AI Pipeline Agent] Pipeline exited with code ${code}. Errors:`, errorLog);
      }
    });

    return res.json({
      success: true,
      message: 'AI Multi-Angle Automatic Tracking initiated. Processing all feeds...',
      status: detectionStatus
    });
  } catch (err) {
    detectionStatus.isRunning = false;
    detectionStatus.error = err.message;
    console.error('Failed to run detection pipeline:', err);
    return res.status(500).json({ error: 'Failed to initiate AI detection pipeline' });
  }
}

// GET /api/cameras
export async function getCameras(req, res) {
  try {
    syncCamerasWithUploadedVideos();
    const cameras = db.prepare(`SELECT * FROM cameras ORDER BY camera_id ASC`).all();
    return res.json(cameras);
  } catch (err) {
    console.error('Error fetching cameras:', err);
    return res.status(500).json({ error: 'Failed to fetch cameras' });
  }
}

// GET /api/sightings
export async function getSightings(req, res) {
  try {
    const { global_id, identityId, camera_id, cameraId, orientation, entity_type, category, search } = req.query;
    const targetId = global_id || identityId;
    const targetCam = camera_id || cameraId;
    const targetType = entity_type || category;

    let query = `
      SELECT s.*, 
             g.label as identity_name, 
             g.entity_type as identity_category,
             c.name as camera_name,
             c.video_path
      FROM sightings s
      LEFT JOIN global_identities g ON s.global_id = g.global_id
      LEFT JOIN cameras c ON s.camera_id = c.camera_id
      WHERE 1=1
    `;
    const params = [];

    if (targetId && targetId !== 'ALL') {
      query += ` AND s.global_id = ?`;
      params.push(targetId);
    }
    if (targetCam) {
      query += ` AND s.camera_id = ?`;
      params.push(targetCam);
    }
    if (orientation && orientation !== 'ALL') {
      query += ` AND UPPER(s.orientation) = ?`;
      params.push(orientation.toUpperCase());
    }
    if (targetType && targetType !== 'all') {
      query += ` AND s.entity_type = ?`;
      params.push(targetType);
    }
    if (search) {
      query += ` AND (g.label LIKE ? OR s.global_id LIKE ? OR s.entity_type LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY s.timestamp_sec ASC`;

    const sightings = db.prepare(query).all(...params);

    const formatted = sightings.map((s) => ({
      ...s,
      bbox: [s.bbox_x, s.bbox_y, s.bbox_x + s.bbox_w, s.bbox_y + s.bbox_h],
      crop_url: s.crop_path ? `/api/crops/${path.basename(s.crop_path)}` : null,
      stream_url: s.video_path ? `/api/videos/stream/${path.basename(s.video_path)}` : null,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('Error fetching sightings:', err);
    return res.status(500).json({ error: 'Failed to fetch sightings' });
  }
}

// GET /api/identities
export async function getIdentities(req, res) {
  try {
    const { entity_type, category } = req.query;
    const filterType = entity_type || category;

    let query = `
      SELECT g.*,
             COUNT(s.id) as sightings_count,
             MIN(s.timestamp_sec) as first_seen,
             MAX(s.timestamp_sec) as last_seen,
             GROUP_CONCAT(DISTINCT s.orientation) as observed_orientations
      FROM global_identities g
      LEFT JOIN sightings s ON g.global_id = s.global_id
    `;
    const params = [];

    if (filterType && filterType !== 'all') {
      query += ` WHERE g.entity_type = ?`;
      params.push(filterType);
    }

    query += ` GROUP BY g.global_id ORDER BY sightings_count DESC`;

    const identities = db.prepare(query).all(...params);

    const formatted = identities.map((id) => ({
      ...id,
      id: id.global_id,
      name: id.label || id.global_id,
      category: id.entity_type,
      best_crop_url: id.reference_image_url ? `/api/crops/${path.basename(id.reference_image_url)}` : null,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('Error fetching identities:', err);
    return res.status(500).json({ error: 'Failed to fetch identities' });
  }
}

// GET /api/crops/:filename
export async function getCropImage(req, res) {
  try {
    const { filename } = req.params;
    const cleanName = path.basename(filename);
    const cropFile = path.join(CROPS_DIR, cleanName);

    if (!fs.existsSync(cropFile)) {
      return res.status(404).json({ error: 'Crop image not found' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(cropFile).pipe(res);
  } catch (err) {
    console.error('Crop fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch crop' });
  }
}

// GET /api/videos/stream/:filename or /api/video/:cameraId
export async function streamVideo(req, res) {
  try {
    let filename = req.params.filename || req.params.cameraId;
    if (!filename) {
      return res.status(400).json({ error: 'No video filename or camera id specified' });
    }

    if (filename.startsWith('vid-')) {
      filename = filename.replace(/^vid-/, '');
    }

    // Check if filename is a camera_id in the database
    const camRecord = db.prepare(`SELECT video_path FROM cameras WHERE camera_id = ?`).get(filename);
    if (camRecord && camRecord.video_path) {
      filename = path.basename(camRecord.video_path);
    }

    const cleanName = path.basename(filename);
    let videoFile = path.join(VIDEOS_DIR, cleanName);

    if (!fs.existsSync(videoFile)) {
      // Check legacy uploads dir
      const legacyPath = path.join(LEGACY_UPLOADS_DIR, cleanName);
      if (fs.existsSync(legacyPath)) {
        videoFile = legacyPath;
      } else {
        return res.status(404).json({ error: `Video ${cleanName} not found` });
      }
    }

    const stat = fs.statSync(videoFile);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoFile, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoFile).pipe(res);
    }
  } catch (err) {
    console.error('Stream video error:', err);
    return res.status(500).json({ error: 'Failed to stream video' });
  }
}
