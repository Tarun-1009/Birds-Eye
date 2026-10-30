import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import VideoIngestion from './components/VideoIngestion';
import StoredVideosGallery from './components/StoredVideosGallery';
import DetectionStudio from './components/DetectionStudio';
import VideoPlayerModal from './components/VideoPlayerModal';
import Toast from './components/Toast';
import { 
  checkHealth, 
  fetchVideosData, 
  deleteVideoFile, 
  deleteTargetFile 
} from './services/api';

export default function App() {
  const [videos, setVideos] = useState([]);
  const [target, setTarget] = useState(null);
  const [stats, setStats] = useState({ videoCount: 0, totalBytes: 0, formattedTotalSize: '0 B' });
  const [isOnline, setIsOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' | 'detection'
  const [playingVideo, setPlayingVideo] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadData = async (silent = false) => {
    setIsRefreshing(true);
    try {
      const [health, videosData] = await Promise.all([
        checkHealth(),
        fetchVideosData()
      ]);

      const online = health.status === 'online' || health.status === 'ok';
      setIsOnline(online);

      if (videosData) {
        setVideos(videosData.videos || []);
        setTarget(videosData.target || null);
        setStats(videosData.stats || { videoCount: 0, totalBytes: 0, formattedTotalSize: '0 B' });

        if (videosData.isOffline && !silent) {
          showToast('Could not fetch stored videos from server. Ensure backend is running.', 'error');
        }
      }
    } catch (err) {
      setIsOnline(false);
      if (!silent) {
        showToast('Could not fetch stored videos from server.', 'error');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleDeleteVideo = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await deleteVideoFile(id);
      showToast(res.message || 'Video deleted.', 'success');
      loadData(true);
    } catch (err) {
      showToast(err.message || 'Failed to delete video.', 'error');
    }
  };

  const handleDeleteTarget = async () => {
    if (!window.confirm('Are you sure you want to remove the active target reference?')) return;
    try {
      const res = await deleteTargetFile();
      showToast(res.message || 'Target removed.', 'success');
      loadData(true);
    } catch (err) {
      showToast(err.message || 'Failed to remove target.', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-body)' }}>
      {/* Header bar matching the user's prototype */}
      <Header stats={stats} target={target} isOnline={isOnline} />

      {/* Main Workbench Grid */}
      <main style={{
        flex: 1,
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '1.75rem 2rem',
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 420px) minmax(0, 1fr)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Video & Target Ingestion */}
        <VideoIngestion
          onUploadSuccess={() => loadData(true)}
          onTriggerDetection={() => setActiveTab('detection')}
          showToast={showToast}
        />

        {/* Right Column: Toggle between Stored Videos Gallery & Multi-Angle Detection Studio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* View Mode Toggle Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            padding: '0.4rem 0.6rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeTab === 'gallery' ? 'var(--header-bg)' : 'transparent',
                  color: activeTab === 'gallery' ? '#ffffff' : '#64748b',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Stored Videos Vault ({videos.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('detection')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeTab === 'detection' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'detection' ? '#ffffff' : '#64748b',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Multi-Angle Detection Studio
              </button>
            </div>

            <span style={{ fontSize: '0.72rem', color: '#94a3b8', paddingRight: '0.5rem' }}>
              Multi-Camera Object Tracking
            </span>
          </div>

          {/* Active View */}
          {activeTab === 'detection' ? (
            <DetectionStudio
              videos={videos}
              target={target}
              onClose={() => setActiveTab('gallery')}
              showToast={showToast}
            />
          ) : (
            <StoredVideosGallery
              videos={videos}
              target={target}
              onRefresh={() => loadData(false)}
              onPlayVideo={(v) => setPlayingVideo(v)}
              onDeleteVideo={handleDeleteVideo}
              onDeleteTarget={handleDeleteTarget}
              onLaunchDetection={() => setActiveTab('detection')}
              isRefreshing={isRefreshing}
            />
          )}
        </div>
      </main>

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}

      {/* Toast Notification Stack */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
