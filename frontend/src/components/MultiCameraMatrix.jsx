import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Video } from 'lucide-react';
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

  const displayCameras = cameras.length > 0 ? cameras.slice(0, 4) : [
    { camera_id: 'CAM-01', name: 'Front Courtyard (Cam 1)' },
    { camera_id: 'CAM-02', name: 'North Gate (Cam 2)' },
    { camera_id: 'CAM-03', name: 'West Wing Corridor (Cam 3)' },
    { camera_id: 'CAM-04', name: 'Central Plaza (Cam 4)' },
  ];

  return (
    <div className="cctv-quad-grid">
      {displayCameras.map((cam, idx) => {
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
                <span>LIVE · CH-0{idx + 1}</span>
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
