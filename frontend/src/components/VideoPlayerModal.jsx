import React, { useRef, useState } from 'react';
import { X, Scan } from 'lucide-react';
import { SERVER_URL } from '../services/api';

export default function VideoPlayerModal({ video, onClose }) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDim, setVideoDim] = useState({ w: 1920, h: 1080 });
  const [showBoundingBox, setShowBoundingBox] = useState(true);

  if (!video) return null;

  const getFullUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${SERVER_URL}${relativeUrl}`;
  };

  const videoSrc = video.streamUrl 
    ? getFullUrl(video.streamUrl)
    : video.url 
    ? getFullUrl(video.url) 
    : `${SERVER_URL}/api/video/${video.camera_id || video.cameraId || video.id}`;

  const handleLoadedMetadata = (e) => {
    if (e.target.videoWidth && e.target.videoHeight) {
      setVideoDim({ w: e.target.videoWidth, h: e.target.videoHeight });
    }
    if (videoRef.current && video.timestampSec !== undefined) {
      videoRef.current.currentTime = video.timestampSec;
      videoRef.current.play().catch(() => {});
    }
  };

  // Render Target Bounding Box
  const renderBoundingBox = () => {
    if (!showBoundingBox || !video.bbox || !video.bbox.w) return null;

    const targetSec = video.timestampSec || 0;
    const diff = Math.abs(currentTime - targetSec);

    // Option 2: 2.2-second smooth fading window around detection timestamp
    if (diff > 2.2) return null;

    let opacity = 1.0;
    if (diff > 0.6) {
      opacity = Math.max(0.2, 1.0 - (diff - 0.6) / 1.6);
    }

    const vw = videoDim.w || 1920;
    const vh = videoDim.h || 1080;

    const leftPct = Math.max(0, Math.min(95, (video.bbox.x / vw) * 100));
    const topPct = Math.max(0, Math.min(95, (video.bbox.y / vh) * 100));
    const widthPct = Math.max(3, Math.min(100 - leftPct, (video.bbox.w / vw) * 100));
    const heightPct = Math.max(3, Math.min(100 - topPct, (video.bbox.h / vh) * 100));

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${leftPct}%`,
            top: `${topPct}%`,
            width: `${widthPct}%`,
            height: `${heightPct}%`,
            border: '2px solid #1769FF',
            backgroundColor: 'rgba(23, 105, 255, 0.12)',
            boxShadow: '0 0 16px rgba(23, 105, 255, 0.75), inset 0 0 10px rgba(23, 105, 255, 0.3)',
            borderRadius: '4px',
            opacity,
            transition: 'opacity 0.15s ease-out',
          }}
        >
          {/* Tactical Corner Brackets */}
          <span style={{ position: 'absolute', top: -2, left: -2, width: 8, height: 8, borderTop: '3px solid #60a5fa', borderLeft: '3px solid #60a5fa' }} />
          <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderTop: '3px solid #60a5fa', borderRight: '3px solid #60a5fa' }} />
          <span style={{ position: 'absolute', bottom: -2, left: -2, width: 8, height: 8, borderBottom: '3px solid #60a5fa', borderLeft: '3px solid #60a5fa' }} />
          <span style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderBottom: '3px solid #60a5fa', borderRight: '3px solid #60a5fa' }} />

          {/* HUD Target Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: topPct < 15 ? '-26px' : 'calc(100% + 4px)',
              left: 0,
              backgroundColor: '#1769FF',
              color: '#ffffff',
              fontSize: '0.70rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              padding: '2px 7px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
              letterSpacing: '0.02em',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#38bdf8',
                display: 'inline-block',
              }}
            />
            <span>{video.identityName || video.globalId || 'Target'}</span>
            {video.confidence && (
              <span style={{ opacity: 0.85, fontSize: '0.64rem' }}>
                {Math.round(video.confidence * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 27, 61, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '860px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #E1E8F5',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #E1E8F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fbff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #bfdbfe',
              }}
            >
              {video.cameraName || 'Camera Feed'}
            </span>
            <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#101B3D', margin: 0 }}>
              {video.originalName || 'Recorded Footage'}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {video.bbox && (
              <button
                type="button"
                onClick={() => setShowBoundingBox(!showBoundingBox)}
                title="Toggle Target Bounding Box"
                style={{
                  background: showBoundingBox ? '#eff6ff' : 'transparent',
                  border: showBoundingBox ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                  color: showBoundingBox ? '#1d4ed8' : '#64748b',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                <Scan size={13} />
                <span>{showBoundingBox ? 'Bounding Box ON' : 'Bounding Box OFF'}</span>
              </button>
            )}

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
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body / Video Player with Bounding Box Overlay */}
        <div
          style={{
            backgroundColor: '#070b14',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            autoPlay
            playsInline
            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
            onLoadedMetadata={handleLoadedMetadata}
            style={{ width: '100%', maxHeight: '480px', outline: 'none' }}
          >
            Your browser does not support HTML5 video tag.
          </video>

          {renderBoundingBox()}
        </div>

        {/* Modal Footer / Metadata */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #E1E8F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#64748b',
            backgroundColor: '#ffffff',
          }}
        >
          <div>
            <span>
              Target Timestamp: <strong>{video.timestampSec !== undefined ? `${video.timestampSec}s` : '0.0s'}</strong>
              {video.bbox && (
                <span style={{ marginLeft: '10px', color: '#16a34a' }}>
                  • Bounding Box Active (Interpolated 2.2s window)
                </span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="continue-blue-btn"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.8rem',
            }}
          >
            Close Player
          </button>
        </div>
      </div>
    </div>
  );
}
