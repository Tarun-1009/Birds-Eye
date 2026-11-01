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
import { uploadMedia } from '../services/api';

export default function VideoIngestion({ 
  onContinueToStudio, 
  storedVideos = [], 
  onUploadSuccess, 
  showToast 
}) {
  // Staged uploads & active target
  const [stagedVideos, setStagedVideos] = useState([]);
  const [targetPhoto, setTargetPhoto] = useState(null);
  const [targetPreview, setTargetPreview] = useState(defaultTargetImg);
  const [targetName, setTargetName] = useState('Target 01');
  const [targetType, setTargetType] = useState('Person');
  const [activeTargetTab, setActiveTargetTab] = useState('photo'); // 'photo' | 'class'
  const [isUploading, setIsUploading] = useState(false);

  // Default feeds matching the reference mockup
  const [feeds, setFeeds] = useState([
    {
      id: 'cam-01',
      title: 'Camera 01 · Front entrance',
      size: '245 MB',
      thumb: camThumb1,
      status: 'Completed'
    },
    {
      id: 'cam-02',
      title: 'Camera 02 · Side corridor',
      size: '198 MB',
      thumb: camThumb2,
      status: 'Completed'
    },
    {
      id: 'cam-03',
      title: 'Camera 03 · Parking lot',
      size: '276 MB',
      thumb: camThumb3,
      status: 'Completed'
    }
  ]);

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
        id: `staged-${Date.now()}-${idx}`,
        title: `Camera 0${feeds.length + idx + 1} · ${file.name.replace(/\.[^/.]+$/, '')}`,
        size: sizeMB,
        thumb: camThumb1,
        status: 'Completed',
        file: file
      };
    });

    setFeeds(prev => [...prev, ...newFeeds]);
    setStagedVideos(prev => [...prev, ...valid]);
    showToast?.(`${valid.length} video feed(s) added successfully.`, 'success');
  };

  const removeFeed = (id) => {
    setFeeds(prev => prev.filter(f => f.id !== id));
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

  // Handle Continue to Detection Studio
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
        onUploadSuccess?.();
      } catch (err) {
        console.warn('Upload completed with warning:', err.message);
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
                  onClick={() => removeFeed(feed.id)}
                  className="feed-remove-btn"
                  title="Remove feed"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Target Reference */}
        <div className="section-box-card">
          <div className="section-box-header">
            <User size={18} color="#1769FF" />
            <span>Target reference</span>
          </div>

          {/* Target Tabs: Upload Photo / Object Class */}
          <div className="target-tab-pills">
            <button 
              className={`target-tab-btn ${activeTargetTab === 'photo' ? 'active' : ''}`}
              onClick={() => setActiveTargetTab('photo')}
            >
              <ImageIcon size={15} />
              <span>Upload photo</span>
            </button>
            <button 
              className={`target-tab-btn ${activeTargetTab === 'class' ? 'active' : ''}`}
              onClick={() => setActiveTargetTab('class')}
            >
              <Box size={15} />
              <span>Object class</span>
            </button>
          </div>

          {activeTargetTab === 'photo' ? (
            <div className="target-specimen-layout">
              {/* Target Image Preview & Replace */}
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
                  <span>Replace image</span>
                </button>
              </div>

              {/* Target Name & Type Fields */}
              <div className="target-fields-col">
                <div className="form-group-clean">
                  <label className="form-label-clean">Target name</label>
                  <input 
                    type="text" 
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    className="form-input-clean" 
                  />
                </div>

                <div className="form-group-clean">
                  <label className="form-label-clean">Target type</label>
                  <select 
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="form-input-clean"
                  >
                    <option value="Person">👤 Person</option>
                    <option value="Vehicle">🚗 Vehicle</option>
                    <option value="Object">📦 Object / Luggage</option>
                  </select>
                </div>

                <div className="form-helper-text">
                  <Info size={14} color="#94a3b8" />
                  <span>Used to match appearance across camera feeds.</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
              <div className="form-group-clean">
                <label className="form-label-clean">Select Target Category</label>
                <select 
                  className="form-input-clean"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                >
                  <option value="Person">Person (Pedestrian, Visitor, Guard)</option>
                  <option value="Vehicle">Vehicle (Car, Van, SUV, Truck, Motorcycle)</option>
                  <option value="Object">Carried Object (Backpack, Bag, Suitcase, Package)</option>
                </select>
              </div>
              <div className="form-helper-text">
                <Info size={14} color="#94a3b8" />
                <span>Zero-shot multi-angle detector will match objects belonging to this category.</span>
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
          disabled={isUploading}
        >
          <span>{isUploading ? 'Preparing Feeds...' : 'Continue to Detection Studio'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
