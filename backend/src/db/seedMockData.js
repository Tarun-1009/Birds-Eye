/**
 * Mock Data Seeder Script (seedMockData.js)
 * Inserts sample cameras, global identities, and 10 detections
 * with different orientations (FRONT, BACK, LEFT, RIGHT) into SQLite.
 */
import { initializeDatabase } from './initDb.js';

export function seedMockData(dbInstance) {
  const db = dbInstance || initializeDatabase();

  console.log('[Seed] Seeding cameras, global identities, and sample sightings...');

  // Use a transaction for atomic and fast insertion
  const seedTransaction = db.transaction(() => {
    // 1. Clear existing data to allow clean re-seeding
    db.prepare('DELETE FROM sightings').run();
    db.prepare('DELETE FROM global_identities').run();
    db.prepare('DELETE FROM cameras').run();

    // 2. Insert Sample Cameras
    const insertCamera = db.prepare(`
      INSERT INTO cameras (id, name, location, stream_url, orientation_coverage, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const cameras = [
      ['CAM-01', 'North Entrance Gate', 'Building A - North', '/uploads/videos/cam01.mp4', 'FRONT/SOUTH', 'ONLINE'],
      ['CAM-02', 'West Corridor Walkway', 'Building A - West Wing', '/uploads/videos/cam02.mp4', 'EAST/WEST', 'ONLINE'],
      ['CAM-03', 'South Courtyard Perimeter', 'Perimeter South', '/uploads/videos/cam03.mp4', 'NORTH/SOUTH', 'ONLINE'],
      ['CAM-04', 'Overhead Central Lobby', 'Central Atrium Level 2', '/uploads/videos/cam04.mp4', '360_OVERHEAD', 'ONLINE'],
    ];

    for (const cam of cameras) {
      insertCamera.run(...cam);
    }

    // 3. Insert Global Identities (Cross-Camera Target Entities)
    const insertIdentity = db.prepare(`
      INSERT INTO global_identities (id, label, target_type, reference_image_url, first_seen, last_seen, total_sightings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const identities = [
      [
        'person_001',
        'Target Subject Alpha',
        'Person',
        '/uploads/targets/target_alpha.jpg',
        '2026-10-31 08:30:15',
        '2026-10-31 08:34:50',
        6
      ],
      [
        'person_002',
        'Visitor Bravo',
        'Person',
        '/uploads/targets/target_bravo.jpg',
        '2026-10-31 08:31:00',
        '2026-10-31 08:35:20',
        4
      ]
    ];

    for (const id of identities) {
      insertIdentity.run(...id);
    }

    // 4. Insert 10 Sample Detections with different orientations (FRONT, BACK, LEFT, RIGHT)
    const insertSighting = db.prepare(`
      INSERT INTO sightings (
        camera_id,
        global_identity_id,
        local_track_id,
        timestamp,
        confidence,
        orientation,
        bbox_x,
        bbox_y,
        bbox_w,
        bbox_h,
        bev_x,
        bev_y,
        crop_image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleDetections = [
      // 1. FRONT orientation - North entrance
      {
        camera_id: 'CAM-01',
        global_identity_id: 'person_001',
        local_track_id: 1,
        timestamp: '2026-10-31 08:30:15',
        confidence: 0.94,
        orientation: 'FRONT',
        bbox_x: 240, bbox_y: 120, bbox_w: 75, bbox_h: 180,
        bev_x: 45.2, bev_y: 22.4,
        crop_image_url: '/data/crops/crop_cam01_id1_f0015_front.jpg'
      },
      // 2. RIGHT orientation - Moving along entrance ramp
      {
        camera_id: 'CAM-01',
        global_identity_id: 'person_001',
        local_track_id: 1,
        timestamp: '2026-10-31 08:30:45',
        confidence: 0.91,
        orientation: 'RIGHT',
        bbox_x: 320, bbox_y: 135, bbox_w: 68, bbox_h: 175,
        bev_x: 52.8, bev_y: 28.1,
        crop_image_url: '/data/crops/crop_cam01_id1_f0045_right.jpg'
      },
      // 3. BACK orientation - Walking away down west hall
      {
        camera_id: 'CAM-02',
        global_identity_id: 'person_001',
        local_track_id: 2,
        timestamp: '2026-10-31 08:31:30',
        confidence: 0.89,
        orientation: 'BACK',
        bbox_x: 180, bbox_y: 90, bbox_w: 60, bbox_h: 160,
        bev_x: 58.4, bev_y: 39.7,
        crop_image_url: '/data/crops/crop_cam02_id2_f0090_back.jpg'
      },
      // 4. LEFT orientation - Turning towards courtyard
      {
        camera_id: 'CAM-02',
        global_identity_id: 'person_001',
        local_track_id: 2,
        timestamp: '2026-10-31 08:32:10',
        confidence: 0.93,
        orientation: 'LEFT',
        bbox_x: 260, bbox_y: 110, bbox_w: 70, bbox_h: 170,
        bev_x: 63.1, bev_y: 47.5,
        crop_image_url: '/data/crops/crop_cam02_id2_f0130_left.jpg'
      },
      // 5. FRONT orientation - Visitor Bravo enters lobby
      {
        camera_id: 'CAM-04',
        global_identity_id: 'person_002',
        local_track_id: 1,
        timestamp: '2026-10-31 08:31:00',
        confidence: 0.96,
        orientation: 'FRONT',
        bbox_x: 290, bbox_y: 150, bbox_w: 80, bbox_h: 190,
        bev_x: 35.0, bev_y: 50.2,
        crop_image_url: '/data/crops/crop_cam04_id1_f0060_front.jpg'
      },
      // 6. RIGHT orientation - Visitor Bravo crossing atrium
      {
        camera_id: 'CAM-04',
        global_identity_id: 'person_002',
        local_track_id: 1,
        timestamp: '2026-10-31 08:32:00',
        confidence: 0.92,
        orientation: 'RIGHT',
        bbox_x: 380, bbox_y: 160, bbox_w: 72, bbox_h: 185,
        bev_x: 48.6, bev_y: 56.4,
        crop_image_url: '/data/crops/crop_cam04_id1_f0120_right.jpg'
      },
      // 7. BACK orientation - Visitor Bravo exiting towards courtyard
      {
        camera_id: 'CAM-04',
        global_identity_id: 'person_002',
        local_track_id: 1,
        timestamp: '2026-10-31 08:33:15',
        confidence: 0.88,
        orientation: 'BACK',
        bbox_x: 450, bbox_y: 140, bbox_w: 65, bbox_h: 165,
        bev_x: 62.2, bev_y: 65.0,
        crop_image_url: '/data/crops/crop_cam04_id1_f0195_back.jpg'
      },
      // 8. LEFT orientation - Subject Alpha entering South Courtyard
      {
        camera_id: 'CAM-03',
        global_identity_id: 'person_001',
        local_track_id: 4,
        timestamp: '2026-10-31 08:33:40',
        confidence: 0.95,
        orientation: 'LEFT',
        bbox_x: 150, bbox_y: 100, bbox_w: 74, bbox_h: 182,
        bev_x: 68.7, bev_y: 68.2,
        crop_image_url: '/data/crops/crop_cam03_id4_f0220_left.jpg'
      },
      // 9. FRONT orientation - Subject Alpha approaching perimeter check
      {
        camera_id: 'CAM-03',
        global_identity_id: 'person_001',
        local_track_id: 4,
        timestamp: '2026-10-31 08:34:20',
        confidence: 0.97,
        orientation: 'FRONT',
        bbox_x: 230, bbox_y: 125, bbox_w: 82, bbox_h: 195,
        bev_x: 74.3, bev_y: 75.6,
        crop_image_url: '/data/crops/crop_cam03_id4_f0260_front.jpg'
      },
      // 10. RIGHT orientation - Visitor Bravo at perimeter corner
      {
        camera_id: 'CAM-03',
        global_identity_id: 'person_002',
        local_track_id: 5,
        timestamp: '2026-10-31 08:35:20',
        confidence: 0.90,
        orientation: 'RIGHT',
        bbox_x: 390, bbox_y: 130, bbox_w: 70, bbox_h: 178,
        bev_x: 82.0, bev_y: 84.1,
        crop_image_url: '/data/crops/crop_cam03_id5_f0320_right.jpg'
      }
    ];

    for (const d of sampleDetections) {
      insertSighting.run(
        d.camera_id,
        d.global_identity_id,
        d.local_track_id,
        d.timestamp,
        d.confidence,
        d.orientation,
        d.bbox_x,
        d.bbox_y,
        d.bbox_w,
        d.bbox_h,
        d.bev_x,
        d.bev_y,
        d.crop_image_url
      );
    }
  });

  seedTransaction();

  // Print Summary Table
  const rows = db.prepare(`
    SELECT s.id, s.camera_id, s.global_identity_id, s.local_track_id, s.orientation, 
           s.confidence, s.bev_x, s.bev_y, s.timestamp
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
