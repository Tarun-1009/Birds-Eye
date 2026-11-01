import React from 'react';
import { Camera, Radio, UploadCloud, Film, Database, Sparkles, Layers } from 'lucide-react';

export default function AppHeader({
  activeTab,
  onTabChange,
  cameraCount = 0,
  sightingsCount = 0,
  identitiesCount = 0,
  isOnline = true
}) {
  return (
    <header className="app-header">
      {/* Brand Logo & System Status */}
      <div className="header-brand">
        <div className="brand-icon-badge">
          <Camera size={22} />
        </div>
        <div>
          <div className="brand-title">
            <span>BIRD'S-EYE VIEW</span>
            <span className="system-tag mono">WAL MODE</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
            Multi-Camera CCTV Tracking &amp; Re-Identification
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="header-nav">
        <button
          className={`nav-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => onTabChange('live')}
        >
          <Layers size={14} />
          <span>Live Surveillance Matrix</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => onTabChange('upload')}
        >
          <UploadCloud size={14} />
          <span>Upload CCTV Feeds</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
          onClick={() => onTabChange('vault')}
        >
          <Film size={14} />
          <span>Stored Feeds ({cameraCount})</span>
        </button>
      </nav>

      {/* Status & Metrics Strip */}
      <div className="header-status-pills">
        <div className="live-pill">
          <span className="live-dot" />
          <span className="mono">{isOnline ? 'AI ENGINE ONLINE' : 'OFFLINE'}</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid #1e293b',
          borderRadius: 'var(--radius-md)',
          padding: '0.35rem 0.75rem',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }} className="mono">
          <span>Sightings: <strong style={{ color: '#60a5fa' }}>{sightingsCount}</strong></span>
          <span style={{ color: '#334155' }}>|</span>
          <span>Identities: <strong style={{ color: '#10b981' }}>{identitiesCount}</strong></span>
        </div>
      </div>
    </header>
  );
}
