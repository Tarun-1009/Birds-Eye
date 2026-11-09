import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import db from '../db/db.js';
import { config } from '../config/index.js';
import { seedMockData } from '../db/seedMockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const TARGETS_DIR = path.join(UPLOADS_DIR, 'targets');
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

// Ensure upload directories exist
[UPLOADS_DIR, VIDEOS_DIR, TARGETS_DIR, config.videosDir, config.cropsDir].forEach((dir) => {
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
  return { videos: [], target: null };
}

// Helper: Save persistent metadata
export function saveMetadata(data) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save metadata.json:', err.message);
  }
}

// 1. System Health
export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Birds-Eye Multi-Camera CCTV Tracking Platform',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

// 2. Fetch Stored Videos
export const getVideos = (req, res) => {
  const data = getMetadata();
  const totalBytes =
    data.videos.reduce((sum, v) => sum + (v.sizeBytes || 0), 0) +
    (data.target ? data.target.sizeBytes || 0 : 0);

  res.json({
    videos: data.videos,
    target: data.target,
    stats: {
      videoCount: data.videos.length,
      totalBytes,
      formattedTotalSize: formatBytes(totalBytes),
    },
  });
};

// 3. Multi-Video Upload Handler (also registers cameras in SQLite)
export const handleUpload = (req, res) => {
  const videoFiles = req.files?.videos || [];
  const targetFile = req.files?.target?.[0] || null;
  let cameraNames = req.body?.cameraNames;

  if (videoFiles.length === 0 && !targetFile) {
    return res.status(400).json({
      success: false,
      error: 'Please select at least one video or a target photo.',
    });
  }

  if (cameraNames && !Array.isArray(cameraNames)) {
    cameraNames = [cameraNames];
  }

  const currentData = getMetadata();
  const newVideos = [];

  // Register each uploaded video in metadata and cameras table
  const insertCameraStmt = db.prepare(`
    INSERT OR REPLACE INTO cameras (camera_id, name, video_path, location, status)
    VALUES (?, ?, ?, ?, 'ONLINE')
  `);

  // Determine highest existing camera number to guarantee unique sequential IDs
  let maxCamNum = 0;
  try {
    const existingCams = db.prepare('SELECT camera_id FROM cameras').all();
    existingCams.forEach((c) => {
      const m = (c.camera_id || '').match(/CAM-(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxCamNum) maxCamNum = n;
      }
    });
  } catch (e) {}

  currentData.videos.forEach((v) => {
    const m = (v.id || '').match(/CAM-(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxCamNum) maxCamNum = n;
    }
  });

  videoFiles.forEach((file, index) => {
    maxCamNum += 1;
    const camId = `CAM-${String(maxCamNum).padStart(2, '0')}`;
    const cameraName =
      cameraNames && cameraNames[index]
        ? cameraNames[index].trim()
        : `Camera ${maxCamNum}`;

    // Also copy / link into data/videos/ if not already there
    const dataVideoPath = path.join(config.videosDir, file.filename);
    try {
      if (!fs.existsSync(dataVideoPath)) {
        fs.copyFileSync(file.path, dataVideoPath);
      }
    } catch (e) {
      console.warn('Could not mirror uploaded video to data/videos:', e.message);
    }

    const relativeVideoPath = `data/videos/${file.filename}`;
    insertCameraStmt.run(camId, cameraName, relativeVideoPath, cameraName);

    const videoRecord = {
      id: camId,
      filename: file.filename,
      originalName: file.originalname,
      cameraName,
      sizeBytes: file.size,
      formattedSize: formatBytes(file.size),
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
      url: `/uploads/videos/${file.filename}`,
      streamUrl: `/api/video/${camId}`,
    };
    newVideos.push(videoRecord);
    currentData.videos.push(videoRecord);
  });

  // Process uploaded target reference photo
  if (targetFile) {
    if (currentData.target && currentData.target.filename) {
      const oldPath = path.join(TARGETS_DIR, currentData.target.filename);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
      }
    }

    currentData.target = {
      id: 'tgt_' + Date.now(),
      filename: targetFile.filename,
      originalName: targetFile.originalname,
      sizeBytes: targetFile.size,
      formattedSize: formatBytes(targetFile.size),
      mimeType: targetFile.mimetype,
      uploadedAt: new Date().toISOString(),
      url: `/uploads/targets/${targetFile.filename}`,
    };
  }

  saveMetadata(currentData);

  return res.status(201).json({
    success: true,
    message: `Successfully uploaded ${newVideos.length} camera feed(s)${targetFile ? ' and 1 target reference' : ''}.`,
    uploadedVideos: newVideos,
    target: currentData.target,
  });
};

