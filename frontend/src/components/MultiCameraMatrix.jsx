import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Video, UploadCloud, ArrowRight, Scan, Crosshair } from 'lucide-react';
import { getVideoStreamUrl } from '../services/api';

export default function MultiCameraMatrix({
  cameras = [],
  seekTarget,
  activeSighting,
  allSightings = [],
  onNavigateToIngestion,
  onPlaybackProgress,
}) {
  const videoRefs = useRef({});
  const [isPlaying, setIsPlaying] = useState({});
  const [isMuted, setIsMuted] = useState({});
  const [currentTimes, setCurrentTimes] = useState({});
  const [durations, setDurations] = useState({});
  const [videoDimensions, setVideoDimensions] = useState({});
  const [highlightedCam, setHighlightedCam] = useState(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);

  // Jump to exact second when a frame sighting is clicked / stepped
  // Strictly pauses all other cameras so only ONE camera plays at a time
  useEffect(() => {
    if (!seekTarget || !seekTarget.camera_id) return;

    const camId = seekTarget.camera_id;

    // Pause all other cameras
    Object.entries(videoRefs.current).forEach(([otherCamId, otherVideo]) => {
      if (otherCamId !== camId && otherVideo && !otherVideo.paused) {
        otherVideo.pause();
      }
    });

    const video = videoRefs.current[camId];

    if (video) {
      video.currentTime = seekTarget.timestamp_sec;
      video.play().then(() => {
        setIsPlaying({ [camId]: true });
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
      // Pause all other cameras
      Object.entries(videoRefs.current).forEach(([otherCamId, otherVideo]) => {
        if (otherCamId !== camId && otherVideo && !otherVideo.paused) {
          otherVideo.pause();
        }
      });
      video.play().then(() => {
        setIsPlaying({ [camId]: true });
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

  // Pre-index sightings by camera_id and global_id, sorted by timestamp_sec
  const sightingsByCamAndEntity = useMemo(() => {
    const map = {};
    if (!allSightings || allSightings.length === 0) return map;

    allSightings.forEach((s) => {
      if (!s.camera_id || !s.global_id || !s.bbox_w) return;
      if (!map[s.camera_id]) map[s.camera_id] = {};
      if (!map[s.camera_id][s.global_id]) map[s.camera_id][s.global_id] = [];
      map[s.camera_id][s.global_id].push(s);
    });

    // Chronological sort
    Object.keys(map).forEach((cId) => {
      Object.keys(map[cId]).forEach((gId) => {
        map[cId][gId].sort((a, b) => a.timestamp_sec - b.timestamp_sec);
      });
    });

    return map;
  }, [allSightings]);

  // 60fps RequestAnimationFrame time-tracker for silky smooth live bounding box motion
  useEffect(() => {
    let animId;
    const tick = () => {
      let updated = false;
      const newTimes = {};
      let activePlaying = null;

      Object.entries(videoRefs.current).forEach(([cId, vEl]) => {
        if (vEl && !vEl.paused) {
          newTimes[cId] = vEl.currentTime;
          updated = true;
          activePlaying = { cId, time: vEl.currentTime };
        }
      });

      if (updated) {
        setCurrentTimes((prev) => ({ ...prev, ...newTimes }));
      }
      if (activePlaying && onPlaybackProgress) {
        onPlaybackProgress(activePlaying.cId, activePlaying.time);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [onPlaybackProgress]);

  // Render Live Interpolated Bounding Box Overlay for a Camera Feed
  const renderBoundingBoxes = (camId) => {
    if (!showBoundingBoxes) return null;

    const vw = videoDimensions[camId]?.w || 1920;
    const vh = videoDimensions[camId]?.h || 1080;
    const curTime = currentTimes[camId] !== undefined ? currentTimes[camId] : (activeSighting?.timestamp_sec || 0);

    const entitiesOnCam = sightingsByCamAndEntity[camId] || {};
    const boxesToRender = [];

    Object.entries(entitiesOnCam).forEach(([gId, track]) => {
      if (!track || track.length === 0) return;

      let prev = null;
      let next = null;

      for (let i = 0; i < track.length; i++) {
        if (track[i].timestamp_sec <= curTime) {
          prev = track[i];
        }
        if (track[i].timestamp_sec >= curTime) {
          next = track[i];
          break;
        }
      }

      let interpX, interpY, interpW, interpH;
      let opacity = 1.0;
      let label = gId;
      let confidence = 0.9;
      const isActive = activeSighting && (
        activeSighting.global_id === gId ||
        activeSighting.id === prev?.id ||
        activeSighting.id === next?.id
      );

      if (prev && next) {
        const timeDelta = next.timestamp_sec - prev.timestamp_sec;
        if (timeDelta <= 1.5) {
          // Smooth continuous linear interpolation between consecutive points
          const alpha = timeDelta > 0.001 ? (curTime - prev.timestamp_sec) / timeDelta : 0;
          interpX = prev.bbox_x + alpha * (next.bbox_x - prev.bbox_x);
          interpY = prev.bbox_y + alpha * (next.bbox_y - prev.bbox_y);
          interpW = prev.bbox_w + alpha * (next.bbox_w - prev.bbox_w);
          interpH = prev.bbox_h + alpha * (next.bbox_h - prev.bbox_h);
          label = next.identity_name || next.label || prev.identity_name || prev.label || gId;
          confidence = next.confidence || prev.confidence;
        } else {
          // Gap between distinct sighting clusters
          const diffPrev = Math.abs(curTime - prev.timestamp_sec);
          const diffNext = Math.abs(curTime - next.timestamp_sec);
          if (diffPrev <= 0.6) {
            interpX = prev.bbox_x;
            interpY = prev.bbox_y;
            interpW = prev.bbox_w;
            interpH = prev.bbox_h;
            opacity = Math.max(0.2, 1.0 - diffPrev / 0.6);
            label = prev.identity_name || prev.label || gId;
            confidence = prev.confidence;
          } else if (diffNext <= 0.6) {
            interpX = next.bbox_x;
            interpY = next.bbox_y;
            interpW = next.bbox_w;
            interpH = next.bbox_h;
            opacity = Math.max(0.2, 1.0 - diffNext / 0.6);
            label = next.identity_name || next.label || gId;
            confidence = next.confidence;
          } else {
            return;
          }
        }
      } else if (prev) {
        const diff = curTime - prev.timestamp_sec;
        if (diff >= 0 && diff <= 0.6) {
          interpX = prev.bbox_x;
          interpY = prev.bbox_y;
          interpW = prev.bbox_w;
          interpH = prev.bbox_h;
          opacity = Math.max(0.2, 1.0 - diff / 0.6);
          label = prev.identity_name || prev.label || gId;
          confidence = prev.confidence;
        } else {
          return;
        }
      } else if (next) {
        const diff = next.timestamp_sec - curTime;
        if (diff >= 0 && diff <= 0.6) {
          interpX = next.bbox_x;
          interpY = next.bbox_y;
          interpW = next.bbox_w;
          interpH = next.bbox_h;
          opacity = Math.max(0.2, 1.0 - diff / 0.6);
          label = next.identity_name || next.label || gId;
          confidence = next.confidence;
        } else {
          return;
        }
      } else {
        return;
      }

      const leftPct = Math.max(0, Math.min(95, (interpX / vw) * 100));
      const topPct = Math.max(0, Math.min(95, (interpY / vh) * 100));
      const widthPct = Math.max(3, Math.min(100 - leftPct, (interpW / vw) * 100));
      const heightPct = Math.max(3, Math.min(100 - topPct, (interpH / vh) * 100));

      boxesToRender.push({
        key: `${camId}-${gId}`,
        leftPct,
        topPct,
        widthPct,
        heightPct,
        opacity,
        isActive,
        label,
        confidence,
      });
    });

    if (boxesToRender.length === 0) return null;

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
        {boxesToRender.map((b) => (
          <div
            key={b.key}
            style={{
              position: 'absolute',
              left: `${b.leftPct}%`,
              top: `${b.topPct}%`,
              width: `${b.widthPct}%`,
              height: `${b.heightPct}%`,
              border: b.isActive ? '2px solid #1769FF' : '1.5px dashed rgba(23, 105, 255, 0.75)',
              backgroundColor: b.isActive ? 'rgba(23, 105, 255, 0.12)' : 'rgba(23, 105, 255, 0.05)',
              boxShadow: b.isActive
                ? '0 0 14px rgba(23, 105, 255, 0.65), inset 0 0 8px rgba(23, 105, 255, 0.3)'
                : 'none',
              borderRadius: '4px',
              opacity: b.opacity,
              transition: 'opacity 0.15s ease-out',
            }}
          >
            {/* Tactical Corner Brackets */}
            <span style={{ position: 'absolute', top: -2, left: -2, width: 7, height: 7, borderTop: '2.5px solid #60a5fa', borderLeft: '2.5px solid #60a5fa' }} />
            <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderTop: '2.5px solid #60a5fa', borderRight: '2.5px solid #60a5fa' }} />
            <span style={{ position: 'absolute', bottom: -2, left: -2, width: 7, height: 7, borderBottom: '2.5px solid #60a5fa', borderLeft: '2.5px solid #60a5fa' }} />
            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 7, height: 7, borderBottom: '2.5px solid #60a5fa', borderRight: '2.5px solid #60a5fa' }} />

            {/* HUD Target Badge */}
            <div
              style={{
                position: 'absolute',
                bottom: b.topPct < 14 ? '-24px' : 'calc(100% + 3px)',
                left: 0,
                backgroundColor: b.isActive ? '#1769FF' : 'rgba(15, 23, 42, 0.85)',
                color: '#ffffff',
                fontSize: '0.66rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                letterSpacing: '0.02em',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: b.isActive ? '#38bdf8' : '#94a3b8',
                  display: 'inline-block',
                }}
              />
              <span>{b.label}</span>
              {b.confidence && (
                <span style={{ opacity: 0.85, fontSize: '0.60rem' }}>
                  {Math.round(b.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // If no cameras uploaded, show clean prompt instead of blank video cards!
  if (!cameras || cameras.length === 0) {
    return (
      <div
        className="section-box-card"
        style={{
          padding: '3.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          minHeight: '360px',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
          }}
        >
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
              gap: '8px',
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
        gap: '1rem',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  title={showBoundingBoxes ? 'Target Bounding Boxes: ON (Click to toggle)' : 'Target Bounding Boxes: OFF (Click to toggle)'}
                  style={{
                    background: showBoundingBoxes ? '#eff6ff' : 'transparent',
                    border: showBoundingBoxes ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                    color: showBoundingBoxes ? '#1d4ed8' : '#94a3b8',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                  }}
                >
                  <Scan size={12} />
                  <span>{showBoundingBoxes ? 'BOX ON' : 'BOX OFF'}</span>
                </button>
                <div className="cctv-live-tag mono">
                  <span className="rec-dot" />
                  <span>CH-0{idx + 1}</span>
                </div>
              </div>
            </div>

            {/* Video Surface with Relative Overlay */}
            <div className="cctv-video-frame" style={{ position: 'relative', overflow: 'hidden' }}>
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
                  if (e.target.videoWidth && e.target.videoHeight) {
                    setVideoDimensions((prev) => ({
                      ...prev,
                      [camId]: { w: e.target.videoWidth, h: e.target.videoHeight },
                    }));
                  }
                }}
              />

              {/* Dynamic Interpolated Bounding Box Overlay */}
              {renderBoundingBoxes(camId)}
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
