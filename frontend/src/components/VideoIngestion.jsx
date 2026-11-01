import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Video, 
  User, 
  X, 
  CheckCircle2, 
  CheckCircle2, 
  FolderPlus,
  Play
} from 'lucide-react';
import { uploadMedia } from '../services/api';

export default function VideoIngestion({ onUploadSuccess, onTriggerDetection, showToast }) {
  const [stagedVideos, setStagedVideos] = useState([]);
  const [cameraNames, setCameraNames] = useState([]);
  const [stagedTarget, setStagedTarget] = useState(null);
  const [targetPreview, setTargetPreview] = useState(null);
  const [selectedClass, setSelectedClass] = useState('Person');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoInputRef = useRef(null);
  const targetInputRef = useRef(null);

  // Video Drag & Drop
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
    const validFiles = files.filter(file => file.type.startsWith('video/') || /\.(mp4|avi|mov|mkv|webm)$/i.test(file.name));
    if (validFiles.length === 0) {
      showToast('Please select valid video files (MP4, AVI, MOV, MKV, WEBM).', 'error');
      return;
    }

    setStagedVideos(prev => {
      const combined = [...prev, ...validFiles];
      const newNames = combined.map((file, idx) => cameraNames[idx] || `Camera ${idx + 1} (${idx === 0 ? 'Front' : idx === 1 ? 'Side' : 'Overhead'})`);
      setCameraNames(newNames);
      return combined;
    });
  };

  const removeStagedVideo = (index) => {
    setStagedVideos(prev => prev.filter((_, i) => i !== index));
    setCameraNames(prev => prev.filter((_, i) => i !== index));
  };

  const updateCameraName = (index, value) => {
    setCameraNames(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // Target Photo Drag & Drop
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

  const handleUpload = async () => {
    if (stagedVideos.length === 0 && !stagedTarget) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    stagedVideos.forEach((video) => {
      formData.append('videos', video);
    });

    cameraNames.forEach((name) => {
      formData.append('cameraNames', name);
    });

    if (stagedTarget) {
      formData.append('target', stagedTarget);
    }

    try {
      const res = await uploadMedia(formData, (percent) => {
        setUploadProgress(percent);
      });

      showToast(res.message || 'Videos uploaded and stored successfully!', 'success');
      setStagedVideos([]);
      setCameraNames([]);
      removeStagedTarget();
      onUploadSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to upload videos.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  return (
    <section style={{
      backgroundColor: 'var(--card-bg)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      padding: '1.5rem',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Upload size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
            Video &amp; Target Ingestion
          </h2>
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          backgroundColor: '#eff6ff',
          color: 'var(--primary)',
          padding: '3px 10px',
          borderRadius: '999px',
          border: '1px solid #bfdbfe'
        }}>
          Step 1
        </span>
      </div>

      {/* 1. CCTV Video Dropzone */}
      <div>
        <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
          1. CCTV CAMERA VIDEO FEEDS (MULTI-VIDEO SUPPORTED)
        </label>
        
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleVideoDrop}
          onClick={() => videoInputRef.current?.click()}
          style={{
            border: '2px dashed #93c5fd',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            padding: '1.75rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s, background-color 0.2s'
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

          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem auto'
          }}>
            <Video size={24} />
          </div>

          <p style={{ fontSize: '0.92rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.2rem' }}>
            Drag &amp; Drop CCTV video files here
          </p>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            or <span style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline' }}>Browse Files</span>
          </p>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.4rem', display: 'block' }}>
            Supports MP4, AVI, MOV, MKV, WEBM (Multiple angles recommended)
          </span>
        </div>

        {/* Staged Videos List with Camera Angle Names */}
        {stagedVideos.length > 0 && (
          <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', fontWeight: '600' }}>
              <span>Selected Videos to Upload ({stagedVideos.length})</span>
              <button
                type="button"
                onClick={() => { setStagedVideos([]); setCameraNames([]); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                Clear All
              </button>
            </div>

            {stagedVideos.map((video, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                <Video size={16} color="var(--primary)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={cameraNames[idx] || ''}
                    onChange={(e) => updateCameraName(idx, e.target.value)}
                    placeholder={`Camera Angle ${idx + 1}`}
                    style={{
                      width: '100%',
                      padding: '2px 6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {video.name} • {formatSize(video.size)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeStagedVideo(idx)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Target Person Reference Photo Dropzone */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>
            2. TARGET OBJECT OR PERSON REFERENCE
          </label>

          {/* Quick Object class selector */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              padding: '2px 8px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="Person">Person (Face / Body Re-ID)</option>
            <option value="Vehicle">Vehicle (Car / Truck)</option>
            <option value="Backpack">Backpack / Luggage</option>
          </select>
        </div>

        {!targetPreview ? (
          <div
            onClick={() => targetInputRef.current?.click()}
            style={{
              border: '2px dashed #cbd5e1',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem 1rem',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <input
              type="file"
              ref={targetInputRef}
              onChange={handleTargetSelect}
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
            />

            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#e2e8f0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem auto'
            }}>
              <User size={20} />
            </div>

            <p style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b' }}>
              Upload Target Person Photo
            </p>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              or <span style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline' }}>Select Photo</span>
            </p>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
              JPG, PNG, WEBP (Used for Re-Identification matching)
            </span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.75rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-md)'
          }}>
            <img
              src={targetPreview}
              alt="Target"
              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #93c5fd' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e3a8a' }}>
                {stagedTarget?.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>
                {formatSize(stagedTarget?.size)} • Ready for Re-ID Matching
              </div>
            </div>
            <button
              type="button"
              onClick={removeStagedTarget}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Upload Progress & Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
        {isUploading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
              <span>Uploading to server...</span>
              <span style={{ fontWeight: '700' }}>{uploadProgress}%</span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${uploadProgress}%`,
                backgroundColor: 'var(--primary)',
                transition: 'width 0.2s ease'
              }} />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || (stagedVideos.length === 0 && !stagedTarget)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.8rem 1.25rem',
            backgroundColor: (stagedVideos.length > 0 || stagedTarget) ? 'var(--primary)' : '#94a3b8',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: (stagedVideos.length > 0 || stagedTarget) ? 'pointer' : 'not-allowed',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <FolderPlus size={18} />
          <span>{isUploading ? 'Uploading Feeds...' : 'Upload & Store Videos'}</span>
        </button>

        <button
          type="button"
          onClick={onTriggerDetection}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: '#0f172a',
            color: '#38bdf8',
            border: '1px solid #1e293b',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <CheckCircle2 size={16} />
          <span>Launch Multi-Angle Detection</span>
        </button>
      </div>
    </section>
  );
}

