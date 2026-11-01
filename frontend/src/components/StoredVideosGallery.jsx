import React, { useState } from 'react';
import { 
  Folder, 
  Search, 
  RefreshCw, 
  Play, 
  Trash2, 
  Video as VideoIcon, 
  User, 
  Eye
} from 'lucide-react';
import { SERVER_URL } from '../services/api';

export default function StoredVideosGallery({ 
  videos, 
  target, 
  onRefresh, 
  onPlayVideo, 
  onDeleteVideo, 
  onDeleteTarget,
  onLaunchDetection,
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

  return (
    <section style={{
      backgroundColor: 'var(--card-bg)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      padding: '1.5rem',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      {/* Header & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Folder size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
            Stored Surveillance Videos
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.35rem 0.65rem',
            width: '220px'
          }}>
            <Search size={14} color="#64748b" style={{ marginRight: '6px' }} />
            <input
              type="text"
              placeholder="Filter by camera or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.8rem',
                width: '100%',
                color: '#1e293b'
              }}
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh stored videos"
            style={{
              padding: '0.45rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Active Target Reference Photo Banner */}
      {target && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <img
              src={getFullUrl(target.url)}
              alt="Target"
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '2px solid #3b82f6'
              }}
            />
            <div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: '800',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '4px',
                letterSpacing: '0.04em'
              }}>
                ACTIVE TARGET REFERENCE
              </span>
              <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e3a8a', marginTop: '2px' }}>
                {target.originalName} ({target.formattedSize})
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onLaunchDetection}
              style={{
                padding: '0.35rem 0.75rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Eye size={13} /> Detect in Videos
            </button>

            <button
              type="button"
              onClick={onDeleteTarget}
              style={{
                padding: '0.35rem 0.65rem',
                backgroundColor: '#fee2e2',
                color: 'var(--accent-rose)',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {filteredVideos.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem'
        }}>
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
            >
              {/* Video Thumbnail / Preview container */}
              <div
                style={{
                  height: '145px',
                  backgroundColor: '#0f172a',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                <video
                  src={`${getFullUrl(video.url)}#t=0.5`}
                  preload="metadata"
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                />

                {/* Play Button Overlay */}
                <button
                  type="button"
                  onClick={() => onPlayVideo(video)}
                  title="Play video"
                  style={{
                    position: 'absolute',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(37, 99, 235, 0.9)',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    transition: 'transform 0.15s'
                  }}
                >
                  <Play size={18} fill="#ffffff" style={{ marginLeft: '2px' }} />
                </button>
              </div>

              {/* Card Body */}
              <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #bfdbfe'
                  }}>
                    {video.cameraName}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                    {video.formattedSize}
                  </span>
                </div>

                <h4
                  title={video.originalName}
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {video.originalName}
                </h4>

                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Uploaded: {new Date(video.uploadedAt).toLocaleString()}
                </span>

                {/* Card Actions Footer */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: 'auto',
                  paddingTop: '0.6rem',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <button
                    type="button"
                    onClick={() => onPlayVideo(video)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '0.4rem',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      color: '#1e293b',
                      cursor: 'pointer'
                    }}
                  >
                    <Play size={12} fill="#1e293b" /> Play
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteVideo(video.id, video.originalName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.4rem 0.65rem',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      color: 'var(--accent-rose)',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#e2e8f0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.85rem auto'
          }}>
            <VideoIcon size={26} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
            No Surveillance Videos Stored Yet
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '380px', margin: '0 auto' }}>
            Drag and drop videos in the ingestion panel on the left to upload multi-angle camera feeds and track targets.
          </p>
        </div>
      )}
    </section>
  );
}

