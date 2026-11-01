import React, { useState, useEffect } from 'react';
import {
  Search,
  Compass,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Sparkles,
  Luggage,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2
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

  // Auto-play timeline step through frame-to-frame sequence
  useEffect(() => {
    if (!isPlayingSequence || sightings.length === 0) return;

    const interval = setInterval(() => {
      onSelectSightingIndex((prev) => {
        const next = (prev + 1) % sightings.length;
        const nextSighting = sightings[next];
        if (nextSighting && onSeekCamera) {
          onSeekCamera(nextSighting.camera_id, nextSighting.timestamp_sec);
        }
        return next;
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [isPlayingSequence, sightings, onSelectSightingIndex, onSeekCamera]);

  const currentSighting = sightings[activeSightingIndex] || sightings[0] || null;

  // Active target identity metadata
  const activeIdentity = identities.find(
    (id) => currentSighting && id.global_id === currentSighting.global_id
  ) || identities[0] || null;

  const handleStepPrev = () => {
    if (sightings.length === 0) return;
    const nextIdx = activeSightingIndex > 0 ? activeSightingIndex - 1 : sightings.length - 1;
    onSelectSightingIndex(nextIdx);
    const s = sightings[nextIdx];
    if (s && onSeekCamera) {
      onSeekCamera(s.camera_id, s.timestamp_sec);
    }
  };

  const handleStepNext = () => {
    if (sightings.length === 0) return;
    const nextIdx = (activeSightingIndex + 1) % sightings.length;
    onSelectSightingIndex(nextIdx);
    const s = sightings[nextIdx];
    if (s && onSeekCamera) {
      onSeekCamera(s.camera_id, s.timestamp_sec);
    }
  };

  const orientationFilters = [
    { id: 'ALL', label: 'ALL ORIENTATIONS' },
    { id: 'FRONT', label: 'FRONT' },
    { id: 'BACK', label: 'BACK' },
    { id: 'SIDE', label: 'SIDE' },
  ];

  const formatTimestamp = (sec) => {
    if (sec === undefined || sec === null) return '00:00';
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
  };

  return (
    <div className="search-explorer-col">
      {/* Search Console Header */}
      <div className="explorer-header">
        <div className="search-input-wrap">
          <Search size={15} />
          <input
            type="text"
            className="unified-search-input mono"
            placeholder="Search Person (GID-101), Object (backpack, car), or Cam..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Orientation Filter Chips */}
        <div className="orientation-filter-strip">
          {orientationFilters.map((f) => (
            <button
              key={f.id}
              className={`filter-chip-btn ${activeOrientation === f.id ? 'active' : ''}`}
              onClick={() => onOrientationChange(f.id)}
            >
              <Compass size={12} />
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Target Re-ID & Rotation Card */}
      {activeIdentity && (
        <div className="target-reid-card">
          <div className="reid-thumb-box">
            {activeIdentity.reference_image_url || activeIdentity.initial_crop_path ? (
              <img
                src={getCropImageUrl(activeIdentity.reference_image_url || activeIdentity.initial_crop_path)}
                alt={activeIdentity.global_id}
                className="reid-thumb-img"
              />
            ) : (
              <Eye size={22} color="#3b82f6" />
            )}
          </div>

          <div className="target-meta-details">
            <div className="target-title-line">
              <span className="target-gid-label mono">{activeIdentity.global_id}</span>
              <span className="system-tag mono">{activeIdentity.entity_type}</span>
            </div>

            <p style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
              {activeIdentity.label || 'Tracked Target Profile'}
            </p>

            <div className="reid-rotation-pill mono">
              <Sparkles size={11} color="#60a5fa" />
              <span>Rotation-Invariant Re-ID: Torso (70%) + Body (30%) Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Sequence Stepper Header */}
      <div className="sequence-controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700 }} className="mono">
            FRAME SEQUENCE
          </span>
          <span className="mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>
            ({sightings.length > 0 ? activeSightingIndex + 1 : 0} of {sightings.length})
          </span>
        </div>

        <div className="step-btns-group">
          <button
            className="step-btn mono"
            onClick={handleStepPrev}
            disabled={sightings.length <= 1}
            title="Step Previous Frame"
          >
            <ChevronLeft size={13} />
            <span>Prev</span>
          </button>

          <button
            className="step-btn mono"
            onClick={() => setIsPlayingSequence(!isPlayingSequence)}
            style={{
              backgroundColor: isPlayingSequence ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              borderColor: isPlayingSequence ? '#3b82f6' : '#1e293b',
              color: isPlayingSequence ? '#60a5fa' : '#94a3b8'
            }}
            title={isPlayingSequence ? 'Pause Sequence' : 'Auto Play Frame Sequence'}
          >
            {isPlayingSequence ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlayingSequence ? 'Pause' : 'Play'}</span>
          </button>

          <button
            className="step-btn mono"
            onClick={handleStepNext}
            disabled={sightings.length <= 1}
            title="Step Next Frame"
          >
            <span>Next</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Chronological Frame Sequence List */}
      <div className="sequence-feed-list">
        {sightings.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <p className="mono" style={{ fontSize: '0.82rem' }}>No frame sightings found for current search</p>
          </div>
        ) : (
          sightings.map((s, idx) => {
            const isSelected = activeSightingIndex === idx;
            const ori = (s.orientation || 'na').toLowerCase();
            let carriedList = [];
            try {
              if (s.carried_items) {
                carriedList = typeof s.carried_items === 'string' ? JSON.parse(s.carried_items) : s.carried_items;
              }
            } catch (e) {
              carriedList = [];
            }

            return (
              <div
                key={s.id || idx}
                className={`frame-sighting-card ${isSelected ? 'active-step' : ''}`}
                onClick={() => {
                  onSelectSightingIndex(idx);
                  if (onSeekCamera) {
                    onSeekCamera(s.camera_id, s.timestamp_sec);
                  }
                }}
              >
                {/* Crop Thumbnail */}
                <div className="frame-crop-preview">
                  {s.crop_path ? (
                    <img
                      src={getCropImageUrl(s.crop_path)}
                      alt={`Crop frame ${s.frame_index || idx}`}
                      className="frame-crop-img"
                    />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </div>

                {/* Sighting Details */}
                <div className="frame-data-col">
                  <div className="frame-row-top">
                    <span className="frame-cam-label mono">
                      {s.camera_name || s.camera_id}
                    </span>
                    <span className="frame-time-tag mono">
                      t={formatTimestamp(s.timestamp_sec)}s
                    </span>
                  </div>

                  <div className="frame-row-bottom">
                    <span className={`ori-tag ${ori} mono`}>
                      {s.orientation}
                    </span>

                    <span className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {(s.confidence * 100).toFixed(0)}% conf
                    </span>

                    {s.global_id && (
                      <span className="mono" style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 700 }}>
                        {s.global_id}
                      </span>
                    )}

                    {carriedList.map((item, cIdx) => (
                      <span key={cIdx} className="carried-item-badge mono">
                        <Luggage size={10} />
                        <span>{item}</span>
                      </span>
                    ))}

                    <button className="seek-action-link mono">
                      <span>Jump</span>
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
  );
}
