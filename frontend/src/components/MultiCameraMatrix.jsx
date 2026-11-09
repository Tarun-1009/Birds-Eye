import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Video, UploadCloud, ArrowRight } from 'lucide-react';
import { getVideoStreamUrl } from '../services/api';

export default function MultiCameraMatrix({ cameras = [], seekTarget, onNavigateToIngestion }) {
  const videoRefs = useRef({});
  const [isPlaying, setIsPlaying] = useState({});
  const [isMuted, setIsMuted] = useState({});
  const [currentTimes, setCurrentTimes] = useState({});
  const [durations, setDurations] = useState({});
  const [highlightedCam, setHighlightedCam] = useState(null);

  // Jump to exact second when a frame sighting is clicked / stepped
  useEffect(() => {
    if (!seekTarget || !seekTarget.camera_id) return;

    const camId = seekTarget.camera_id;
    const video = videoRefs.current[camId];

    if (video) {
      video.currentTime = seekTarget.timestamp_sec;
      video.play().then(() => {
        setIsPlaying((prev) => ({ ...prev, [camId]: true }));
      }).catch(() => {
        /* Autoplay policy */
      });

      // Highlight the targeted camera with clean blue border
      setHighlightedCam(camId);
      const timer = setTimeout(() => setHighlightedCam(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [seekTarget]);

  const togglePlay = (camId) => {
    const video = videoRefs.current[camId];
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying((prev) => ({ ...prev, [camId]: true }));
      }).catch(console.error);
    } else {
      video.pause();
      setIsPlaying((prev) => ({ ...prev, [camId]: false }));
    }
  };

  const toggleMute = (camId) => {
    const video = videoRefs.current[camId];
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted((prev) => ({ ...prev, [camId]: video.muted }));
  };

  const handleSeek = (camId, time) => {
    const video = videoRefs.current[camId];
    if (!video) return;
    video.currentTime = time;
    setCurrentTimes((prev) => ({ ...prev, [camId]: time }));
  };

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // If no cameras uploaded, show clean prompt instead of 4 blank video cards!
  if (!cameras || cameras.length === 0) {
    return (
      <div className="section-box-card" style={{
        padding: '3.5rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        minHeight: '360px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2563eb'
        }}>
          <UploadCloud size={32} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
            No Camera Feeds Uploaded Yet
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
            Upload your surveillance video files to view live camera feeds and track targets across camera angles.
          </p>
        </div>
        {onNavigateToIngestion && (
          <button
            onClick={onNavigateToIngestion}
            className="continue-blue-btn"
            style={{
              padding: '0.55rem 1.35rem',
              fontSize: '0.86rem',
              marginTop: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Upload Camera Feeds</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="cctv-quad-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: cameras.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem'
      }}
    >
      {cameras.map((cam, idx) => {
        const camId = cam.camera_id;
        const videoSrc = getVideoStreamUrl(camId);
        const isHighlighted = highlightedCam === camId;

        return (
          <div
            key={camId}
            className={`cctv-card-light ${isHighlighted ? 'active-highlight' : ''}`}
          >
            {/* Card Header HUD */}
            <div className="cctv-card-top-hud">
              <div className="cctv-cam-title-clean">
                <Video size={14} color="#2563eb" />
                <span>{cam.name || camId}</span>
              </div>
              <div className="cctv-live-tag mono">
                <span className="rec-dot" />
                <span>FEED · CH-0{idx + 1}</span>
              </div>
            </div>

            {/* Video Surface */}
            <div className="cctv-video-frame">
              <video
                ref={(el) => (videoRefs.current[camId] = el)}
                src={videoSrc}
                preload="metadata"
                loop
                muted={isMuted[camId] !== false}
                playsInline
                onTimeUpdate={(e) => {
                  setCurrentTimes((prev) => ({ ...prev, [camId]: e.target.currentTime }));
                }}
                onLoadedMetadata={(e) => {
                  setDurations((prev) => ({ ...prev, [camId]: e.target.duration }));
                }}
              />
            </div>

            {/* Controls Strip */}
            <div className="cctv-player-strip">
              <button
                type="button"
                className="player-btn-clean"
                onClick={() => togglePlay(camId)}
                title={isPlaying[camId] ? 'Pause Feed' : 'Play Feed'}
              >
                {isPlaying[camId] ? <Pause size={14} /> : <Play size={14} />}
              </button>

              <button
                type="button"
                className="player-btn-clean"
                onClick={() => toggleMute(camId)}
                title={isMuted[camId] ? 'Unmute' : 'Mute'}
              >
                {isMuted[camId] ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              <input
                type="range"
                min="0"
                max={durations[camId] || 100}
                step="0.1"
                value={currentTimes[camId] || 0}
                onChange={(e) => handleSeek(camId, parseFloat(e.target.value))}
                className="player-slider-clean"
              />

              <span className="mono" style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                {formatSeconds(currentTimes[camId])} / {formatSeconds(durations[camId])}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
