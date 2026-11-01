import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Video, Crosshair, RefreshCw } from 'lucide-react';
import { getVideoStreamUrl } from '../services/api';

export default function MultiCameraMatrix({ cameras = [], seekTarget }) {
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

      // Highlight the targeted camera with animated border flash
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

  // Ensure 4 feeds display for the 2x2 matrix
  const displayCameras = cameras.length > 0 ? cameras : [
    { camera_id: 'CAM-01', name: 'Front Courtyard (Cam 1)' },
    { camera_id: 'CAM-02', name: 'North Gate (Cam 2)' },
    { camera_id: 'CAM-03', name: 'West Wing Corridor (Cam 3)' },
    { camera_id: 'CAM-04', name: 'Central Plaza (Cam 4)' },
  ];

  return (
    <div className="cctv-matrix">
      {displayCameras.map((cam) => {
        const camId = cam.camera_id;
        const videoSrc = getVideoStreamUrl(camId);
        const isHighlighted = highlightedCam === camId;

        return (
          <div
            key={camId}
            className={`cctv-stream-card ${isHighlighted ? 'highlighted-radar' : ''}`}
          >
            {/* Header HUD */}
            <div className="cctv-hud-header">
              <div className="hud-cam-title">
                <Video size={14} color="#60a5fa" />
                <span>{cam.name || camId}</span>
              </div>
              <div className="hud-status-badge mono" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#ef4444', fontWeight: 800 }}>● REC</span>
                <span style={{ color: '#64748b' }}>&bull;</span>
                <span>1080p @ 25FPS</span>
              </div>
            </div>

            {/* Video Player */}
            <div className="cctv-video-wrap">
              <Crosshair className="cctv-hud-crosshair" color="#3b82f6" />
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
                onPlay={() => setIsPlaying((prev) => ({ ...prev, [camId]: true }))}
                onPause={() => setIsPlaying((prev) => ({ ...prev, [camId]: false }))}
              />
            </div>

            {/* Control Strip */}
            <div className="cctv-controls-strip">
              <button
                className="btn-icon"
                onClick={() => togglePlay(camId)}
                title={isPlaying[camId] ? 'Pause' : 'Play'}
              >
                {isPlaying[camId] ? <Pause size={14} /> : <Play size={14} />}
              </button>

              <button
                className="btn-icon"
                onClick={() => toggleMute(camId)}
                title={isMuted[camId] ? 'Unmute' : 'Mute'}
              >
                {isMuted[camId] ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              <input
                type="range"
                className="timeline-range-slider"
                min="0"
                max={durations[camId] || 10}
                step="0.1"
                value={currentTimes[camId] || 0}
                onChange={(e) => handleSeek(camId, parseFloat(e.target.value))}
              />

              <span className="time-readout mono">
                {formatSeconds(currentTimes[camId])}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

