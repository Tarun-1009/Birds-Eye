import React, { useState, useEffect } from 'react';
import {
  Search,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  ArrowUpRight,
  Luggage,
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

  // Auto-step timeline player
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

  const quickSearchChips = [
    { label: 'Blue Van', query: 'blue van' },
    { label: 'Backpack', query: 'backpack' },
    { label: 'Red Hoodie', query: 'hoodie' },
    { label: 'Silver Car', query: 'silver car' },
    { label: 'All Feeds', query: '' },
  ];

  const orientationFilters = [
    { id: 'ALL', label: 'All Angles' },
    { id: 'FRONT', label: 'Front' },
    { id: 'BACK', label: 'Back' },
    { id: 'SIDE', label: 'Side' },
  ];

  const entityFilters = [
    { id: 'all', label: 'All Types' },
    { id: 'person', label: 'Persons' },
    { id: 'object', label: 'Vehicles & Objects' },
  ];

  const formatTimestamp = (sec) => {
    if (sec === undefined || sec === null) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="sequence-panel-light">
      {/* 1. Smart Search Input with Clear Button */}
      <div className="search-input-box-light">
        <Search size={16} color="#94a3b8" />
        <input
          type="text"
          className="search-field-light"
          placeholder="Search 'blue van', 'backpack', 'person'..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="player-btn-clean"
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* 2. Instant Search Chips */}
      <div className="popular-chips-wrap">
        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Filter:</span>
        {quickSearchChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            className={`light-chip-btn ${searchQuery.toLowerCase() === chip.query ? 'active' : ''}`}
            onClick={() => onSearchChange(chip.query)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 3. Segmented Filter Strips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div className="light-filter-strip">
          {entityFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`light-filter-btn ${activeEntityFilter === f.id ? 'active' : ''}`}
              onClick={() => onEntityFilterChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="light-filter-strip">
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
      </div>

      {/* 4. Active Target Profile Spotlight */}
      {activeIdentity && (
        <div className="target-spotlight-light">
          <div className="spotlight-thumb-wrap">
            {activeIdentity.reference_image_url || activeIdentity.initial_crop_path ? (
              <img
                src={getCropImageUrl(activeIdentity.reference_image_url || activeIdentity.initial_crop_path)}
                alt={activeIdentity.global_id}
              />
            ) : (
              <Eye size={20} color="#64748b" />
            )}
          </div>

          <div className="spotlight-details">
            <span className="spotlight-id-tag mono">{activeIdentity.global_id}</span>
            <span className="spotlight-title">{activeIdentity.label || 'Target Profile'}</span>
            <span className="spotlight-meta-line mono">
              {sightings.length} frame detections indexed across cameras
            </span>
          </div>
        </div>
      )}

      {/* 5. Timeline Stepper Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.4rem 0',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
            Chronological Sequence
          </span>
          <span className="mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>
            ({sightings.length > 0 ? activeSightingIndex + 1 : 0} / {sightings.length})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            className="light-chip-btn"
            onClick={handleStepPrev}
            disabled={sightings.length <= 1}
            title="Previous Frame"
          >
            <ChevronLeft size={13} />
          </button>

          <button
            type="button"
            className={`light-chip-btn ${isPlayingSequence ? 'active' : ''}`}
            onClick={() => setIsPlayingSequence(!isPlayingSequence)}
            title={isPlayingSequence ? 'Pause Sequence' : 'Auto-Step Sequence'}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {isPlayingSequence ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlayingSequence ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            className="light-chip-btn"
            onClick={handleStepNext}
            disabled={sightings.length <= 1}
            title="Next Frame"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* 6. Chronological Sighting Cards List */}
      <div className="sequence-cards-list-light">
        {sightings.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
              No sightings matching "{searchQuery}"
            </p>
            <p style={{ fontSize: '0.78rem', marginTop: '0.4rem', color: '#64748b' }}>
              Try searching "blue van", "backpack", or click "All Feeds" above.
            </p>
          </div>
        ) : (
          sightings.map((s, idx) => {
            const isSelected = activeSightingIndex === idx;
            const ori = (s.orientation || 'front').toLowerCase();
            let carriedList = [];
            try {
              if (s.carried_items) {
                carriedList = typeof s.carried_items === 'string' ? JSON.parse(s.carried_items) : s.carried_items;
              }
            } catch {
              carriedList = [];
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
              >
                {/* Crop Thumbnail */}
                <div className="sighting-thumb-clean">
                  {s.crop_path ? (
                    <img
                      src={getCropImageUrl(s.crop_path)}
                      alt={`Detection ${idx}`}
                    />
                  ) : (
                    <Eye size={16} color="#64748b" />
                  )}
                </div>

                {/* Sighting Metadata */}
                <div className="sighting-content-col">
                  <div className="sighting-top-line">
                    <span className="sighting-cam-name">
                      {s.camera_name || s.camera_id}
                    </span>
                    <span className="sighting-time-text mono">
                      t={formatTimestamp(s.timestamp_sec)}
                    </span>
                  </div>

                  <div className="sighting-bottom-tags">
                    <span className={`clean-pill-tag ${ori}`}>
                      {s.orientation || 'ANGLE'}
                    </span>

                    {s.global_id && (
                      <span className="mono" style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                        {s.global_id}
                      </span>
                    )}

                    {s.identity_label && (
                      <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>
                        {s.identity_label}
                      </span>
                    )}

                    {carriedList.map((item, cIdx) => (
                      <span key={cIdx} className="carried-clean-pill mono">
                        <Luggage size={10} style={{ display: 'inline', marginRight: '3px' }} />
                        {item}
                      </span>
                    ))}

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
                      title="Seek camera stream to this exact frame"
                    >
                      <span>Seek</span>
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
