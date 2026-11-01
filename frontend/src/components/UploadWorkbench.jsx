import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Film,
  User,
  X,
  CheckCircle2,
  Camera,
  Play,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { uploadMedia, seedDatabase } from '../services/api';

export default function UploadWorkbench({ onUploadComplete, showToast }) {
  const [stagedVideos, setStagedVideos] = useState([]);
  const [cameraNames, setCameraNames] = useState([]);
  const [stagedTarget, setStagedTarget] = useState(null);
  const [targetPreview, setTargetPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);

  const videoInputRef = useRef(null);
  const targetInputRef = useRef(null);

  const handleVideoDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addVideos(Array.from(e.dataTransfer.files));
    }
  };

  const handleVideoSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addVideos(Array.from(e.target.files));
    }
  };

  const addVideos = (files) => {
    const validFiles = files.filter(
      (file) => file.type.startsWith('video/') || /\.(mp4|avi|mov|mkv|webm)$/i.test(file.name)
    );
    if (validFiles.length === 0) {
      showToast('Please select valid surveillance video files (MP4, AVI, MOV, MKV).', 'error');
      return;
    }

    setStagedVideos((prev) => {
      const combined = [...prev, ...validFiles];
      const newNames = combined.map(
        (_, idx) => cameraNames[idx] || `CAM-0${idx + 1} (${idx === 0 ? 'Courtyard' : idx === 1 ? 'Gate' : idx === 2 ? 'Corridor' : 'Plaza'})`
      );
      setCameraNames(newNames);
      return combined;
    });
  };

  const removeStagedVideo = (index) => {
    setStagedVideos((prev) => prev.filter((_, i) => i !== index));
    setCameraNames((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCameraName = (index, value) => {
    setCameraNames((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleTargetSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStagedTarget(file);
      setTargetPreview(URL.createObjectURL(file));
    }
  };

  const removeStagedTarget = () => {
    setStagedTarget(null);
    if (targetPreview) URL.revokeObjectURL(targetPreview);
    setTargetPreview(null);
  };

  const handleUploadAndTrack = async () => {
    if (stagedVideos.length === 0 && !stagedTarget) {
      showToast('Please select at least one CCTV video feed to ingest.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    stagedVideos.forEach((video) => formData.append('videos', video));
    cameraNames.forEach((name) => formData.append('cameraNames', name));
    if (stagedTarget) formData.append('target', stagedTarget);

    try {
      const res = await uploadMedia(formData, (percent) => {
        setUploadProgress(percent);
      });

      showToast(res.message || 'Videos uploaded and registered in surveillance registry.', 'success');
      setStagedVideos([]);
      setCameraNames([]);
      removeStagedTarget();
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      showToast(err.message || 'Upload failed. Check backend connection.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDatabase();
      showToast(res.message || 'Reference dataset loaded: 4 cameras, identities & sightings synced.', 'success');
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      showToast(err.message || 'Failed to seed database.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UploadCloud size={20} color="var(--accent-blue)" />
              <span>Multi-Camera Video Feed Ingestion</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Ingest multiple surveillance camera streams simultaneously. Recordings are indexed with camera identities, processed for frame-to-frame sequence search, and cross-matched for multi-view re-identification.
            </p>
          </div>

          <button
            onClick={handleQuickSeed}
            disabled={isSeeding}
            className="filter-chip-btn"
            style={{ padding: '0.55rem 1.1rem', borderColor: '#3b82f6', color: '#60a5fa' }}
            title="Load calibrated 4-camera reference dataset"
          >
            <RotateCcw size={14} className={isSeeding ? 'spin' : ''} />
            <span className="mono">{isSeeding ? 'Syncing...' : 'Load Reference Dataset'}</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 1fr)', gap: '1.5rem' }}>
        {/* Left: Video Dropzone */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
              CAMERA INPUT FEEDS
            </span>
            <span className="system-tag mono">
              {stagedVideos.length} Staged
            </span>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleVideoDrop}
            onClick={() => videoInputRef.current?.click()}
            style={{
              border: '2px dashed #2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              type="file"
              ref={videoInputRef}
              onChange={handleVideoSelect}
              multiple
              accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm"
              style={{ display: 'none' }}
            />
            <Film size={34} color="var(--accent-blue)" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
              Drag &amp; drop video files here, or click to browse
            </p>
            <p className="mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Supports MP4, AVI, MOV, MKV &bull; Multi-channel synchronization
            </p>
          </div>

          {/* Staged Videos List with Custom Camera Names */}
          {stagedVideos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <span className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                CHANNEL ASSIGNMENT:
              </span>
              {stagedVideos.map((video, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.75rem'
                  }}
                >
                  <Camera size={16} color="var(--accent-blue)" />
                  <input
                    type="text"
                    value={cameraNames[idx] || ''}
                    onChange={(e) => updateCameraName(idx, e.target.value)}
                    placeholder={`CAM-0${idx + 1} Location / Description`}
                    className="unified-search-input mono"
                    style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  />
                  <span className="mono" style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {(video.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <button
                    onClick={() => removeStagedVideo(idx)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                    title="Remove Video"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Target Reference Photo (Optional) */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
              TARGET REFERENCE (OPTIONAL)
            </span>
          </div>

          <div
            onClick={() => targetInputRef.current?.click()}
            style={{
              border: '2px dashed #334155',
              backgroundColor: 'rgba(30, 41, 59, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem 1rem',
              textAlign: 'center',
              cursor: 'pointer',
              minHeight: '140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <input
              type="file"
              ref={targetInputRef}
              onChange={handleTargetSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {targetPreview ? (
              <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={targetPreview}
                  alt="Target Reference"
                  style={{ maxHeight: '110px', borderRadius: 'var(--radius-sm)', border: '1px solid #3b82f6', objectFit: 'cover' }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStagedTarget();
                  }}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '20px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '50%',
                    color: '#fff',
                    cursor: 'pointer',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <User size={28} color="#64748b" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>
                  Target Reference Image
                </p>
                <p className="mono" style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Query specimen for initial feature matching
                </p>
              </>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }} className="mono">
                <span>Ingesting Feeds...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--accent-blue)', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleUploadAndTrack}
            disabled={isUploading || (stagedVideos.length === 0 && !stagedTarget)}
            style={{
              backgroundColor: 'var(--accent-blue)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isUploading || stagedVideos.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isUploading || stagedVideos.length === 0 ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: 'auto',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
            }}
            className="mono"
          >
            <CheckCircle2 size={16} />
            <span>{isUploading ? 'Ingesting Feeds...' : 'Register Feeds &amp; Index Channels'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
