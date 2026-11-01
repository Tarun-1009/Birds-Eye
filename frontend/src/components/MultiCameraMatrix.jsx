import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Video,
  Crosshair,
  RotateCcw,
  Maximize2,
  FastForward,
  Rewind,
  Target,
  Sparkles,
  Layers
} from 'lucide-react';
import { getVideoStreamUrl } from '../services/api';

export default function MultiCameraMatrix({ cameras = [], seekTarget, onOpenModalPlayer }) {
  const videoRefs = useRef({});
  const [isPlaying, setIsPlaying] = useState({});
  const [isMuted, setIsMuted] = useState({});
  const [currentTimes, setCurrentTimes] = useState({});
  const [durations, setDurations] = useState({});
  const [playbackRate, setPlaybackRate] = useState(1);
  const [highlightedCam, setHighlightedCam] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);

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

      // Highlight the targeted camera with animated border flash & active match badge
      setHighlightedCam(camId);
      setActiveMatch({
        camId,
        confidence: seekTarget.confidence || 0.965,
        orientation: seekTarget.orientation || 'FRONT',
        globalId: seekTarget.global_id || 'GID-101',
      });

      const timer = setTimeout(() => {
        setHighlightedCam(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [seekTarget]);

  // Master Play / Pause All Controls
  const playAll = () => {
    Object.keys(videoRefs.current).forEach((camId) => {
      const vid = videoRefs.current[camId];
      if (vid) {
        vid.play().catch(() => {});
        setIsPlaying((prev) => ({ ...prev, [camId]: true }));
      }
    });
  };

  const pauseAll = () => {
    Object.keys(videoRefs.current).forEach((camId) => {
      const vid = videoRefs.current[camId];
      if (vid) {
        vid.pause();
        setIsPlaying((prev) => ({ ...prev, [camId]: false }));
      }
    });
  };

  const resetAllToZero = () => {
    Object.keys(videoRefs.current).forEach((camId) => {
      const vid = videoRefs.current[camId];
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
        setIsPlaying((prev) => ({ ...prev, [camId]: true }));
      }
    });
  };

  const setGlobalSpeed = (rate) => {
    setPlaybackRate(rate);
    Object.keys(videoRefs.current).forEach((camId) => {
      const vid = videoRefs.current[camId];
      if (vid) vid.playbackRate = rate;
    });
  };

  const toggleGlobalMute = (muteState) => {
    const updated = {};
    Object.keys(videoRefs.current).forEach((camId) => {
      const vid = videoRefs.current[camId];
      if (vid) {
        vid.muted = muteState;
        updated[camId] = muteState;
      }
    });
    setIsMuted(updated);
  };

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

  const skipTime = (camId, seconds) => {
    const video = videoRefs.current[camId];
    if (!video) return;
    const newTime = Math.max(0, Math.min(video.duration || 30, video.currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTimes((prev) => ({ ...prev, [camId]: newTime }));
  };

  const toggleFullscreen = (camId) => {
    const video = videoRefs.current[camId];
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (onOpenModalPlayer) {
      const cam = cameras.find((c) => c.camera_id === camId);
      if (cam) onOpenModalPlayer(cam);
    }
  };

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Only display the 4 valid uploaded feeds
  const displayCameras = cameras.length > 0 ? cameras : [
    { camera_id: 'CAM-01', name: 'CAM-01 (Courtyard)' },
    { camera_id: 'CAM-02', name: 'CAM-02 (Gate)' },
    { camera_id: 'CAM-03', name: 'CAM-03 (Corridor)' },
    { camera_id: 'CAM-04', name: 'CAM-04 (Plaza)' },
  ];

  const anyPlaying = Object.values(isPlaying).some(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
      {/* Synchronized Surveillance Playback Controller Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.65rem 1rem',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Layers size={14} />
            SYNC PLAYBACK CONTROL
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            ({displayCameras.length} Active Feeds)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Master Play / Pause All */}
          <button
            type="button"
            onClick={anyPlaying ? pauseAll : playAll}
            className="filter-chip-btn"
            style={{
              padding: '0.35rem 0.85rem',
              backgroundColor: anyPlaying ? '#dc2626' : '#2563eb',
              borderColor: anyPlaying ? '#ef4444' : '#3b82f6',
              color: '#ffffff',
              fontWeight: 700
            }}
          >
            {anyPlaying ? <Pause size={13} fill="#ffffff" /> : <Play size={13} fill="#ffffff" />}
            <span>{anyPlaying ? 'Pause All' : 'Play All Feeds'}</span>
          </button>

          {/* Sync & Reset to 00:00 */}
          <button
            type="button"
            onClick={resetAllToZero}
            className="filter-chip-btn"
            style={{ padding: '0.35rem 0.75rem', color: '#94a3b8' }}
            title="Rewind all 4 cameras to 00:00 simultaneously"
          >
            <RotateCcw size={13} />
            <span>Sync to 00:00</span>
          </button>

          {/* Speed Selector */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: '4px', padding: '1px' }}>
            {[1, 1.5, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setGlobalSpeed(spd)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '3px',
                  backgroundColor: playbackRate === spd ? '#3b82f6' : 'transparent',
                  color: playbackRate === spd ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Master Mute / Unmute */}
          <button
            type="button"
            onClick={() => toggleGlobalMute(true)}
            className="btn-icon"
            style={{ padding: '0.35rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px' }}
            title="Mute All"
          >
            <VolumeX size={14} color="#94a3b8" />
          </button>
          <button
            type="button"
            onClick={() => toggleGlobalMute(false)}
            className="btn-icon"
            style={{ padding: '0.35rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px' }}
            title="Unmute All"
          >
            <Volume2 size={14} color="#94a3b8" />
          </button>
        </div>
      </div>

      {/* 2x2 CCTV Matrix Grid */}
      <div className="cctv-matrix">
        {displayCameras.map((cam) => {
          const camId = cam.camera_id;
          const videoSrc = getVideoStreamUrl(camId);
          const isHighlighted = highlightedCam === camId;
          const isMatched = activeMatch?.camId === camId;
          const duration = durations[camId] || 30;
          const currentTime = currentTimes[camId] || 0;

          return (
            <div
              key={camId}
              className={`cctv-stream-card ${isHighlighted ? 'highlighted-radar' : ''}`}
              style={{ position: 'relative' }}
            >
              {/* Header HUD */}
              <div className="cctv-hud-header">
                <div className="hud-cam-title">
                  <Video size={14} color="#60a5fa" />
                  <span>{cam.name || camId}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Match Percentage Badge overlay in HUD */}
                  {isMatched && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.25)',
                      border: '1px solid #10b981',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#34d399',
                      letterSpacing: '0.02em',
                      animation: 'pulse 1.5s infinite'
                    }}>
                      <Target size={11} color="#34d399" />
                      <span>{Math.round((activeMatch.confidence || 0.965) * 100)}% MATCH</span>
                    </div>
                  )}

                  <div className="hud-status-badge mono" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 800 }}>● REC</span>
                    <span style={{ color: '#64748b' }}>&bull;</span>
                    <span>1080p @ 25FPS</span>
                  </div>
                </div>
              </div>

              {/* Video Player Wrap with Click-to-Play */}
              <div
                className="cctv-video-wrap"
                onClick={() => togglePlay(camId)}
                style={{ cursor: 'pointer', position: 'relative' }}
                title="Click to Play / Pause video"
              >
                <Crosshair className="cctv-hud-crosshair" color="#3b82f6" />

                {/* Match Target Overlay Pin */}
                {isMatched && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 10,
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}>
                    <Sparkles size={13} color="#60a5fa" />
                    <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60a5fa' }}>
                      Re-ID: {Math.round((activeMatch.confidence || 0.965) * 100)}% ({activeMatch.orientation})
                    </span>
                  </div>
                )}

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

                {/* Big Center Play Icon when paused */}
                {!isPlaying[camId] && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(30, 41, 59, 0.85)',
                    border: '2px solid rgba(96, 165, 250, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
                  }}>
                    <Play size={22} fill="#60a5fa" color="#60a5fa" style={{ marginLeft: '3px' }} />
                  </div>
                )}
              </div>

              {/* Full Video Playback Control Strip */}
              <div className="cctv-controls-strip">
                {/* Play / Pause button */}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => togglePlay(camId)}
                  title={isPlaying[camId] ? 'Pause Video' : 'Play Video'}
                >
                  {isPlaying[camId] ? <Pause size={14} fill="#60a5fa" /> : <Play size={14} fill="#60a5fa" />}
                </button>

                {/* -5s Quick Rewind */}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => skipTime(camId, -5)}
                  title="Rewind 5s"
                >
                  <Rewind size={13} />
                </button>

                {/* +5s Quick Fast Forward */}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => skipTime(camId, 5)}
                  title="Forward 5s"
                >
                  <FastForward size={13} />
                </button>

                {/* Mute / Unmute */}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => toggleMute(camId)}
                  title={isMuted[camId] ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted[camId] ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>

                {/* Scrubber Timeline Slider */}
                <input
                  type="range"
                  className="timeline-range-slider"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => handleSeek(camId, parseFloat(e.target.value))}
                  title="Seek video position"
                />

                {/* Current Time / Total Duration Readout */}
                <span className="time-readout mono" style={{ minWidth: '78px', textAlign: 'right' }}>
                  {formatSeconds(currentTime)} / {formatSeconds(duration)}
                </span>

                {/* Fullscreen Option */}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => toggleFullscreen(camId)}
                  title="Fullscreen / Expanded Player"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
