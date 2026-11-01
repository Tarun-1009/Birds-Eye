import React from 'react';
import { Camera, Layers, UploadCloud, Film, RotateCcw } from 'lucide-react';

export default function AppHeader({
  activeTab,
  onTabChange,
  cameraCount = 0,
  sightingsCount = 0,
  identitiesCount = 0,
  isOnline = true,
  onQuickSeed,
  isSeeding = false,
}) {
  return (
    <header className="app-header">
      {/* Brand Header */}
      <div className="header-brand">
        <div className="brand-icon-box">
          <Camera size={20} />
        </div>
        <div>
          <div className="brand-title">
            <span>BIRD'S-EYE VMS</span>
            <span className="system-badge mono">STATION 01</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
            Multi-Camera Tracking &amp; Re-Identification
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav className="header-nav">
        <button
          className={`nav-btn ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => onTabChange('live')}
        >
          <Layers size={15} />
          <span>Surveillance Matrix</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => onTabChange('upload')}
        >
          <UploadCloud size={15} />
          <span>Channel Ingestion</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'vault' ? 'active' : ''}`}
          onClick={() => onTabChange('vault')}
        >
          <Film size={15} />
          <span>Archive ({cameraCount})</span>
        </button>
      </nav>

      {/* Right Controls: Telemetry & Reset Dataset */}
      <div className="header-actions">
        {onQuickSeed && (
          <button
            onClick={onQuickSeed}
            disabled={isSeeding}
            className="chip-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.35rem 0.75rem' }}
            title="Load calibrated surveillance benchmark with vehicles and targets"
          >
            <RotateCcw size={12} className={isSeeding ? 'spin' : ''} />
            <span>{isSeeding ? 'Syncing...' : 'Reset Demo'}</span>
          </button>
        )}

        <div className="telemetry-counter mono">
          <span>Detections: <strong style={{ color: '#818cf8' }}>{sightingsCount}</strong></span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span>Targets: <strong style={{ color: '#34d399' }}>{identitiesCount}</strong></span>
        </div>

        <div className="status-pill">
          <span className="status-dot" />
          <span className="mono">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
}
