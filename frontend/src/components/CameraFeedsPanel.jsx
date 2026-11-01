import React from 'react';
import { Video, ArrowRight, Radio } from 'lucide-react';
import camThumb1 from '../assets/cam_thumb_1.jpg';
import camThumb2 from '../assets/cam_thumb_2.jpg';
import camThumb3 from '../assets/cam_thumb_3.jpg';

export default function CameraFeedsPanel({ cameras = [], onSelectCamera, onViewAll }) {
  const thumbs = [camThumb1, camThumb2, camThumb3, camThumb1];

  const defaultCams = [
    { camera_id: 'CAM-01', name: 'Front Courtyard (Cam 1)', location: 'West Gate Entrance', status: 'ONLINE' },
    { camera_id: 'CAM-02', name: 'North Gate (Cam 2)', location: 'Perimeter Access', status: 'ONLINE' },
    { camera_id: 'CAM-03', name: 'West Wing Corridor (Cam 3)', location: 'Building A Service Lane', status: 'ONLINE' },
    { camera_id: 'CAM-04', name: 'Central Plaza (Cam 4)', location: 'Atrium Loading Bay', status: 'ONLINE' },
  ];

  const camList = cameras.length > 0 ? cameras : defaultCams;

  return (
    <div className="enterprise-panel-card">
      {/* Panel Header */}
      <div className="panel-header-row">
        <div className="panel-title-group">
          <div className="panel-title-icon-box">
            <Video size={18} color="#1769FF" />
          </div>
          <div>
            <h3 className="panel-title-text">Live Camera Feeds</h3>
            <span className="panel-subtitle-text">Multi-angle real-time surveillance streams</span>
          </div>
        </div>

        <button 
          onClick={onViewAll}
          className="panel-action-btn"
          title="Open live quad in Detection Studio"
        >
          <span>View All ({camList.length})</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Horizontal / Responsive Camera Cards Grid */}
      <div className="camera-feeds-grid-row">
        {camList.slice(0, 4).map((cam, idx) => {
          const isLive = (cam.status || 'ONLINE').toUpperCase() === 'ONLINE';
          const videoSrc = `http://localhost:3001/api/video/${cam.camera_id}`;

          return (
            <div 
              key={cam.camera_id} 
              className="live-camera-feed-card"
              onClick={() => onSelectCamera?.(cam.camera_id)}
            >
              {/* Video Stream Surface */}
              <div className="camera-feed-media-wrap">
                <video
                  src={videoSrc}
                  poster={thumbs[idx % thumbs.length]}
                  muted
                  playsInline
                  autoPlay
                  loop
                  preload="metadata"
                />
                
                {/* HUD Overlay Badges */}
                <div className="camera-hud-badge-top-left">
                  {cam.camera_id}
                </div>

                <div className="camera-hud-live-tag">
                  <span className="live-dot-pulse" />
                  <span>LIVE</span>
                </div>

                <div className="camera-hud-res-bottom">
                  <span>1080p · 30 FPS</span>
                </div>
              </div>

              {/* Camera Metadata Details */}
              <div className="camera-feed-details">
                <h4 className="camera-feed-name">{cam.name || cam.camera_id}</h4>
                <p className="camera-feed-location">{cam.location || 'Surveillance Sector'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

