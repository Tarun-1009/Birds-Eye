import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpRight,
  User,
  Layers,
  CheckCircle2,
  Scan,
  Compass,
  Sparkles
} from 'lucide-react';
import { getCropImageUrl } from '../services/api';

export default function SequenceExplorer({
  sightings = [],
  identities = [],
  searchQuery,
  onSearchChange,
  activeOrientation,
  onOrientationChange,
  activeEntityFilter,
  onEntityFilterChange,
  activeSightingIndex,
  onSelectSightingIndex,
  onSeekCamera,
}) {
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  // Selected object/identity ID ('ALL' or specific global_id like 'person_001')
  const [selectedIdentityId, setSelectedIdentityId] = useState(null);
  // Default to clean progressive key moments (eliminates duplicate consecutive same-camera frames)
  const [onlyKeyframes, setOnlyKeyframes] = useState(true);

  // Default to the first detected identity if none selected
  useEffect(() => {
    if (!selectedIdentityId && identities.length > 0) {
      setSelectedIdentityId(identities[0].global_id);
    }
  }, [identities, selectedIdentityId]);

  // Filter sightings by selected object
  const objectSightings = useMemo(() => {
    if (!selectedIdentityId || selectedIdentityId === 'ALL') {
      return sightings;
    }
    return sightings.filter((s) => s.global_id === selectedIdentityId);
  }, [sightings, selectedIdentityId]);

  // Active identity details
  const activeIdentity = useMemo(() => {
    return identities.find((id) => id.global_id === selectedIdentityId) || identities[0] || null;
  }, [identities, selectedIdentityId]);

  // Progressive Non-Repetitive Sightings (eliminates feeling of repeating same video)
  const displaySightings = useMemo(() => {
    let list = objectSightings;
    if (activeOrientation && activeOrientation !== 'ALL') {
      list = list.filter((s) => (s.orientation || '').toUpperCase() === activeOrientation.toUpperCase());
    }
    if (!onlyKeyframes) return list;

    // Filter out redundant consecutive frames (same camera, same angle, within 1.8s)
    const filtered = [];
    let lastCam = null;
    let lastOri = null;
    let lastTime = -999;

    for (const s of list) {
      const isNewCam = s.camera_id !== lastCam;
      const isNewOri = s.orientation !== lastOri;
      const timeDiff = Math.abs(s.timestamp_sec - lastTime);

      if (isNewCam || isNewOri || timeDiff >= 1.8) {
        filtered.push(s);
        lastCam = s.camera_id;
        lastOri = s.orientation;
        lastTime = s.timestamp_sec;
      }
    }
    return filtered;
  }, [objectSightings, activeOrientation, onlyKeyframes]);

  // Camera journey path breadcrumb across the facility
  const cameraJourney = useMemo(() => {
    const journey = [];
    let lastCam = null;
    displaySightings.forEach((s, idx) => {
      if (s.camera_id !== lastCam) {
        journey.push({
          camera_id: s.camera_id,
          camera_name: s.camera_name || s.camera_id,
          timestamp_sec: s.timestamp_sec,
          orientation: s.orientation,
          sightingIndex: idx,
        });
        lastCam = s.camera_id;
      }
    });
    return journey;
  }, [displaySightings]);

  // Auto-step timeline player through this object's frames
  // STOPS when reaching the end so it doesn't loop endlessly and feel like repeating!
  useEffect(() => {
    if (!isPlayingSequence || displaySightings.length === 0) return;

    const interval = setInterval(() => {
      onSelectSightingIndex((prev) => {
        if (prev + 1 >= displaySightings.length) {
          setIsPlayingSequence(false); // Stop at end of sequence!
          return prev;
        }
        const next = prev + 1;
        const nextSighting = displaySightings[next];
        if (nextSighting && onSeekCamera) {
          onSeekCamera(nextSighting.camera_id, nextSighting.timestamp_sec);
        }
        return next;
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [isPlayingSequence, displaySightings, onSelectSightingIndex, onSeekCamera]);

  const handleStepPrev = () => {
    if (displaySightings.length === 0) return;
    const nextIdx = activeSightingIndex > 0 ? activeSightingIndex - 1 : displaySightings.length - 1;
    onSelectSightingIndex(nextIdx);
    const s = displaySightings[nextIdx];
    if (s && onSeekCamera) {
      onSeekCamera(s.camera_id, s.timestamp_sec);
    }
  };

  const handleStepNext = () => {
    if (displaySightings.length === 0) return;
    const nextIdx = (activeSightingIndex + 1) % displaySightings.length;
    onSelectSightingIndex(nextIdx);
    const s = displaySightings[nextIdx];
    if (s && onSeekCamera) {
      onSeekCamera(s.camera_id, s.timestamp_sec);
    }
  };

  const orientationFilters = [
    { id: 'ALL', label: 'All Angles' },
    { id: 'FRONT', label: 'Front' },
    { id: 'BACK', label: 'Back' },
    { id: 'SIDE', label: 'Side' },
  ];

  const formatTimestamp = (sec) => {
    if (sec === undefined || sec === null) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const parseOrientations = (ident) => {
    if (!ident) return ['FRONT'];
    if (ident.observed_orientations) {
      return ident.observed_orientations.split(',').filter(Boolean);
    }
    return ['FRONT'];
  };

  return (
    <div className="sequence-panel-light" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      
      {/* ============================================================ */}
      {/* SECTION 1: LIST OF ALL SAME OBJECTS (CONSIDERING ROTATED SAME) */}
      {/* ============================================================ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scan size={16} color="#2563eb" />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
              1. Identified Objects
            </span>
            <span className="mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>
              ({identities.length} unique targets)
            </span>
          </div>

          {identities.length > 1 && (
            <button
              type="button"
              className={`light-chip-btn ${selectedIdentityId === 'ALL' ? 'active' : ''}`}
              onClick={() => {
                setSelectedIdentityId('ALL');
                onSelectSightingIndex(0);
              }}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}
            >
              All Objects Combined
            </button>
          )}
        </div>

        <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0, lineHeight: 1.35 }}>
          Rotation-invariant gallery: Front, Back, and Side rotations are recognized as the <b>same object</b>. Click an object to see its progressive sequence.
        </p>

        {/* Objects Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: identities.length > 1 ? 'repeat(auto-fill, minmax(220px, 1fr))' : '1fr',
          gap: '0.65rem'
        }}>
          {identities.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.82rem' }}>
              No targets detected yet. Upload camera feeds to extract targets.
            </div>
          ) : (
            identities.map((ident) => {
              const isSelected = selectedIdentityId === ident.global_id;
              const angles = parseOrientations(ident);
              const thumbUrl = getCropImageUrl(ident.initial_crop_path || ident.reference_image_url);

              return (
                <div
                  key={ident.global_id}
                  onClick={() => {
                    setSelectedIdentityId(ident.global_id);
                    onSelectSightingIndex(0);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.15)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Object Thumbnail */}
                  <div style={{
                    width: '46px',
                    height: '56px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={ident.label || ident.global_id}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <User size={18} color="#94a3b8" />
                    )}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: '#2563eb',
                        borderRadius: '50%',
                        width: '14px',
                        height: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                      }}>
                        <CheckCircle2 size={10} />
                      </div>
                    )}
                  </div>

                  {/* Object Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: isSelected ? '#1e40af' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ident.label || ident.global_id}
                      </span>
                      <span className="mono" style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 600 }}>
                        {ident.total_sightings || 0} frames
                      </span>
                    </div>

                    {/* Rotated Orientation Badges (Proof of Rotation Invariance) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                      {angles.map((ang, aIdx) => {
                        const angNorm = ang.toUpperCase().trim();
                        let bg = '#dbeafe';
                        let textCol = '#1e40af';
                        if (angNorm === 'BACK') {
                          bg = '#dcfce7';
                          textCol = '#166534';
                        } else if (angNorm === 'LEFT' || angNorm === 'RIGHT' || angNorm === 'SIDE') {
                          bg = '#fef3c7';
                          textCol = '#92400e';
                        }
                        return (
                          <span
                            key={aIdx}
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: bg,
                              color: textCol,
                              letterSpacing: '0.3px'
                            }}
                            title={`Observed from ${angNorm} angle - unified under this object`}
                          >
                            {angNorm}
                          </span>
                        );
                      })}
                    </div>

                    {/* Cameras visited */}
                    <span className="mono" style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ident.observed_cameras ? `Cameras: ${ident.observed_cameras}` : 'All feeds'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.1rem 0' }} />

      {/* ============================================================ */}
      {/* SECTION 2: CHRONOLOGICAL SEQUENCE WITH BOUNDING BOX */}
      {/* ============================================================ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {/* Header with Title and Stepper Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Layers size={16} color="#2563eb" />
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                2. Frame Sequence with Bounding Box
              </span>
            </div>
            <span className="mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {activeIdentity ? `Target: ${activeIdentity.label || activeIdentity.global_id}` : 'Selected Target'}
              {' · '}
              {displaySightings.length > 0 ? `Step ${activeSightingIndex + 1} of ${displaySightings.length}` : '0 frames'}
            </span>
          </div>

          {/* Stepper Buttons: Prev, Play/Pause, Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className="light-chip-btn"
              onClick={handleStepPrev}
              disabled={displaySightings.length <= 1}
              title="Previous Frame"
              style={{ padding: '0.3rem 0.55rem' }}
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              className={`light-chip-btn ${isPlayingSequence ? 'active' : ''}`}
              onClick={() => setIsPlayingSequence(!isPlayingSequence)}
              title={isPlayingSequence ? 'Pause Sequence' : 'Auto-Step Sequence (stops at end)'}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.3rem 0.65rem' }}
            >
              {isPlayingSequence ? <Pause size={13} /> : <Play size={13} />}
              <span style={{ fontSize: '0.72rem' }}>{isPlayingSequence ? 'Pause' : 'Play Sequence'}</span>
            </button>

            <button
              type="button"
              className="light-chip-btn"
              onClick={handleStepNext}
              disabled={displaySightings.length <= 1}
              title="Next Frame"
              style={{ padding: '0.3rem 0.55rem' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Camera Journey Path Breadcrumbs (Shows movement across cameras) */}
        {cameraJourney.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            overflowX: 'auto',
            padding: '0.4rem 0.6rem',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
              Target Journey:
            </span>
            {cameraJourney.map((step, sIdx) => (
              <React.Fragment key={sIdx}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSightingIndex(step.sightingIndex);
                    if (onSeekCamera) onSeekCamera(step.camera_id, step.timestamp_sec);
                  }}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title={`Jump to ${step.camera_name} (t=${formatTimestamp(step.timestamp_sec)})`}
                >
                  {step.camera_name || step.camera_id} ({step.orientation})
                </button>
                {sIdx < cameraJourney.length - 1 && (
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>➔</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Controls Bar: Angle Filter + Deduplication Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="light-filter-strip" style={{ flex: 1, minWidth: '220px' }}>
            {orientationFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`light-filter-btn ${activeOrientation === f.id ? 'active' : ''}`}
                onClick={() => onOrientationChange(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`light-chip-btn ${onlyKeyframes ? 'active' : ''}`}
            onClick={() => setOnlyKeyframes(!onlyKeyframes)}
            style={{ fontSize: '0.68rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Hides repetitive consecutive frames from the same video"
          >
            <Sparkles size={11} />
            <span>{onlyKeyframes ? 'Key Moments (Clean)' : 'Show All Raw Frames'}</span>
          </button>
        </div>

        {/* Chronological Sequence Cards List */}
        <div className="sequence-cards-list-light" style={{ maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {displaySightings.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
              <p style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0f172a' }}>
                No frame sightings for this target.
              </p>
              <p style={{ fontSize: '0.76rem', marginTop: '0.3rem', color: '#64748b' }}>
                Select another object above or click "All Objects Combined".
              </p>
            </div>
          ) : (
            displaySightings.map((s, idx) => {
              const isSelected = activeSightingIndex === idx;
              const ori = (s.orientation || 'FRONT').toUpperCase();
              let oriBg = '#dbeafe';
              let oriCol = '#1e40af';
              if (ori === 'BACK') {
                oriBg = '#dcfce7';
                oriCol = '#166534';
              } else if (ori === 'RIGHT' || ori === 'LEFT' || ori === 'SIDE') {
                oriBg = '#fef3c7';
                oriCol = '#92400e';
              }

              return (
                <div
                  key={s.id || idx}
                  className={`sighting-card-clean ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    onSelectSightingIndex(idx);
                    if (onSeekCamera) {
                      onSeekCamera(s.camera_id, s.timestamp_sec);
                    }
                  }}
                  style={{
                    padding: '0.55rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    borderRadius: '8px',
                    position: 'relative'
                  }}
                >
                  {/* Visual Bounding Box Thumbnail */}
                  <div style={{
                    position: 'relative',
                    width: '54px',
                    height: '66px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: '#0f172a',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #2563eb'
                  }}>
                    {s.crop_path ? (
                      <img
                        src={getCropImageUrl(s.crop_path)}
                        alt={`Detection ${idx}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Eye size={16} color="#94a3b8" />
                    )}

                    {/* HUD Bounding Box Reticle Corners */}
                    <div style={{
                      position: 'absolute',
                      inset: '2px',
                      border: '1.5px dashed rgba(37, 99, 235, 0.75)',
                      pointerEvents: 'none',
                      borderRadius: '2px'
                    }} />
                  </div>

                  {/* Sighting Details Column */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {/* Top Row: Camera + Timestamp */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                        {s.camera_name || s.camera_id}
                      </span>
                      <span className="mono" style={{ fontSize: '0.74rem', fontWeight: 600, color: '#2563eb' }}>
                        t={formatTimestamp(s.timestamp_sec)}
                      </span>
                    </div>

                    {/* Middle Row: Bounding Box Coordinates + Confidence */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="mono" style={{
                        fontSize: '0.66rem',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: '1px solid #e2e8f0',
                        fontWeight: 600
                      }}>
                        Box: {s.bbox_w ? Math.round(s.bbox_w) : 0}×{s.bbox_h ? Math.round(s.bbox_h) : 0} at ({s.bbox_x ? Math.round(s.bbox_x) : 0},{s.bbox_y ? Math.round(s.bbox_y) : 0})
                      </span>

                      {s.confidence && (
                        <span className="mono" style={{
                          fontSize: '0.66rem',
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 600
                        }}>
                          Conf: {(s.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Orientation Badge + Seek Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: oriBg,
                        color: oriCol
                      }}>
                        Angle: {ori}
                      </span>

                      <button
                        type="button"
                        className="seek-btn-clean"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSightingIndex(idx);
                          if (onSeekCamera) {
                            onSeekCamera(s.camera_id, s.timestamp_sec);
                          }
                        }}
                        title="Seek video stream to this exact frame"
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span>Seek Video</span>
                        <ArrowUpRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
