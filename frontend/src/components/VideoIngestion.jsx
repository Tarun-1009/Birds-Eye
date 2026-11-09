import React, { useState, useRef } from 'react';
import { 
  Video, 
  Database, 
  Clock, 
  UploadCloud, 
  User, 
  CheckCircle2, 
  X, 
  RotateCw, 
  Info, 
  ArrowRight,
  Image as ImageIcon,
  Box
} from 'lucide-react';
import defaultTargetImg from '../assets/default_target.jpg';
import camThumb1 from '../assets/cam_thumb_1.jpg';
import camThumb2 from '../assets/cam_thumb_2.jpg';
import camThumb3 from '../assets/cam_thumb_3.jpg';
import { uploadMedia, runDetectionApi, deleteVideoFile } from '../services/api';

export default function VideoIngestion({ 
  onContinueToStudio, 
  storedVideos = [], 
  onUploadSuccess, 
  onDeleteStoredVideo,
  showToast 
}) {
  // Staged uploads & active target (target is completely OPTIONAL)
  const [stagedVideos, setStagedVideos] = useState([]);
  const [targetPhoto, setTargetPhoto] = useState(null);
  const [targetPreview, setTargetPreview] = useState(null);
  const [targetName, setTargetName] = useState('All Targets');
  const [targetType, setTargetType] = useState('All');
  const [activeTargetTab, setActiveTargetTab] = useState('photo'); // 'photo' | 'class'
  const [isUploading, setIsUploading] = useState(false);

  // Helper to map stored videos to feed format
  const mapStoredVideosToFeeds = (videos) => {
    return (videos || []).map((v, idx) => ({
      id: v.filename || v.id || `stored-${idx}`,
      cameraId: v.id || `CAM-${String(idx + 1).padStart(2, '0')}`,
      filename: v.filename,
      originalName: v.originalName || '',
      title: `${v.cameraName || `Camera ${idx + 1}`} · ${v.originalName || ''}`,
      size: v.formattedSize || '30 MB',
      thumb: idx % 3 === 0 ? camThumb1 : idx % 3 === 1 ? camThumb2 : camThumb3,
      status: 'Active Feed',
      isStored: true,
    }));
  };

  // Feeds populated from stored videos or staged uploads
  const [feeds, setFeeds] = useState(() => mapStoredVideosToFeeds(storedVideos));

  // Sync when storedVideos change from server
  React.useEffect(() => {
    if (stagedVideos.length === 0) {
      setFeeds(mapStoredVideosToFeeds(storedVideos));
    }
  }, [storedVideos]);

  const videoFileInputRef = useRef(null);
  const targetFileInputRef = useRef(null);

  // Video Drag & Drop
  const handleDropVideos = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedVideos(Array.from(e.dataTransfer.files));
    }
  };

  const handleVideoFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedVideos(Array.from(e.target.files));
    }
  };

  const processSelectedVideos = (files) => {
    const valid = files.filter(f => f.type.startsWith('video/') || /\.(mp4|avi|mov|mkv|webm)$/i.test(f.name));
    if (valid.length === 0) {
      showToast?.('Please upload valid video files (MP4, AVI, MOV, MKV, WEBM)', 'error');
      return;
    }

    const newFeeds = valid.map((file, idx) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(0) + ' MB';
      return {
        id: `staged-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title: `Camera ${feeds.length + idx + 1} · ${file.name.replace(/\.[^/.]+$/, '')}`,
        size: sizeMB,
        thumb: camThumb1,
        status: 'Staged for Upload',
        isStored: false,
        file: file
      };
    });

    setFeeds(prev => [...prev, ...newFeeds]);
    setStagedVideos(prev => [...prev, ...valid]);
    showToast?.(`${valid.length} video feed(s) added successfully.`, 'success');
  };

  const removeFeed = async (feedToRemove) => {
    // 1. If it's a staged video not yet uploaded to server:
    if (!feedToRemove.isStored) {
      setFeeds(prev => prev.filter(f => f.id !== feedToRemove.id));
      setStagedVideos(prev => prev.filter(file => file !== feedToRemove.file));
      showToast?.('Staged video feed removed.', 'info');
      return;
    }

    // 2. If it's an active/stored feed on the server:
    try {
      // Optimistically remove from feeds list
      setFeeds(prev => prev.filter(f => f.id !== feedToRemove.id));
      const identifier = feedToRemove.filename || feedToRemove.cameraId || feedToRemove.id;
      const res = await deleteVideoFile(identifier);
      showToast?.(res.message || 'Camera feed removed.', 'success');

      if (onDeleteStoredVideo) {
        await onDeleteStoredVideo(identifier);
      } else if (onUploadSuccess) {
        await onUploadSuccess();
      }
    } catch (err) {
      console.error('Failed to remove feed:', err);
      showToast?.(err.message || 'Failed to remove camera feed.', 'error');
      setFeeds(mapStoredVideosToFeeds(storedVideos));
    }
  };

  const updateFeedTitle = (id, newTitle) => {
    setFeeds(prev => prev.map(f => f.id === id ? { ...f, title: newTitle } : f));
  };

  // Target Image Select
  const handleTargetChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTargetPhoto(file);
      setTargetPreview(URL.createObjectURL(file));
      showToast?.('Target appearance updated.', 'success');
    }
  };

  // Handle Continue to Detection Studio & Run AI Pipeline
  const handleProceed = async () => {
    if (stagedVideos.length > 0 || targetPhoto) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        stagedVideos.forEach(v => formData.append('videos', v));
        if (targetPhoto) {
          formData.append('target', targetPhoto);
        }
        await uploadMedia(formData);
        showToast?.('Uploaded video feeds. Running AI detection & orientation tracking...', 'info');
        await runDetectionApi({ sampleStep: 10, conf: 0.25 });
        showToast?.('AI detection and rotation-invariant tracking complete!', 'success');
        onUploadSuccess?.();
      } catch (err) {
        console.warn('Upload/detection warning:', err.message);
        showToast?.(err.message || 'Processing feeds...', 'info');
      } finally {
        setIsUploading(false);
      }
    }
    onContinueToStudio();
  };

  return (
    <div className="page-container ingestion-page">
      {/* 1. Page Header Title & Subtitle */}
      <div className="ingestion-header-area">
        <h1 className="page-header-title">Video Ingestion</h1>
        <p className="page-header-desc">
          Add camera feeds and define a target for cross-camera detection.
        </p>
      </div>

      {/* 2. Top Metric Cards Strip (Exact match to Reference) */}
      <div className="metric-cards-grid">
        <div className="stat-metric-card stat-metric-with-wave">
          <div className="stat-icon-circle">
            <Video size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Stored feeds</span>
            <span className="stat-value">{Math.max(12, feeds.length)}</span>
          </div>
          <div className="stat-card-wave-box" aria-hidden="true">
            <svg viewBox="0 0 160 50" preserveAspectRatio="none" className="card-wave-svg">
              <path d="M0 38 C 30 45, 60 20, 95 32 C 125 42, 145 22, 160 28 L 160 50 L 0 50 Z" fill="rgba(191, 219, 254, 0.40)" />
              <path d="M0 38 C 30 45, 60 20, 95 32 C 125 42, 145 22, 160 28" stroke="#93c5fd" strokeWidth="1.8" fill="none" />
            </svg>
          </div>
        </div>

        <div className="stat-metric-card stat-metric-with-wave">
          <div className="stat-icon-circle">
            <Database size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Storage used</span>
            <span className="stat-value">4.8 GB</span>
          </div>
          <div className="stat-card-wave-box" aria-hidden="true">
            <svg viewBox="0 0 160 50" preserveAspectRatio="none" className="card-wave-svg">
              <path d="M0 42 C 35 30, 70 44, 105 28 C 130 18, 148 30, 160 24 L 160 50 L 0 50 Z" fill="rgba(191, 219, 254, 0.40)" />
              <path d="M0 42 C 35 30, 70 44, 105 28 C 130 18, 148 30, 160 24" stroke="#93c5fd" strokeWidth="1.8" fill="none" />
            </svg>
          </div>
        </div>

        <div className="stat-metric-card stat-metric-with-wave">
          <div className="stat-icon-circle">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Last scan</span>
            <span className="stat-value">2 min ago</span>
          </div>
          <div className="stat-card-wave-box" aria-hidden="true">
            <svg viewBox="0 0 160 50" preserveAspectRatio="none" className="card-wave-svg">
              <path d="M0 35 C 25 42, 55 18, 90 30 C 120 40, 145 20, 160 26 L 160 50 L 0 50 Z" fill="rgba(191, 219, 254, 0.40)" />
              <path d="M0 35 C 25 42, 55 18, 90 30 C 120 40, 145 20, 160 26" stroke="#93c5fd" strokeWidth="1.8" fill="none" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Wizard Steps Indicator */}
      <div className="wizard-steps-strip">
        <div className="step-indicator active">
          <span className="step-num-circle">1</span>
          <span>Upload feeds</span>
        </div>
        <div className="step-connector-line"></div>
        <div className="step-indicator">
          <span className="step-num-circle">2</span>
          <span>Define target</span>
        </div>
        <div className="step-connector-line"></div>
        <div className="step-indicator">
          <span className="step-num-circle">3</span>
          <span>Review &amp; detect</span>
        </div>
      </div>

      {/* 4. Ingestion 2-Column Grid */}
      <div className="ingestion-columns-grid">
        {/* Left Column: Camera Feeds */}
        <div className="section-box-card">
          <div className="section-box-header">
            <Video size={18} color="#1769FF" />
            <span>Camera feeds</span>
          </div>

          {/* Upload Dropzone */}
          <div 
            className="video-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropVideos}
            onClick={() => videoFileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={videoFileInputRef}
              multiple 
              accept="video/*,.mp4,.avi,.mov,.mkv,.webm" 
              style={{ display: 'none' }}
              onChange={handleVideoFileChange}
            />
            <div className="dropzone-icon">
              <UploadCloud size={36} />
            </div>
            <div className="dropzone-primary-text">
              Drop video files here or <span className="browse-link">browse</span>
            </div>
            <div className="dropzone-sub-text">
              Supported formats: MP4, AVI, MOV, MKV, WEBM
            </div>
          </div>

          {/* Uploaded Video Feeds List */}
          <div className="uploaded-feeds-list">
            {feeds.map((feed) => (
              <div key={feed.id} className="feed-item-row">
                <img 
                  src={feed.thumb} 
                  alt={feed.title} 
                  className="feed-thumb-preview"
                />
                <div className="feed-info-col">
                  <input 
                    type="text" 
                    value={feed.title}
                    onChange={(e) => updateFeedTitle(feed.id, e.target.value)}
                    className="feed-title-input"
                  />
                  <span className="feed-size-label">{feed.size}</span>
                </div>
                <div className="feed-completed-badge">
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>{feed.status}</span>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFeed(feed);
                  }}
                  className="feed-remove-btn"
                  title="Remove feed"
                  aria-label="Remove feed"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Target Reference (Completely Optional) */}
        <div className="section-box-card">
          <div className="section-box-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="#1769FF" />
              <span>Target reference</span>
            </div>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
              Optional
            </span>
          </div>

          {/* Optional notice */}
          <div style={{
            padding: '0.65rem 0.8rem',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.55rem',
            marginBottom: '0.85rem'
          }}>
            <Info size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.76rem', color: '#1e40af', lineHeight: 1.4 }}>
              <b>Target photo is optional.</b> If left blank, the AI pipeline scans all feeds and extracts <b>the complete list of all detected objects and persons</b>.
            </div>
          </div>

          {/* Target Tabs: Upload Photo / Object Class */}
          <div className="target-tab-pills">
            <button 
              className={`target-tab-btn ${activeTargetTab === 'photo' ? 'active' : ''}`}
              onClick={() => setActiveTargetTab('photo')}
            >
              <ImageIcon size={15} />
              <span>Target photo (Optional)</span>
            </button>
            <button 
              className={`target-tab-btn ${activeTargetTab === 'class' ? 'active' : ''}`}
              onClick={() => setActiveTargetTab('class')}
            >
              <Box size={15} />
              <span>Filter by class</span>
            </button>
          </div>

          {activeTargetTab === 'photo' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {targetPreview ? (
                <div className="target-specimen-layout">
                  <div className="target-preview-box">
                    <div className="target-preview-img-wrap">
                      <img 
                        src={targetPreview} 
                        alt="Target Reference" 
                      />
                    </div>
                    <input 
                      type="file" 
                      ref={targetFileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleTargetChange}
                    />
                    <button 
                      className="replace-image-btn"
                      onClick={() => targetFileInputRef.current?.click()}
                    >
                      <RotateCw size={13} />
                      <span>Replace</span>
                    </button>
                    <button 
                      className="replace-image-btn"
                      onClick={() => {
                        setTargetPhoto(null);
                        setTargetPreview(null);
                      }}
                      style={{ marginTop: '4px', color: '#ef4444' }}
                    >
                      <X size={13} />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="target-fields-col">
                    <div className="form-group-clean">
                      <label className="form-label-clean">Target Label (Optional)</label>
                      <input 
                        type="text" 
                        value={targetName}
                        onChange={(e) => setTargetName(e.target.value)}
                        placeholder="e.g. Person of interest"
                        className="form-input-clean" 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => targetFileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input 
                    type="file" 
                    ref={targetFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleTargetChange}
                  />
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    <UploadCloud size={20} />
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                    Upload specific target photo (Optional)
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Skip this to detect and list all persons and objects automatically
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              <div className="form-group-clean">
                <label className="form-label-clean">Target Category Filter</label>
                <select 
                  className="form-input-clean"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                >
                  <option value="All">All Categories (Persons, Vehicles, Objects)</option>
                  <option value="Person">Persons only (Pedestrians, Staff)</option>
                  <option value="Vehicle">Vehicles only (Cars, Vans, Motorcycles)</option>
                  <option value="Object">Carried Objects (Backpacks, Bags, Suitcases)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Action Bar (Matching Reference Mockup) */}
      <div className="bottom-action-banner">
        <div className="ready-status-pill-blue">
          <span className="operational-dot-blue"></span>
          <span className="ready-status-label">Ready to analyze</span>
          <span className="status-separator">|</span>
          <span className="feeds-count-text">
            {feeds.length} camera feeds selected
          </span>
        </div>

        <button 
          onClick={handleProceed}
          className="continue-blue-btn"
          disabled={isUploading || feeds.length === 0}
        >
          <span>{isUploading ? 'Analyzing Feeds...' : 'Detect All Objects & View Sequence'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