// 4. Delete video & purge associated tracking records
export const deleteVideo = (req, res) => {
  const { id } = req.params;
  const data = getMetadata();

  // Find all matching videos in metadata by id, filename, or originalName
  const removedVideos = [];
  data.videos = data.videos.filter((v) => {
    if (v.id === id || v.filename === id || v.originalName === id) {
      removedVideos.push(v);
      return false;
    }
    return true;
  });

  if (removedVideos.length > 0) {
    saveMetadata(data);
  }

  // Find camera(s) from DB matching id or filename
  let camera = null;
  try {
    camera = db.prepare('SELECT * FROM cameras WHERE camera_id = ? OR video_path LIKE ?').get(id, `%${id}%`);
  } catch (e) {}

  const camIdsToPurge = new Set();
  if (camera) {
    camIdsToPurge.add(camera.camera_id);
  }
  if (id.startsWith('CAM-')) {
    camIdsToPurge.add(id);
  }
  removedVideos.forEach((v) => {
    if (v.id && v.id.startsWith('CAM-')) {
      camIdsToPurge.add(v.id);
    }
  });

  // Gather filenames to remove from disk
  const filesToDelete = new Set();
  removedVideos.forEach((v) => {
    if (v.filename) filesToDelete.add(v.filename);
  });
  if (camera && camera.video_path) {
    filesToDelete.add(path.basename(camera.video_path));
  }

  // 1. Remove video file from disk (both uploads/videos and data/videos)
  filesToDelete.forEach((camVideoFile) => {
    const p1 = path.join(VIDEOS_DIR, camVideoFile);
    const p2 = path.join(config.videosDir, camVideoFile);
    if (fs.existsSync(p1)) { try { fs.unlinkSync(p1); } catch (e) {} }
    if (fs.existsSync(p2)) { try { fs.unlinkSync(p2); } catch (e) {} }
  });

  // 2. Remove crop files & DB records for each purged camera
  camIdsToPurge.forEach((camId) => {
    try {
      const crops = db.prepare('SELECT crop_path FROM sightings WHERE camera_id = ?').all(camId);
      crops.forEach((c) => {
        if (c.crop_path) {
          const cropFile = path.basename(c.crop_path);
          const cropOnDisk = path.join(config.cropsDir, cropFile);
          if (fs.existsSync(cropOnDisk)) {
            try { fs.unlinkSync(cropOnDisk); } catch (e) {}
          }
        }
      });
    } catch (e) {}

    try {
      db.prepare('DELETE FROM sightings WHERE camera_id = ?').run(camId);
      db.prepare('DELETE FROM cameras WHERE camera_id = ?').run(camId);
    } catch (e) {}
  });

  // 3. Prune orphaned identities and refresh sightings counts
  try {
    db.prepare('DELETE FROM global_identities WHERE global_id NOT IN (SELECT DISTINCT global_id FROM sightings WHERE global_id IS NOT NULL)').run();
    db.prepare('UPDATE global_identities SET total_sightings = (SELECT COUNT(*) FROM sightings WHERE sightings.global_id = global_identities.global_id)').run();
  } catch (e) {}

  const label = removedVideos[0]?.originalName || removedVideos[0]?.cameraName || id;
  return res.json({ success: true, message: `Camera feed '${label}' removed.` });
};

// 5. Delete Target
export const deleteTarget = (req, res) => {
  const data = getMetadata();
  if (!data.target) {
    return res.status(404).json({ success: false, error: 'No active target photo.' });
  }

  const filePath = path.join(TARGETS_DIR, data.target.filename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
  }

  data.target = null;
  saveMetadata(data);
  return res.json({ success: true, message: 'Target photo removed.' });
};

