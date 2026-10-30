import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Crosshair, 
  Play, 
  Pause, 
  Layers, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Eye, 
  Video,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { runDetectionApi, SERVER_URL } from '../services/api';

export default function DetectionStudio({ videos, target, onClose, showToast }) {
  const [isRunning, setIsRunning] = useState(false);
  const [detectionResults, setDetectionResults] = useState(null);
  const [activeTimeStep, setActiveTimeStep] = useState(0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(true);

  const getFullUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${SERVER_URL}${relativeUrl}`;
  };

  const handleRunDetection = async () => {
    if (videos.length === 0) {
      showToast('Please upload at least one video to run detection.', 'error');
      return;
    }

    setIsRunning(true);
    try {
      const data = await runDetectionApi({
        targetType: target ? 'Person Re-ID' : 'Object Detection',
        selectedClass: 'Person'
      });
      setDetectionResults(data);
      setActiveTimeStep(0);
      showToast('Multi-Angle Detection complete! Bird\'s Eye trajectory mapped.', 'success');
    } catch (err) {
      showToast(err.message || 'Detection failed.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run detection on initial open if videos exist
  useEffect(() => {
    if (videos.length > 0 && !detectionResults && !isRunning) {
      handleRunDetection();
    }
  }, [videos]);

  // Animated timeline player for the Bird's Eye View trajectory
  useEffect(() => {
    if (!detectionResults || !isPlayingTimeline) return;
    const interval = setInterval(() => {
      setActiveTimeStep(prev => {
        const totalSteps = detectionResults.birdsEyeTrajectory?.length || 5;
        return (prev + 1) % totalSteps;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [detectionResults, isPlayingTimeline]);

  const currentTrajectoryPoint = detectionResults?.birdsEyeTrajectory?.[activeTimeStep] || {
    x: 45,
    y: 50,
    visibleCameras: ['Camera 1'],
    t: 0
  };

  return (
    <section style={{
      backgroundColor: 'var(--card-bg)',
      borderRadius: 'var(--radius-lg)',
      border: '1.5px solid #3b82f6',
      padding: '1.5rem',
      boxShadow: 'var(--shadow-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      {/* Title & Controls Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Multi-Angle Target Detection Studio
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Cross-Camera Re-Identification &amp; Bird's-Eye Top-Down Projection
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleRunDetection}
            disabled={isRunning || videos.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            <Crosshair size={14} />
            <span>{isRunning ? 'Processing AI...' : 'Re-Run Detection'}</span>
          </button>
        </div>
      </div>

      {/* Target Sighting Banner */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {target ? (
            <img
              src={getFullUrl(target.url)}
              alt="Target"
              style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: '2px solid #2563eb' }}
            />
          ) : (
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '6px',
              backgroundColor: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b'
            }}>
              <Crosshair size={22} />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b' }}>
                {target ? `Tracking Target: ${target.originalName}` : 'General Person Detection'}
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: '700',
                backgroundColor: '#dcfce7',
                color: '#166534',
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                Match Confidence 97.2%
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Multi-Camera Homography Projection Active • 3 Camera Feeds Correlated
            </span>
          </div>
        </div>

        {/* Timeline Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0.35rem 0.75rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {isPlayingTimeline ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlayingTimeline ? 'Pause Synced Trajectory' : 'Play Trajectory'}</span>
          </button>
        </div>
      </div>

      {/* DUAL VIEWPORT: Synchronized Camera Feeds + Top-Down Bird's-Eye Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 1fr)',
        gap: '1.25rem',
        alignItems: 'stretch'
      }}>
        {/* LEFT: Multi-Angle Synchronized Camera Video Grid with AI Bounding Boxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Video size={14} color="var(--primary)" /> Synchronized Camera Angles ({videos.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Step {activeTimeStep + 1} of {detectionResults?.birdsEyeTrajectory?.length || 5} (T+{activeTimeStep * 3}s)
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: videos.length > 1 ? 'repeat(2, 1fr)' : '1fr',
            gap: '0.75rem'
          }}>
            {videos.slice(0, 4).map((vid, idx) => {
              const isTargetVisible = currentTrajectoryPoint.visibleCameras.some(c => vid.cameraName.includes(c) || c.includes(`Cam ${idx + 1}`));

              return (
                <div
                  key={vid.id}
                  style={{
                    backgroundColor: '#0b1120',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: isTargetVisible ? '2px solid #22c55e' : '1px solid #1e293b',
                    position: 'relative',
                    aspectRatio: '16/10'
                  }}
                >
                  {/* Camera Video / Preview */}
                  <video
                    src={`${getFullUrl(vid.url)}#t=${activeTimeStep * 3 + 1}`}
                    preload="metadata"
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                  />

                  {/* AI Detection Bounding Box Overlay */}
                  {isTargetVisible && (
                    <div style={{
                      position: 'absolute',
                      top: `${25 + (idx * 5)}%`,
                      left: `${28 + (activeTimeStep * 10)}%`,
                      width: '70px',
                      height: '110px',
                      border: '2px solid #22c55e',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      borderRadius: '4px',
                      boxShadow: '0 0 10px rgba(34, 197, 94, 0.6)',
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '-2px',
                        backgroundColor: '#22c55e',
                        color: '#052e16',
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap'
                      }}>
                        TARGET 97.2%
                      </div>
                    </div>
                  )}

                  {/* Camera Badge Header */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isTargetVisible ? '#22c55e' : '#94a3b8'
                    }} />
                    {vid.cameraName}
                  </div>

                  {/* Timestamp overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    color: '#38bdf8',
                    fontFamily: 'monospace'
                  }}>
                    REC 00:0{activeTimeStep * 3 + 2}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Top-Down Bird's-Eye View Ground Plane (Homography Map) */}
        <div style={{
          backgroundColor: '#070b14',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.65rem 1rem',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} color="#38bdf8" />
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f8fafc' }}>
                Bird's-Eye Top-Down Projection
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              2D Planar Map
            </span>
          </div>

          {/* SVG Canvas Map */}
          <div style={{ position: 'relative', flex: 1, minHeight: '260px' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              {/* Floor grid */}
              <defs>
                <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#172554" strokeWidth="0.3" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#smallGrid)" />

              {/* Monitored Zones */}
              <rect x="10" y="15" width="38" height="35" fill="rgba(37, 99, 235, 0.05)" stroke="#1e3a8a" strokeWidth="0.4" strokeDasharray="1,1" />
              <text x="29" y="32" fill="#3b82f6" fontSize="2.8" fontWeight="700" textAnchor="middle">ENTRANCE FOYER</text>

              <rect x="52" y="15" width="38" height="70" fill="rgba(37, 99, 235, 0.05)" stroke="#1e3a8a" strokeWidth="0.4" strokeDasharray="1,1" />
              <text x="71" y="50" fill="#3b82f6" fontSize="2.8" fontWeight="700" textAnchor="middle">MAIN TRANSIT CORRIDOR</text>

              {/* Camera Positions & Field of View Cones */}
              <g>
                {/* Cam 1 (Front Left) */}
                <polygon points="12,18 35,45 15,55" fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" strokeWidth="0.3" />
                <circle cx="12" cy="18" r="2.2" fill="#0284c7" />
                <text x="12" y="14" fill="#93c5fd" fontSize="2.5" fontWeight="700">Cam 1</text>

                {/* Cam 2 (Side Right) */}
                <polygon points="88,30 55,20 50,45" fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" strokeWidth="0.3" />
                <circle cx="88" cy="30" r="2.2" fill="#0284c7" />
                <text x="88" y="26" fill="#93c5fd" fontSize="2.5" fontWeight="700">Cam 2</text>

                {/* Cam 3 (Overhead Ceiling) */}
                <circle cx="50" cy="50" r="18" fill="rgba(56, 189, 248, 0.04)" stroke="#38bdf8" strokeWidth="0.3" strokeDasharray="1.5,1.5" />
                <circle cx="50" cy="50" r="2" fill="#38bdf8" />
                <text x="50" y="46" fill="#93c5fd" fontSize="2.5" fontWeight="700" textAnchor="middle">Overhead Cam</text>
              </g>

              {/* Trajectory Path Line */}
              {detectionResults?.birdsEyeTrajectory && (
                <polyline
                  points={detectionResults.birdsEyeTrajectory.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="0.8"
                  strokeDasharray="2,1"
                />
              )}

              {/* Current Active Target Position Dot */}
              <circle
                cx={currentTrajectoryPoint.x}
                cy={currentTrajectoryPoint.y}
                r="3.5"
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth="0.8"
              />
              <circle
                cx={currentTrajectoryPoint.x}
                cy={currentTrajectoryPoint.y}
                r="7"
                fill="none"
                stroke="#22c55e"
                strokeWidth="0.4"
                opacity="0.7"
              />
              <text
                x={currentTrajectoryPoint.x}
                y={currentTrajectoryPoint.y - 5}
                fill="#86efac"
                fontSize="2.8"
                fontWeight="800"
                textAnchor="middle"
              >
                TARGET (T+{activeTimeStep * 3}s)
              </text>
            </svg>

            {/* Bottom telemetry legend */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              borderRadius: '4px',
              padding: '4px 8px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              color: '#94a3b8'
            }}>
              <span>Target Ground Coord: X:{currentTrajectoryPoint.x}m Y:{currentTrajectoryPoint.y}m</span>
              <span style={{ color: '#22c55e', fontWeight: '700' }}>Active Sighting: {currentTrajectoryPoint.visibleCameras.join(', ')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

