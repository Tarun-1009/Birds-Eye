import React from 'react';
import { X, Video, Calendar, HardDrive } from 'lucide-react';
import { SERVER_URL } from '../services/api';

export default function VideoPlayerModal({ video, onClose }) {
  if (!video) return null;

  const getFullUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${SERVER_URL}${relativeUrl}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1.5rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '820px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {video.originalName}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Video Player */}
        <div style={{ backgroundColor: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            src={video.url ? getFullUrl(video.url) : `${SERVER_URL}/api/video/${video.camera_id}`}
            controls
            autoPlay
            style={{ width: '100%', maxHeight: '480px', outline: 'none' }}
          >
            Your browser does not support HTML5 video tag.
          </video>
        </div>

        {/* Modal Footer / Metadata */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: '#64748b',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span><strong>Size:</strong> {video.formattedSize}</span>
            <span><strong>Uploaded:</strong> {new Date(video.uploadedAt).toLocaleString()}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.4rem 0.9rem',
              backgroundColor: '#e2e8f0',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Close Player
          </button>
        </div>
      </div>
    </div>
  );
}