// 6. Camera Registry (GET /api/cameras)
export const getCameras = (req, res) => {
  try {
    const cameras = db.prepare('SELECT * FROM cameras ORDER BY camera_id ASC').all();
    res.json(cameras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. Sighting Search & Frame-to-Frame Sequence Query (GET /api/sightings)
export const getSightings = (req, res) => {
  try {
    const { global_id, orientation, camera_id, search, q, entity_type, limit = 100 } = req.query;
    const searchTerm = (search || q || '').trim();

    let query = `
      SELECT 
        s.*,
        c.name as camera_name,
        g.label as identity_label,
        g.dominant_color
      FROM sightings s
      LEFT JOIN cameras c ON s.camera_id = c.camera_id
      LEFT JOIN global_identities g ON s.global_id = g.global_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by specific Global ID
    if (global_id) {
      query += ' AND s.global_id = ?';
      params.push(global_id);
    }

    // Filter by Entity Type (person or object)
    if (entity_type) {
      query += ' AND s.entity_type = ?';
      params.push(entity_type.toLowerCase());
    }

    // Filter by Orientation (ALL, FRONT, BACK, LEFT, RIGHT, SIDE)
    if (orientation && orientation.toUpperCase() !== 'ALL') {
      const ori = orientation.toUpperCase();
      if (ori === 'SIDE') {
        query += " AND s.orientation IN ('LEFT', 'RIGHT')";
      } else {
        query += ' AND s.orientation = ?';
        params.push(ori);
      }
    }

    // Filter by Camera ID
    if (camera_id) {
      query += ' AND s.camera_id = ?';
      params.push(camera_id);
    }

    // Multi-term text search (e.g. "blue van", "backpack", "red", "cam 1")
    if (searchTerm) {
      const terms = searchTerm.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        query += ` AND (
          s.global_id LIKE ? 
          OR g.label LIKE ? 
          OR g.dominant_color LIKE ?
          OR s.entity_type LIKE ? 
          OR s.carried_items LIKE ? 
          OR c.name LIKE ?
          OR s.orientation LIKE ?
          OR s.crop_path LIKE ?
        )`;
        const pattern = `%${term}%`;
        params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
      }
    }

    // Sort chronologically by timestamp and frame to preserve frame-to-frame sequence
    query += ' ORDER BY s.timestamp_sec ASC, s.frame_index ASC LIMIT ?';
    params.push(Number(limit));

    const sightings = db.prepare(query).all(...params);
    res.json(sightings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8. Identity Registry (GET /api/identities)
export const getIdentities = (req, res) => {
  try {
    const query = `
      SELECT 
        g.*,
        (SELECT s.crop_path FROM sightings s WHERE s.global_id = g.global_id ORDER BY s.timestamp_sec ASC LIMIT 1) as initial_crop_path,
        (SELECT COUNT(*) FROM sightings s WHERE s.global_id = g.global_id) as total_sightings,
        (SELECT GROUP_CONCAT(DISTINCT s.camera_id) FROM sightings s WHERE s.global_id = g.global_id) as observed_cameras,
        (SELECT GROUP_CONCAT(DISTINCT s.orientation) FROM sightings s WHERE s.global_id = g.global_id) as observed_orientations
      FROM global_identities g
      ORDER BY g.first_seen_timestamp ASC
    `;
    const identities = db.prepare(query).all();
    res.json(identities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 9. Static Crop Image Serving (GET /api/crops/:filename)
export const getCropImage = (req, res) => {
  try {
    const { filename } = req.params;
    const cleanFilename = path.basename(filename);
    
    // Look in data/crops/ first, then uploads/
    const candidatePaths = [
      path.resolve(config.cropsDir, cleanFilename),
      path.resolve(TARGETS_DIR, cleanFilename),
      path.resolve(__dirname, '../../../data/crops', cleanFilename),
    ];

    const cropPath = candidatePaths.find((p) => fs.existsSync(p));

    if (!cropPath) {
      return res.status(404).json({ error: `Crop image '${cleanFilename}' not found` });
    }

    res.sendFile(cropPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 10. HTTP 206 Partial Content Range Video Seeking (GET /api/video/:camera_id)
export const streamVideo = (req, res) => {
  const { camera_id } = req.params;
  const camera = db.prepare('SELECT * FROM cameras WHERE camera_id = ?').get(camera_id);

  if (!camera) {
    return res.status(404).json({ error: `Camera '${camera_id}' not found` });
  }

  // Resolve video path
  const candidatePaths = [
    path.resolve(config.dataDir, camera.video_path),
    path.resolve(config.videosDir, path.basename(camera.video_path)),
    path.resolve(VIDEOS_DIR, path.basename(camera.video_path)),
    path.resolve(__dirname, '../../../', camera.video_path),
  ];

  const videoPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!videoPath) {
    return res.status(404).json({ error: `Video file not found for camera ${camera_id}` });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
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
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
};

// 11. Run Multi-Angle Detection Pipeline (invokes Python AI engine on uploaded feeds)
export const runDetection = async (req, res) => {
  try {
    const pythonExe = path.resolve(__dirname, '../../../ai_engine/venv/Scripts/python.exe');
    const scriptPath = path.resolve(__dirname, '../../../ai_engine/run_pipeline.py');

    if (fs.existsSync(pythonExe) && fs.existsSync(scriptPath)) {
      console.log('[API] Executing Python AI detection pipeline...');
      const sampleStep = req.body?.sampleStep || '10';
      const conf = req.body?.conf || '0.25';

      const py = spawn(pythonExe, [scriptPath, '--sample-step', String(sampleStep), '--conf', String(conf), '--clear'], {
        cwd: path.resolve(__dirname, '../../../'),
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (d) => { stdout += d.toString(); });
      py.stderr.on('data', (d) => { stderr += d.toString(); });

      await new Promise((resolve) => {
        py.on('close', (code) => {
          console.log(`[API] AI Pipeline closed with exit code ${code}`);
          resolve();
        });
      });
    }

    const sightings = db.prepare(`
      SELECT 
        s.*,
        c.name as camera_name,
        g.label as identity_label,
        g.dominant_color
      FROM sightings s
      LEFT JOIN cameras c ON s.camera_id = c.camera_id
      LEFT JOIN global_identities g ON s.global_id = g.global_id
      ORDER BY s.timestamp_sec ASC, s.frame_index ASC
    `).all();

    const identities = db.prepare(`
      SELECT 
        g.*,
        (SELECT s.crop_path FROM sightings s WHERE s.global_id = g.global_id ORDER BY s.timestamp_sec ASC LIMIT 1) as initial_crop_path,
        (SELECT COUNT(*) FROM sightings s WHERE s.global_id = g.global_id) as total_sightings,
        (SELECT GROUP_CONCAT(DISTINCT s.camera_id) FROM sightings s WHERE s.global_id = g.global_id) as observed_cameras,
        (SELECT GROUP_CONCAT(DISTINCT s.orientation) FROM sightings s WHERE s.global_id = g.global_id) as observed_orientations
      FROM global_identities g
      ORDER BY g.first_seen_timestamp ASC
    `).all();

    const cameras = db.prepare('SELECT * FROM cameras ORDER BY camera_id ASC').all();

    return res.json({
      success: true,
      message: 'Detection sequence pipeline completed successfully',
      camerasCount: cameras.length,
      sightingsCount: sightings.length,
      identitiesCount: identities.length,
      sightings,
      identities,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 12. Seed Mock Surveillance Data (POST /api/seed)
export const seedDatabase = (req, res) => {
  try {
    seedMockData(db);
    const cameras = db.prepare('SELECT COUNT(*) as count FROM cameras').get().count;
    const identities = db.prepare('SELECT COUNT(*) as count FROM global_identities').get().count;
    const sightings = db.prepare('SELECT COUNT(*) as count FROM sightings').get().count;

    res.json({
      success: true,
      message: `Database seeded successfully: ${cameras} cameras, ${identities} identities, ${sightings} frame sequence sightings.`,
      camerasCount: cameras,
      identitiesCount: identities,
      sightingsCount: sightings,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 13. Clear All Feeds, Crops, and Storage Archive
export const clearAllVideos = (req, res) => {
  try {
    const data = getMetadata();
    // 1. Delete all uploaded video files
    try {
      if (fs.existsSync(VIDEOS_DIR)) {
        fs.readdirSync(VIDEOS_DIR).forEach((f) => {
          if (f !== '.gitkeep') {
            try { fs.unlinkSync(path.join(VIDEOS_DIR, f)); } catch (e) {}
          }
        });
      }
    } catch (e) {}

    // 2. Delete mirrored video files
    try {
      if (fs.existsSync(config.videosDir)) {
        fs.readdirSync(config.videosDir).forEach((f) => {
          if (f !== '.gitkeep') {
            try { fs.unlinkSync(path.join(config.videosDir, f)); } catch (e) {}
          }
        });
      }
    } catch (e) {}

    // 3. Delete target images
    try {
      if (fs.existsSync(TARGETS_DIR)) {
        fs.readdirSync(TARGETS_DIR).forEach((f) => {
          if (f !== '.gitkeep') {
            try { fs.unlinkSync(path.join(TARGETS_DIR, f)); } catch (e) {}
          }
        });
      }
    } catch (e) {}

    // 4. Delete all crop images
    try {
      if (fs.existsSync(config.cropsDir)) {
        fs.readdirSync(config.cropsDir).forEach((f) => {
          if (f !== '.gitkeep') {
            try { fs.unlinkSync(path.join(config.cropsDir, f)); } catch (e) {}
          }
        });
      }
    } catch (e) {}

    data.videos = [];
    data.target = null;
    saveMetadata(data);

    // 5. Purge database tables
    db.prepare('DELETE FROM sightings').run();
    db.prepare('DELETE FROM global_identities').run();
    db.prepare('DELETE FROM cameras').run();

    return res.json({ success: true, message: 'All camera streams, crops, and tracking records purged.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

