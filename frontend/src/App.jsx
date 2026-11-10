import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import VideoIngestion from './components/VideoIngestion';
import MultiCameraMatrix from './components/MultiCameraMatrix';
import SequenceExplorer from './components/SequenceExplorer';
import StoredVideosGallery from './components/StoredVideosGallery';
import VideoPlayerModal from './components/VideoPlayerModal';
import DetectionProgressModal from './components/DetectionProgressModal';
import Toast from './components/Toast';
import {
  checkHealth,
  fetchCameras,
  fetchSightings,
  fetchIdentities,
  fetchVideosData,
  deleteVideoFile,
  runDetectionApi,
  fetchDetectionStatus,
  clearAllVideosApi,
} from './services/api';
import { Cpu } from 'lucide-react';

export default function App() {
  // Navigation tabs: 'ingestion' | 'studio' | 'vault'
  const [activeTab, setActiveTab] = useState('ingestion');
  const [isOnline, setIsOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState({});

  // Core Surveillance Data
  const [cameras, setCameras] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [storedVideos, setStoredVideos] = useState([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOrientation, setActiveOrientation] = useState('ALL');
  const [activeEntityFilter, setActiveEntityFilter] = useState('all');

  // Active Sighting & Camera Seeking
  const [activeSightingIndex, setActiveSightingIndex] = useState(0);
  const [seekTarget, setSeekTarget] = useState(null);

  // Modals & Notifications
  const [playingVideo, setPlayingVideo] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load cameras, identities, metadata
  const loadCoreData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [healthRes, camsRes, idsRes, vidsData] = await Promise.all([
        checkHealth(),
        fetchCameras(),
        fetchIdentities(),
        fetchVideosData(),
      ]);

      setIsOnline(healthRes.status === 'online' || healthRes.status === 'ok');
      setCameras(camsRes || []);
      setIdentities(idsRes || []);

      if (vidsData) {
        setStoredVideos(vidsData.videos || []);
        setTarget(vidsData.target || null);
      }
    } catch (err) {
      console.error('Failed to load surveillance data:', err);
      setIsOnline(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch frame-to-frame sequence sightings
  const loadSightings = useCallback(async () => {
    try {
      const data = await fetchSightings({
        search: searchQuery,
        orientation: activeOrientation,
        entity_type: activeEntityFilter !== 'all' ? activeEntityFilter : undefined,
      });
      setSightings(data || []);
      setActiveSightingIndex(0);

      if (data && data.length > 0) {
        setSeekTarget({
          camera_id: data[0].camera_id,
          timestamp_sec: data[0].timestamp_sec,
        });
      }
    } catch (err) {
      console.error('Failed to fetch sightings:', err);
    }
  }, [searchQuery, activeOrientation, activeEntityFilter]);

  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    loadSightings();
  }, [loadSightings]);

  const handleSeekCamera = (cameraId, timestampSec) => {
    setSeekTarget({
      camera_id: cameraId,
      timestamp_sec: timestampSec,
    });
  };

  const handleRunDetectionPipeline = async () => {
    setIsDetecting(true);
    setIsProgressModalOpen(true);
    setDetectionStatus({ isRunning: true, percent: 5, stage: 'Initializing AI Models (YOLO11 + OSNet)...' });

    try {
      await runDetectionApi({ sampleStep: 15, conf: 0.25 });

      // Poll real-time progress every 400ms
      const pollTimer = setInterval(async () => {
        try {
          const status = await fetchDetectionStatus();
          setDetectionStatus(status);

          if (!status.isRunning && status.percent >= 100) {
            clearInterval(pollTimer);
            setIsDetecting(false);
            await loadCoreData();
            await loadSightings();
          } else if (status.error) {
            clearInterval(pollTimer);
            setIsDetecting(false);
            showToast(status.error, 'error');
          }
        } catch (pollErr) {
          console.warn('Progress poll issue:', pollErr);
        }
      }, 400);
    } catch (err) {
      setIsDetecting(false);
      setIsProgressModalOpen(false);
      showToast(err.message || 'Detection failed to launch', 'error');
    }
  };

  const handleProgressComplete = () => {
    setIsProgressModalOpen(false);
    setActiveTab('studio');
    showToast('AI multi-angle tracking complete! Targets indexed.', 'success');
  };

  const handleClearAllFeeds = async () => {
    if (!window.confirm('Are you sure you want to delete all camera feeds, crops, and tracking records? This resets the platform completely.')) return;
    try {
      const res = await clearAllVideosApi();
      showToast(res.message || 'All records and camera feeds cleared.', 'success');
      await loadCoreData();
      await loadSightings();
    } catch (err) {
      showToast(err.message || 'Failed to clear feeds.', 'error');
    }
  };

  const handleDeleteVideo = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete camera feed "${name}"?`)) return;
    try {
      const res = await deleteVideoFile(id);
      showToast(res.message || 'Camera feed removed.', 'success');
      loadCoreData();
      loadSightings();
    } catch (err) {
      showToast(err.message || 'Failed to remove feed.', 'error');
    }
  };

  return (
    <div className="app-shell-container">
      {/* 1. LEFT SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOnline={isOnline}
      />

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <main className="dashboard-main">
        {/* TOP HEADER */}
        <DashboardHeader 
          activeTab={activeTab}
          onRefresh={loadCoreData}
          isRefreshing={isRefreshing}
          isOnline={isOnline}
        />

        {/* PAGE CONTENT CONTAINER */}
        <div className="page-content-scroll">
          {/* TAB 1: UPLOAD FEEDS */}
          {activeTab === 'ingestion' && (
            <VideoIngestion 
              onContinueToStudio={() => setActiveTab('studio')}
              onRunDetection={handleRunDetectionPipeline}
              storedVideos={storedVideos}
              onUploadSuccess={() => {
                loadCoreData();
                loadSightings();
              }}
              onDeleteStoredVideo={async () => {
                await loadCoreData();
                await loadSightings();
              }}
              showToast={showToast}
            />
          )}

          {/* TAB 2: TRACKING STUDIO */}
          {activeTab === 'studio' && (
            <div className="page-container">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 className="page-header-title">Tracking Studio</h1>
                  <p className="page-header-desc">
                    Live multi-camera tracking &amp; cross-camera rotation-invariant Re-ID sequence.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button 
                    onClick={handleRunDetectionPipeline} 
                    disabled={isDetecting}
                    className="continue-blue-btn"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Cpu size={15} className={isDetecting ? 'spin' : ''} />
                    <span>{isDetecting ? 'Running AI Tracking...' : 'Run AI Detection'}</span>
                  </button>

                  <span className="ready-status-pill-blue" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}>
                    <span className="operational-dot-blue"></span>
                    <span>Re-ID: Rotation-Invariant</span>
                  </span>
                </div>
              </div>

              <div className="detection-studio-grid">
                {/* Left Live Camera Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <MultiCameraMatrix
                    cameras={cameras}
                    seekTarget={seekTarget}
                    onNavigateToIngestion={() => setActiveTab('ingestion')}
                  />
                </div>

                {/* Right Frame-by-Frame Sequence Explorer & Objects List */}
                <SequenceExplorer
                  sightings={sightings}
                  identities={identities}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeOrientation={activeOrientation}
                  onOrientationChange={setActiveOrientation}
                  activeEntityFilter={activeEntityFilter}
                  onEntityFilterChange={setActiveEntityFilter}
                  activeSightingIndex={activeSightingIndex}
                  onSelectSightingIndex={setActiveSightingIndex}
                  onSeekCamera={handleSeekCamera}
                />
              </div>
            </div>
          )}

          {/* TAB 3: VIDEO VAULT */}
          {activeTab === 'vault' && (
            <div className="page-container">
              <div style={{ marginBottom: '1.25rem' }}>
                <h1 className="page-header-title">Video Vault</h1>
                <p className="page-header-desc">
                  Archived camera stream recordings, target snapshots, and storage catalog.
                </p>
              </div>
              <StoredVideosGallery
                videos={storedVideos}
                onRefresh={loadCoreData}
                onPlayVideo={(v) => setPlayingVideo(v)}
                onDeleteVideo={handleDeleteVideo}
                onLaunchDetection={() => setActiveTab('studio')}
                onClearAll={handleClearAllFeeds}
                isRefreshing={isRefreshing}
              />
            </div>
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

      {/* Modern AI Detection Real-Time Progress Modal */}
      <DetectionProgressModal
        isOpen={isProgressModalOpen}
        status={detectionStatus}
        onComplete={handleProgressComplete}
        onClose={() => setIsProgressModalOpen(false)}
      />

      {/* Toast Notification Stack */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
