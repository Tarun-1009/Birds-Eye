import React, { useState } from 'react';
import { 
  Folder, 
  Search, 
  RefreshCw, 
  Play, 
  Trash2, 
  Video as VideoIcon, 
  HardDrive,
  Calendar,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { getVideoThumbnailUrl } from '../services/api';

export default function StoredVideosGallery({ 
  videos = [], 
  onRefresh, 
  onPlayVideo, 
  onDeleteVideo, 
  onLaunchDetection, 
  onClearAll, 
  isRefreshing 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVideos = videos.filter(v => 
    (v.originalName || v.filename || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Controls Bar */}
      <div className="section-box-card" style={{ padding: '1.2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Folder size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Archived Camera Feeds ({videos.length} Feeds)
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Search Filter */}
            <div className="search-input-box-light" style={{ width: '260px', padding: '0.45rem 0.75rem' }}>
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Filter feeds by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-field-light"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              className="player-btn-clean"
              style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              title="Refresh video vault index"
            >
              <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
            </button>

            {/* Launch Tracking Studio */}
            {onLaunchDetection && (
              <button
                onClick={onLaunchDetection}
                className="continue-blue-btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
              >
                <Cpu size={15} />
                <span>Open Tracking Studio</span>
              </button>
            )}

            {/* Clear All Feeds */}
            {onClearAll && videos.length > 0 && (
              <button
                onClick={onClearAll}
                className="feed-remove-btn"
                style={{
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.8rem',
                  color: '#dc2626',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Wipe all videos, recordings, and tracking data"
              >
                <Trash2 size={14} />
                <span>Clear All Feeds</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredVideos.map((video, index) => {
            const thumbUrl = getVideoThumbnailUrl(video.filename || video.id);

            return (
              <div key={video.id || video.filename || index} className="section-box-card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Real Video Frame Thumbnail with Hover Play Button */}
                <div 
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '160px',
                    backgroundColor: '#0f172a',
                    cursor: 'pointer'
                  }}
                  onClick={() => onPlayVideo(video)}
                >
                  <img 
                    src={thumbUrl} 
                    alt={video.originalName || video.filename} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      // Fallback: If image thumbnail not yet ready, hide broken image
                      e.target.style.display = 'none';
                    }}
                  />

                  {/* Play Overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.25)'
                  }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                      <Play size={20} fill="#2563eb" style={{ marginLeft: '3px' }} />
                    </div>
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    Camera {index + 1}
                  </div>
                </div>

                {/* Video Info Details */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h4 style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0
                  }}>
                    {video.originalName || video.filename}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HardDrive size={13} />
                      {video.formattedSize || '0 B'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      {video.uploadedAt ? new Date(video.uploadedAt).toLocaleDateString() : 'Active Feed'}
                    </span>
                  </div>

                  {/* Card Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => onPlayVideo(video)}
                      className="light-chip-btn active"
                      style={{ flex: 1, padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Play size={13} fill="#2563eb" />
                      <span>Play Feed</span>
                    </button>

                    <button
                      onClick={() => onDeleteVideo(video.filename || video.id, video.originalName || video.filename)}
                      className="feed-remove-btn"
                      style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#ef4444' }}
                      title="Permanently delete feed"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="section-box-card" style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <VideoIcon size={36} color="#94a3b8" />
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0 }}>
            No Video Feeds in Vault
          </h4>
          <p style={{ fontSize: '0.82rem', margin: 0, maxWidth: '400px' }}>
            Upload camera recordings in the "Upload Feeds" tab to track targets across feeds.
          </p>
        </div>
      )}
    </div>
  );
}
