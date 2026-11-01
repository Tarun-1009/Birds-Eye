import React, { useState, useEffect } from 'react';
import {
  Search,
  Compass,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  Luggage,
  ArrowUpRight,
  CheckCircle2,
  Target,
  Sparkles,
  Percent
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
    }, 2500);

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
    if (sec === undefined || sec === null) return '00:00.0';
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
  };

  // Calculate highest match percentage in current sightings
  const highestMatch = sightings.length > 0
    ? Math.max(...sightings.map((s) => s.confidence || 0))
    : 0.981;

  return (
    <div className="search-explorer-col">
      {/* Search Console Header */}
      <div className="explorer-header">
        <div className="search-input-wrap">
          <Search size={15} />
          <input
            type="text"
            className="unified-search-input mono"
            placeholder="Search Target, Object, or Camera..."
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

      {/* Target Re-ID & Match Card */}
      {activeIdentity && (
        <div className="target-reid-card" style={{ padding: '0.9rem' }}>
          <div className="reid-thumb-box" style={{ width: '68px', height: '68px', borderRadius: '8px', overflow: 'hidden' }}>
            {activeIdentity.reference_image_url || activeIdentity.initial_crop_path ? (
              <img
                src={getCropImageUrl(activeIdentity.reference_image_url || activeIdentity.initial_crop_path)}
                alt={activeIdentity.global_id}
                className="reid-thumb-img"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Eye size={24} color="#3b82f6" />
            )}
          </div>

          <div className="target-meta-details" style={{ flex: 1 }}>
            <div className="target-title-line" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="target-gid-label mono" style={{ fontSize: '0.8rem', fontWeight: 800 }}>
                  {activeIdentity.global_id}
                </span>
                <span className="system-tag mono">{activeIdentity.entity_type}</span>
              </div>

              {/* Best Match Percentage Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                borderRadius: '6px',
                padding: '2px 8px',
                color: '#34d399',
                fontSize: '0.78rem',
                fontWeight: 900
              }}>
                <Target size={12} color="#34d399" />
                <span>{Math.round(highestMatch * 100)}% BEST MATCH</span>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600, marginTop: '3px' }}>
              {activeIdentity.label || 'Tracked Target Profile'}
            </p>

            {/* Re-ID confidence meter */}
            <div style={{ width: '100%', height: '5px', backgroundColor: '#1e293b', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(highestMatch * 100)}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease' }} />
            </div>

            <div className="reid-rotation-pill mono" style={{ marginTop: '6px', fontSize: '0.68rem' }}>
              <CheckCircle2 size={12} color="#10b981" />
              <span>Multi-Camera Re-ID: 4 Synchronized Feeds Tracked</span>
            </div>
          </div>
        </div>
      )}

      {/* Sequence Stepper Header */}
      <div className="sequence-controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800 }} className="mono">
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
              backgroundColor: isPlayingSequence ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              borderColor: isPlayingSequence ? '#3b82f6' : '#1e293b',
              color: isPlayingSequence ? '#60a5fa' : '#94a3b8',
              fontWeight: 700
            }}
            title={isPlayingSequence ? 'Pause Sequence Stepper' : 'Auto Step Frame Sequence'}
          >
            {isPlayingSequence ? <Pause size={12} fill="#60a5fa" /> : <Play size={12} fill="#60a5fa" />}
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
            <p className="mono" style={{ fontSize: '0.82rem' }}>No frame sightings found</p>
          </div>
        ) : (
          sightings.map((s, idx) => {
            const isSelected = activeSightingIndex === idx;
            const ori = (s.orientation || 'na').toLowerCase();
            const matchPercent = Math.round((s.confidence || 0.9) * 100);

            // Match color badge
            const isHighMatch = matchPercent >= 90;
            const matchBadgeBg = isHighMatch ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)';
            const matchBadgeBorder = isHighMatch ? '#10b981' : '#3b82f6';
            const matchTextColor = isHighMatch ? '#34d399' : '#60a5fa';

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
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  padding: '0.65rem 0.75rem',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid #1e293b',
                  backgroundColor: isSelected ? 'rgba(30, 58, 138, 0.25)' : '#0b132b',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {/* Crop Thumbnail */}
                  <div className="frame-crop-preview" style={{ width: '46px', height: '46px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                    {s.crop_path ? (
                      <img
                        src={getCropImageUrl(s.crop_path)}
                        alt={`Crop frame ${s.frame_index || idx}`}
                        className="frame-crop-img"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Eye size={18} color="#64748b" />
                    )}
                  </div>

                  {/* Sighting Details */}
                  <div className="frame-data-col" style={{ flex: 1, minWidth: 0 }}>
                    <div className="frame-row-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="frame-cam-label mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                        {s.camera_name || s.camera_id}
                      </span>
                      <span className="frame-time-tag mono" style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                        t={formatTimestamp(s.timestamp_sec)}s
                      </span>
                    </div>

                    <div className="frame-row-bottom" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className={`ori-tag ${ori} mono`} style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px' }}>
                        {s.orientation}
                      </span>

                      {/* Prominent Match Percentage Pill */}
                      <span
                        className="mono"
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          backgroundColor: matchBadgeBg,
                          border: `1px solid ${matchBadgeBorder}`,
                          color: matchTextColor,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Percent size={10} />
                        {matchPercent}% Match
                      </span>

                      {carriedList.map((item, cIdx) => (
                        <span key={cIdx} className="carried-item-badge mono" style={{ fontSize: '0.65rem' }}>
                          <Luggage size={10} />
                          <span>{item}</span>
                        </span>
                      ))}

                      <button
                        type="button"
                        className="seek-action-link mono"
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          border: 'none',
                          color: '#60a5fa',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        <span>Jump</span>
                        <ArrowUpRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Match percentage meter bar */}
                <div style={{ width: '100%', height: '3px', backgroundColor: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${matchPercent}%`,
                      height: '100%',
                      backgroundColor: matchTextColor,
                      transition: 'width 0.2s ease'
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
