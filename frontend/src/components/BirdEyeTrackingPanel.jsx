import React from 'react';
import { MapPin, ArrowRight, Eye, Navigation } from 'lucide-react';
import BirdsEyeCanvas from './BirdsEyeCanvas';

export default function BirdEyeTrackingPanel({ 
  cameras = [], 
  sightings = [], 
  onViewMap 
}) {
  const nodes = cameras.map((c, i) => ({
    id: c.camera_id,
    name: c.name,
    x: i === 0 ? 28 : i === 1 ? 72 : i === 2 ? 26 : 74,
    y: i === 0 ? 32 : i === 1 ? 34 : i === 2 ? 74 : 78,
    status: 'online',
  }));

  const targets = sightings.slice(0, 6).map((s, idx) => ({
    id: s.global_id || `TRK-${idx}`,
    label: s.identity_label || `Target ${idx + 1}`,
    type: s.entity_type || 'person',
    x: 22 + idx * 13,
    y: 26 + idx * 11,
    color: s.dominant_color || '#1769FF',
  }));

  return (
    <div className="enterprise-panel-card">
      <div className="panel-header-row">
        <div className="panel-title-group">
          <div className="panel-title-icon-box">
            <MapPin size={18} color="#1769FF" />
          </div>
          <div>
            <h3 className="panel-title-text">Bird's-Eye Tracking</h3>
            <span className="panel-subtitle-text">Top-down cross-camera trajectory mapping</span>
          </div>
        </div>

        <button 
          onClick={onViewMap}
          className="panel-action-btn"
          title="Open full tactical radar"
        >
          <span>View Map</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div style={{ marginTop: '0.5rem' }}>
        <BirdsEyeCanvas 
          nodes={nodes}
          targets={targets}
          selectedZone="ALL"
        />
      </div>
    </div>
  );
}

