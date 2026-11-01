/**
 * Mock Data Seeder Script (seedMockData.js)
 * Inserts 4 CCTV cameras (2x2 grid), distinct global identities (persons & objects/vehicles),
 * and frame-to-frame sequence detections across orientations (FRONT, BACK, LEFT, RIGHT).
 */
import { initializeDatabase } from './initDb.js';

export function seedMockData(dbInstance) {
  const db = dbInstance || initializeDatabase();

  console.log('[Seed] Seeding cameras, global identities, and frame sequence sightings into data/cctv_tracker.db...');

  const seedTransaction = db.transaction(() => {
    // 1. Clear existing data for clean idempotent seeding
    db.prepare('DELETE FROM sightings').run();
    db.prepare('DELETE FROM global_identities').run();
    db.prepare('DELETE FROM cameras').run();

    // 2. Insert Cameras for 2x2 CCTV Grid
    const insertCamera = db.prepare(`
      INSERT INTO cameras (camera_id, name, video_path, location, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const cameras = [
      ['CAM-01', 'Front Courtyard (Cam 1)', 'data/videos/cam1.mp4', 'Main Entrance West Gate', 'ONLINE'],
      ['CAM-02', 'North Gate (Cam 2)', 'data/videos/cam2.mp4', 'North Perimeter Lane', 'ONLINE'],
      ['CAM-03', 'West Wing Corridor (Cam 3)', 'data/videos/cam3.mp4', 'Building A - Service Driveway', 'ONLINE'],
      ['CAM-04', 'Central Plaza (Cam 4)', 'data/videos/cam4.mp4', 'Central Atrium Loading Dock', 'ONLINE'],
    ];

    for (const cam of cameras) {
      insertCamera.run(...cam);
    }

    // 3. Insert Global Identities (Persons, Objects, and Vehicles)
    const insertIdentity = db.prepare(`
      INSERT INTO global_identities (
        global_id, entity_type, label, first_seen_camera, first_seen_timestamp, dominant_color, reference_image_url, total_sightings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const identities = [
      ['GID-101', 'person', 'Subject Alpha (Blue Jacket)', 'CAM-01', 1.0, 'blue #2563eb', 'crop_sample_cctv_recording_f0000_person_0.jpg', 6],
      ['GID-102', 'person', 'Subject Bravo (Red Hoodie)', 'CAM-02', 1.8, 'red #dc2626', 'crop_sample_cctv_recording_f0000_person_1.jpg', 4],
      ['GID-103', 'person', 'Subject Charlie (Green Parka)', 'CAM-03', 2.5, 'green #16a34a', 'crop_sample_cctv_recording_f0020_person_0.jpg', 3],
      ['OBJ-201', 'object', 'Tactical Backpack', 'CAM-01', 1.0, 'black #0f172a', 'crop_sample_cctv_recording_f0000_person_4.jpg', 4],
      ['OBJ-202', 'object', 'Travel Suitcase', 'CAM-04', 3.0, 'slate #475569', 'crop_sample_cctv_recording_f0005_person_3.jpg', 2],
      ['VEH-301', 'object', 'Blue Delivery Van', 'CAM-01', 0.5, 'blue #1e40af', 'crop_sample_cctv_recording_f0000_person_0.jpg', 4],
      ['VEH-302', 'object', 'Silver SUV / Car', 'CAM-03', 2.0, 'silver #94a3b8', 'crop_sample_cctv_recording_f0005_person_3.jpg', 2],
    ];

    for (const id of identities) {
      insertIdentity.run(...id);
    }

    // 4. Insert Chronological Frame-to-Frame Sequence Detections
    const insertSighting = db.prepare(`
      INSERT INTO sightings (
        camera_id,
        timestamp_sec,
        global_id,
        entity_type,
        local_track_id,
        frame_index,
        timestamp,
        confidence,
        orientation,
        bbox_x,
        bbox_y,
        bbox_w,
        bbox_h,
        bev_x,
        bev_y,
        crop_path,
        carried_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleSightings = [
      // VEH-301 (Blue Delivery Van) sequence
      {
        camera_id: 'CAM-01', timestamp_sec: 0.5, global_id: 'VEH-301', entity_type: 'object',
        local_track_id: 101, frame_index: 12, timestamp: '00:00', confidence: 0.96,
        orientation: 'FRONT', bbox_x: 120, bbox_y: 80, bbox_w: 310, bbox_h: 210,
        bev_x: 25.0, bev_y: 15.0, crop_path: 'crop_sample_cctv_recording_f0000_person_0.jpg',
        carried_items: JSON.stringify(['cargo_pallet'])
      },
      {
        camera_id: 'CAM-01', timestamp_sec: 2.0, global_id: 'VEH-301', entity_type: 'object',
        local_track_id: 101, frame_index: 50, timestamp: '00:02', confidence: 0.94,
        orientation: 'RIGHT', bbox_x: 320, bbox_y: 90, bbox_w: 320, bbox_h: 200,
        bev_x: 40.0, bev_y: 22.0, crop_path: 'crop_sample_cctv_recording_f0005_person_0.jpg',
        carried_items: JSON.stringify(['cargo_pallet'])
      },
      {
        camera_id: 'CAM-02', timestamp_sec: 4.2, global_id: 'VEH-301', entity_type: 'object',
        local_track_id: 102, frame_index: 105, timestamp: '00:04', confidence: 0.93,
        orientation: 'BACK', bbox_x: 200, bbox_y: 110, bbox_w: 300, bbox_h: 195,
        bev_x: 60.0, bev_y: 35.0, crop_path: 'crop_sample_cctv_recording_f0010_person_0.jpg',
        carried_items: JSON.stringify(['cargo_pallet'])
      },
      {
        camera_id: 'CAM-04', timestamp_sec: 6.0, global_id: 'VEH-301', entity_type: 'object',
        local_track_id: 104, frame_index: 150, timestamp: '00:06', confidence: 0.91,
        orientation: 'LEFT', bbox_x: 180, bbox_y: 100, bbox_w: 310, bbox_h: 205,
        bev_x: 75.0, bev_y: 65.0, crop_path: 'crop_sample_cctv_recording_f0015_person_0.jpg',
        carried_items: null
      },

      // Sequence: GID-101 walking into Courtyard (Cam 1) facing FRONT
      {
        camera_id: 'CAM-01', timestamp_sec: 1.0, global_id: 'GID-101', entity_type: 'person',
        local_track_id: 1, frame_index: 25, timestamp: '00:01', confidence: 0.94,
        orientation: 'FRONT', bbox_x: 280, bbox_y: 150, bbox_w: 100, bbox_h: 270,
        bev_x: 42.1, bev_y: 20.5, crop_path: 'crop_sample_cctv_recording_f0000_person_0.jpg',
        carried_items: JSON.stringify(['backpack'])
      },
      // OBJ-201 detected carried by GID-101 at Cam 1
      {
        camera_id: 'CAM-01', timestamp_sec: 1.0, global_id: 'OBJ-201', entity_type: 'object',
        local_track_id: 20, frame_index: 25, timestamp: '00:01', confidence: 0.88,
        orientation: 'FRONT', bbox_x: 350, bbox_y: 200, bbox_w: 45, bbox_h: 70,
        bev_x: 42.1, bev_y: 20.5, crop_path: 'crop_sample_cctv_recording_f0000_person_4.jpg',
        carried_items: null
      },
      // GID-101 turns RIGHT towards North Gate in Cam 1
      {
        camera_id: 'CAM-01', timestamp_sec: 2.5, global_id: 'GID-101', entity_type: 'person',
        local_track_id: 1, frame_index: 62, timestamp: '00:02', confidence: 0.92,
        orientation: 'RIGHT', bbox_x: 460, bbox_y: 180, bbox_w: 95, bbox_h: 265,
        bev_x: 51.5, bev_y: 26.8, crop_path: 'crop_sample_cctv_recording_f0005_person_0.jpg',
        carried_items: JSON.stringify(['backpack'])
      },
      // GID-101 appears in Cam 2 walking AWAY (180 degree rotation - BACK)
      {
        camera_id: 'CAM-02', timestamp_sec: 3.5, global_id: 'GID-101', entity_type: 'person',
        local_track_id: 2, frame_index: 87, timestamp: '00:03', confidence: 0.90,
        orientation: 'BACK', bbox_x: 290, bbox_y: 160, bbox_w: 90, bbox_h: 255,
        bev_x: 58.2, bev_y: 38.5, crop_path: 'crop_sample_cctv_recording_f0010_person_0.jpg',
        carried_items: JSON.stringify(['backpack'])
      },
      // OBJ-201 seen on back of GID-101 in Cam 2
      {
        camera_id: 'CAM-02', timestamp_sec: 3.5, global_id: 'OBJ-201', entity_type: 'object',
        local_track_id: 21, frame_index: 87, timestamp: '00:03', confidence: 0.89,
        orientation: 'BACK', bbox_x: 310, bbox_y: 195, bbox_w: 50, bbox_h: 65,
        bev_x: 58.2, bev_y: 38.5, crop_path: 'crop_sample_cctv_recording_f0000_person_4.jpg',
        carried_items: null
      },
      // GID-101 moving LEFT profile along North Gate corridor
      {
        camera_id: 'CAM-02', timestamp_sec: 4.6, global_id: 'GID-101', entity_type: 'person',
        local_track_id: 2, frame_index: 115, timestamp: '00:04', confidence: 0.93,
        orientation: 'LEFT', bbox_x: 180, bbox_y: 170, bbox_w: 88, bbox_h: 260,
        bev_x: 62.0, bev_y: 45.2, crop_path: 'crop_sample_cctv_recording_f0015_person_0.jpg',
        carried_items: JSON.stringify(['backpack'])
      },
      // GID-101 entering Central Plaza (Cam 4)
      {
        camera_id: 'CAM-04', timestamp_sec: 5.4, global_id: 'GID-101', entity_type: 'person',
        local_track_id: 4, frame_index: 135, timestamp: '00:05', confidence: 0.91,
        orientation: 'RIGHT', bbox_x: 320, bbox_y: 140, bbox_w: 92, bbox_h: 250,
        bev_x: 70.4, bev_y: 58.9, crop_path: 'crop_sample_cctv_recording_f0005_person_0.jpg',
        carried_items: JSON.stringify(['backpack'])
      },

      // Subject Bravo (Red Hoodie) - GID-102
      {
        camera_id: 'CAM-02', timestamp_sec: 1.8, global_id: 'GID-102', entity_type: 'person',
        local_track_id: 5, frame_index: 45, timestamp: '00:01', confidence: 0.96,
        orientation: 'FRONT', bbox_x: 410, bbox_y: 190, bbox_w: 105, bbox_h: 260,
        bev_x: 65.1, bev_y: 30.2, crop_path: 'crop_sample_cctv_recording_f0000_person_1.jpg',
        carried_items: JSON.stringify([])
      },
      {
        camera_id: 'CAM-02', timestamp_sec: 3.2, global_id: 'GID-102', entity_type: 'person',
        local_track_id: 5, frame_index: 80, timestamp: '00:03', confidence: 0.93,
        orientation: 'RIGHT', bbox_x: 480, bbox_y: 200, bbox_w: 100, bbox_h: 255,
        bev_x: 71.0, bev_y: 35.4, crop_path: 'crop_sample_cctv_recording_f0005_person_1.jpg',
        carried_items: JSON.stringify([])
      },
      {
        camera_id: 'CAM-04', timestamp_sec: 4.8, global_id: 'GID-102', entity_type: 'person',
        local_track_id: 6, frame_index: 120, timestamp: '00:04', confidence: 0.88,
        orientation: 'BACK', bbox_x: 210, bbox_y: 180, bbox_w: 96, bbox_h: 245,
        bev_x: 74.2, bev_y: 62.0, crop_path: 'crop_sample_cctv_recording_f0010_person_1.jpg',
        carried_items: JSON.stringify([])
      },

      // Subject Charlie (Green Parka) - GID-103
      {
        camera_id: 'CAM-03', timestamp_sec: 2.5, global_id: 'GID-103', entity_type: 'person',
        local_track_id: 8, frame_index: 62, timestamp: '00:02', confidence: 0.95,
        orientation: 'LEFT', bbox_x: 310, bbox_y: 160, bbox_w: 110, bbox_h: 275,
        bev_x: 68.0, bev_y: 70.1, crop_path: 'crop_sample_cctv_recording_f0020_person_0.jpg',
        carried_items: JSON.stringify([])
      },
      {
        camera_id: 'CAM-03', timestamp_sec: 4.1, global_id: 'GID-103', entity_type: 'person',
        local_track_id: 8, frame_index: 102, timestamp: '00:04', confidence: 0.97,
        orientation: 'FRONT', bbox_x: 360, bbox_y: 175, bbox_w: 108, bbox_h: 280,
        bev_x: 73.5, bev_y: 74.8, crop_path: 'crop_sample_cctv_recording_f0015_person_0.jpg',
        carried_items: JSON.stringify([])
      },

      // VEH-302 (Silver SUV / Car)
      {
        camera_id: 'CAM-03', timestamp_sec: 2.0, global_id: 'VEH-302', entity_type: 'object',
        local_track_id: 201, frame_index: 50, timestamp: '00:02', confidence: 0.95,
        orientation: 'FRONT', bbox_x: 150, bbox_y: 130, bbox_w: 330, bbox_h: 220,
        bev_x: 35.0, bev_y: 45.0, crop_path: 'crop_sample_cctv_recording_f0005_person_3.jpg',
        carried_items: null
      },

      // OBJ-202 (Travel Suitcase)
      {
        camera_id: 'CAM-04', timestamp_sec: 3.0, global_id: 'OBJ-202', entity_type: 'object',
        local_track_id: 30, frame_index: 75, timestamp: '00:03', confidence: 0.91,
        orientation: 'FRONT', bbox_x: 260, bbox_y: 240, bbox_w: 55, bbox_h: 80,
        bev_x: 55.0, bev_y: 50.0, crop_path: 'crop_sample_cctv_recording_f0005_person_3.jpg',
        carried_items: null
      }
    ];

    for (const d of sampleSightings) {
      insertSighting.run(
        d.camera_id,
        d.timestamp_sec,
        d.global_id,
        d.entity_type,
        d.local_track_id,
        d.frame_index,
        d.timestamp,
        d.confidence,
        d.orientation,
        d.bbox_x,
        d.bbox_y,
        d.bbox_w,
        d.bbox_h,
        d.bev_x,
        d.bev_y,
        d.crop_path,
        d.carried_items
      );
    }
  });

  seedTransaction();

  // Print Summary Table
  const rows = db.prepare(`
    SELECT s.id, s.camera_id, s.timestamp_sec, s.global_id, s.entity_type, s.orientation, 
           s.confidence, s.carried_items, s.crop_path
    FROM sightings s
    ORDER BY s.id ASC
  `).all();

  console.log(`\n========================================================================================`);
  console.log(` MOCK DETECTIONS INSERTED (${rows.length} rows in 'sightings' table):`);
  console.log(`========================================================================================`);
  console.table(rows);
  console.log(`========================================================================================\n`);

  return rows;
}

// Auto-run if executed directly via CLI
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedMockData();
}
