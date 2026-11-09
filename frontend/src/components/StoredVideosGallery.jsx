import React, { useState } from 'react';
import { 
  Folder, 
  Search, 
  RefreshCw, 
  Play, 
  Trash2, 
  Video as VideoIcon, 
  User, 
  HardDrive,
  Calendar,
  ExternalLink,
  Plus
} from 'lucide-react';
import { SERVER_URL } from '../services/api';
import camThumb1 from '../assets/cam_thumb_1.jpg';
import camThumb2 from '../assets/cam_thumb_2.jpg';
import camThumb3 from '../assets/cam_thumb_3.jpg';

export default function StoredVideosGallery({ 
  videos = [], 
  target, 
  onRefresh, 
  onPlayVideo, 
  onDeleteVideo, 
  onDeleteTarget,
  onLaunchDetection,
  onClearAll,
  isRefreshing 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVideos = videos.filter(v => 
    v.cameraName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.originalName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFullUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${SERVER_URL}${relativeUrl}`;
  };

  const getThumbnail = (index) => {
    const thumbs = [camThumb1, camThumb2, camThumb3];
    return thumbs[index % thumbs.length];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Controls Bar */}
      <div className="section-box-card" style={{ padding: '1.2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Folder size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Archived Camera Feeds &amp; Targets ({videos.length})
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

            {/* Clear All Feeds Button */}
            {videos.length > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                className="feed-remove-btn"
                style={{
                  padding: '0.42rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Purge all feeds and tracking records"
              >
                <Trash2 size={13} />
                <span>Clear All Feeds</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Target Reference Photo Card */}
      {target && (
        <div className="section-box-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1.5px solid #bfdbfe',
                backgroundColor: '#eff6ff',
                flexShrink: 0
              }}>
                <img
                  src={getFullUrl(target.url)}
                  alt="Target"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = camThumb1;
                  }}
                />
              </div>

              <div>
                <span className="ready-status-pill-blue" style={{ display: 'inline-flex', padding: '2px 8px', fontSize: '0.7rem', marginBottom: '4px' }}>
                  <span className="operational-dot-blue"></span>
                  Active Re-ID Target
                </span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>
                  {target.originalName}
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.85rem' }}>
                  <span>Size: {target.formattedSize}</span>
                  <span>Registered: {new Date(target.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                onClick={onLaunchDetection}
                className="continue-blue-btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
              >
                <ExternalLink size={14} />
                <span>Launch Detection Studio</span>
              </button>

              <button
                onClick={onDeleteTarget}
                className="feed-remove-btn"
                style={{ padding: '8px', border: '1px solid #fee2e2', borderRadius: '6px', color: '#ef4444', background: '#fef2f2' }}
                title="Delete target reference"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {filteredVideos.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredVideos.map((video, index) => (
            <div key={video.id || index} className="section-box-card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Video Thumbnail with Hover Play Button */}
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
                  src={getThumbnail(index)} 
                  alt={video.originalName} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} 
                />
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
                    boxShadow: 'var(--shadow-md)'
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
                  {video.cameraName || `CH-0${index + 1}`}
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
                  whiteSpace: 'nowrap'
                }}>
                  {video.originalName}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HardDrive size={13} />
                    {video.formattedSize || '30.5 MB'}
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
                    <span>Play Stream</span>
                  </button>

                  <button
                    onClick={() => onDeleteVideo(video.filename || video.id, video.originalName)}
                    className="feed-remove-btn"
                    style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    title="Remove feed from vault"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="section-box-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <VideoIcon size={38} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            No matching camera recordings found
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
            Upload video files through the Video Ingestion pipeline to analyze multi-angle surveillance feeds.
          </p>
        </div>
      )}
    </div>
  );
}
