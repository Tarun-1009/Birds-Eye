import React, { useState, useRef } from 'react';
import { 
  Video, 
  Database, 
  Cpu, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldCheck,
  Layers,
  Sparkles
} from 'lucide-react';
import { uploadMedia, runDetectionApi, deleteVideoFile, getVideoThumbnailUrl } from '../services/api';

export default function VideoIngestion({ 
  onContinueToStudio, 
  onRunDetection,
  storedVideos = [], 
  onUploadSuccess, 
  onDeleteStoredVideo,
  showToast 
}) {
  const [stagedVideos, setStagedVideos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Helper to map stored videos to feed format
  const mapStoredVideosToFeeds = (videos) => {
    return (videos || []).map((v, idx) => ({
      id: v.filename || v.id || `stored-${idx}`,
      filename: v.filename,
      originalName: v.originalName || v.filename,
      title: `Camera ${idx + 1} · ${v.originalName || v.filename}`,
      size: v.formattedSize || '0 B',
      status: 'Ready on Server',
      isStored: true,
      thumbUrl: getVideoThumbnailUrl(v.filename),
    }));
  };

  const [feeds, setFeeds] = useState(() => mapStoredVideosToFeeds(storedVideos));

  React.useEffect(() => {
    if (stagedVideos.length === 0) {
      setFeeds(mapStoredVideosToFeeds(storedVideos));
    }
  }, [storedVideos]);

  const videoFileInputRef = useRef(null);

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
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      return {
        id: `staged-${Date.now()}-${idx}`,
        file,
        filename: file.name,
        originalName: file.name,
        title: `Camera ${feeds.length + idx + 1} · ${file.name}`,
        size: sizeMB,
        status: 'Staged for Upload',
        isStored: false,
        previewBlob: URL.createObjectURL(file),
      };
    });

    setFeeds(prev => [...prev, ...newFeeds]);
    setStagedVideos(prev => [...prev, ...valid]);
    showToast?.(`${valid.length} video feed(s) added.`, 'success');
  };

  const removeFeed = async (feedToRemove) => {
    // 1. Staged in browser
    if (!feedToRemove.isStored) {
      setFeeds(prev => prev.filter(f => f.id !== feedToRemove.id));
      setStagedVideos(prev => prev.filter(file => file !== feedToRemove.file));
      showToast?.('Staged video feed removed.', 'info');
      return;
    }

    // 2. Stored on server
    try {
      setFeeds(prev => prev.filter(f => f.id !== feedToRemove.id));
      const targetFilename = feedToRemove.filename || feedToRemove.id;
      const res = await deleteVideoFile(targetFilename);
      showToast?.(res.message || 'Camera feed deleted permanently.', 'success');

      if (onDeleteStoredVideo) {
        await onDeleteStoredVideo(targetFilename);
      } else if (onUploadSuccess) {
        await onUploadSuccess();
      }
    } catch (err) {
      console.error('Failed to remove feed:', err);
      showToast?.(err.message || 'Failed to remove camera feed.', 'error');
      setFeeds(mapStoredVideosToFeeds(storedVideos));
    }
  };

  // Upload staged feeds & launch tracking studio with fancy loading animation
  const handleProceed = async () => {
    if (stagedVideos.length > 0) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        stagedVideos.forEach(v => formData.append('videos', v));
        await uploadMedia(formData);
        showToast?.('Videos uploaded successfully.', 'success');
        setStagedVideos([]);
        await onUploadSuccess?.();
      } catch (err) {
        showToast?.(err.message || 'Upload failed', 'error');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (onRunDetection) {
      onRunDetection();
    } else {
      onContinueToStudio();
    }
  };

  const totalFeedsCount = feeds.length;

  return (
    <div className="page-container ingestion-page">
      {/* 1. Page Header */}
      <div className="ingestion-header-area">
        <h1 className="page-header-title">Upload Camera Feeds</h1>
        <p className="page-header-desc">
          Upload surveillance camera recordings for automatic multi-angle target tracking and Re-ID.
        </p>
      </div>

      {/* 2. Real System Metrics Strip */}
      <div className="metric-cards-grid">
        <div className="stat-metric-card stat-metric-with-wave">
          <div className="stat-icon-circle">
            <Video size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Camera Feeds</span>
            <span className="stat-value">{totalFeedsCount}</span>
          </div>
        </div>

        <div className="stat-metric-card stat-metric-with-wave">
          <div className="stat-icon-circle">
            <Cpu size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Detection Mode</span>
            <span className="stat-value">Automatic</span>
          </div>
        </div>

        <div className="stat-metric-card stat-metric-with-wave">
          <div className="stat-icon-circle">
            <ShieldCheck size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Rotation Invariance</span>
            <span className="stat-value">180° Front/Back</span>
          </div>
        </div>
      </div>

      {/* 3. Ingestion 2-Column Grid */}
      <div className="ingestion-columns-grid">
        {/* Left Column: Camera Feeds Ingestion & List */}
        <div className="section-box-card">
          <div className="section-box-header">
            <Video size={18} color="#1769FF" />
            <span>Camera feeds ({totalFeedsCount})</span>
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
              Drop surveillance video files here or <span className="browse-link">browse</span>
            </div>
            <div className="dropzone-sub-text">
              Upload any number of feeds (MP4, AVI, MOV, MKV, WEBM)
            </div>
          </div>

          {/* Uploaded / Staged Feeds List */}
          <div className="uploaded-feeds-list">
            {feeds.map((feed, idx) => (
              <div key={feed.id} className="feed-item-row">
                {/* Real Video Frame Thumbnail */}
                <div style={{
                  width: '64px',
                  height: '42px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: '#0f172a',
                  flexShrink: 0,
                  position: 'relative'
                }}>
                  {feed.isStored ? (
                    <img 
                      src={feed.thumbUrl} 
                      alt={feed.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : feed.previewBlob ? (
                    <video 
                      src={feed.previewBlob} 
                      muted 
                      playsInline 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : null}
                  <span style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '3px',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    padding: '1px 3px',
                    borderRadius: '2px'
                  }}>
                    CH-{idx + 1}
                  </span>
                </div>

                <div className="feed-info-col">
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0f172a' }}>
                    {feed.title}
                  </span>
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
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: High-Accuracy Automatic Tracking Engine */}
        <div className="section-box-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="section-box-header">
            <Cpu size={18} color="#1769FF" />
            <span>Automatic Vision &amp; Re-ID Engine</span>
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#2563eb" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e40af' }}>
                Pure Automatic Discovery
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: 0, lineHeight: 1.5 }}>
              No reference photo required. The AI pipeline runs YOLO11 tracking, YOLO-Pose orientation estimation, and deep OSNet visual embeddings directly on your video feeds for maximum Re-ID accuracy.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
              Categories Tracked Across Feeds:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>👤 Persons</span>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.72rem' }}>180° rotation-invariant (front vs back)</p>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>🚐 Vehicles</span>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.72rem' }}>Cars, vans, SUVs, trucks</p>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>❄️ Coolers &amp; Fridges</span>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.72rem' }}>Appliance &amp; cooler object tracking</p>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>🧳 Luggage &amp; Bags</span>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.72rem' }}>Backpacks, suitcases, handbags</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <button 
              type="button"
              className="continue-blue-btn"
              onClick={handleProceed}
              disabled={isUploading || totalFeedsCount === 0}
              style={{ width: '100%', padding: '0.75rem 1.25rem', fontSize: '0.92rem', justifyContent: 'center' }}
            >
              <span>{isUploading ? 'Uploading Feeds...' : 'Continue to Tracking Studio'}</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
