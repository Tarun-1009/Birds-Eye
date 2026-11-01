import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from './components/AppHeader';
import MultiCameraMatrix from './components/MultiCameraMatrix';
import SequenceExplorer from './components/SequenceExplorer';
import UploadWorkbench from './components/UploadWorkbench';
import StoredVideosGallery from './components/StoredVideosGallery';
import VideoPlayerModal from './components/VideoPlayerModal';
import Toast from './components/Toast';
import {
  checkHealth,
  fetchCameras,
  fetchSightings,
  fetchIdentities,
  fetchVideosData,
  deleteVideoFile,
  deleteTargetFile,
} from './services/api';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'upload' | 'vault'
  const [isOnline, setIsOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Core CCTV Data
  const [cameras, setCameras] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [storedVideos, setStoredVideos] = useState([]);
  const [target, setTarget] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOrientation, setActiveOrientation] = useState('ALL');
  const [activeEntityFilter, setActiveEntityFilter] = useState('all');

  // Frame Sequence & Active Camera Seeking State
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

  // Load cameras, identities, and metadata
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
      console.error('Failed to load core surveillance data:', err);
      setIsOnline(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch frame-to-frame sequence sightings whenever search query or orientation changes
  const loadSightings = useCallback(async () => {
    try {
      const data = await fetchSightings({
        search: searchQuery,
        orientation: activeOrientation,
        entity_type: activeEntityFilter !== 'all' ? activeEntityFilter : undefined,
      });
      setSightings(data || []);
      setActiveSightingIndex(0);

      // Default seek to first sighting if available
      if (data && data.length > 0) {
        setSeekTarget({
          camera_id: data[0].camera_id,
          timestamp_sec: data[0].timestamp_sec,
        });
      }
    } catch (err) {
      console.error('Failed to fetch sightings sequence:', err);
    }
  }, [searchQuery, activeOrientation, activeEntityFilter]);

  // Initial load
  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  // Sightings load on filter change
  useEffect(() => {
    loadSightings();
  }, [loadSightings]);

  // Handle camera jump from SequenceExplorer
  const handleSeekCamera = (cameraId, timestampSec) => {
    setSeekTarget({
      camera_id: cameraId,
      timestamp_sec: timestampSec,
    });
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

  const handleDeleteTarget = async () => {
    if (!window.confirm('Remove active target reference image?')) return;
    try {
      const res = await deleteTargetFile();
      showToast(res.message || 'Target removed.', 'success');
      loadCoreData();
    } catch (err) {
      showToast(err.message || 'Failed to remove target.', 'error');
    }
  };

  return (
    <div className="app-shell">
      {/* Dark SOC Header */}
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cameraCount={cameras.length}
        sightingsCount={sightings.length}
        identitiesCount={identities.length}
        isOnline={isOnline}
      />

      {/* Main Workspace Body */}
      <main className="dashboard-main">
        {activeTab === 'live' && (
          <div className="studio-grid">
            {/* Left Column: 2x2 CCTV Live Matrix */}
            <div className="workbench-col">
              <div className="workbench-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                    MULTI-CAMERA SURVEILLANCE MATRIX
                  </span>
                  <span className="system-tag mono">
                    {cameras.length} CAMERAS REGISTERED
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="mono" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    RE-ID ENGINE: <strong style={{ color: '#10b981' }}>MULTI-VIEW OSNET</strong> | THRESHOLD: <strong style={{ color: '#60a5fa' }}>0.73</strong>
                  </span>
                </div>
              </div>

              {/* 2x2 Video Stream Players */}
              <MultiCameraMatrix
                cameras={cameras}
                seekTarget={seekTarget}
              />
            </div>

            {/* Right Column: Unified Search, Orientation Filters, Re-ID Target Card & Frame Sequence Stepper */}
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
        )}

        {activeTab === 'upload' && (
          <UploadWorkbench
            onUploadComplete={() => {
              loadCoreData();
              loadSightings();
              setActiveTab('live');
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'vault' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <StoredVideosGallery
              videos={storedVideos}
              target={target}
              onRefresh={loadCoreData}
              onPlayVideo={(v) => setPlayingVideo(v)}
              onDeleteVideo={handleDeleteVideo}
              onDeleteTarget={handleDeleteTarget}
              onLaunchDetection={() => setActiveTab('live')}
              isRefreshing={isRefreshing}
            />
          </div>
        )}
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
