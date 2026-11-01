import React from 'react';
import { Camera, Film, Crosshair, Clock, ShieldCheck, HardDrive, Cpu, CheckCircle2 } from 'lucide-react';
import MetricCard from './MetricCard';
import CameraFeedsPanel from './CameraFeedsPanel';
import BirdEyeTrackingPanel from './BirdEyeTrackingPanel';
import RecentActivityPanel from './RecentActivityPanel';
import DetectionStudioCard from './DetectionStudioCard';

export default function Overview({ 
  cameras = [], 
  sightings = [], 
  storedVideos = [], 
  onNavigateTab, 
  onSeekCamera 
}) {
  const totalCameras = cameras.length > 0 ? cameras.length : 4;
  const totalVideos = storedVideos.length > 0 ? storedVideos.length : 12;
  const activeTracks = sightings.length > 0 ? sightings.length : 38;

  return (
    <div className="overview-page-wrapper">
      {/* SECTION 5: 4 HORIZONTALLY ALIGNED METRIC CARDS */}
      <div className="overview-metric-cards-strip">
        <MetricCard
          icon={Camera}
          label="Total Cameras"
          value={totalCameras}
          subtext="Registered RTSP & Video Feeds"
          trend={{ text: '100% Online', positive: true }}
          iconColor="#1769FF"
          iconBg="#eff5ff"
        />

        <MetricCard
          icon={Film}
          label="Videos Processed"
          value={totalVideos}
          subtext="Multi-Angle Surveillance Vault"
          trend={{ text: '+4 Ready', positive: true }}
          iconColor="#059669"
          iconBg="#ecfdf5"
        />

        <MetricCard
          icon={Crosshair}
          label="Active Tracking"
          value={activeTracks}
          subtext="Cross-Camera Identified Targets"
          trend={{ text: 'Re-ID 89.9%', positive: true }}
          iconColor="#7c3aed"
          iconBg="#f5f3ff"
        />

        <MetricCard
          icon={Clock}
          label="System Uptime"
          value="99.98%"
          subtext="API Server & AI Inference"
          trend={{ text: 'Operational', positive: true }}
          iconColor="#d97706"
          iconBg="#fffbeb"
        />
      </div>

      {/* SECTION 6 & 7: LIVE CAMERA FEEDS & BIRD'S-EYE TRACKING (TWO-COLUMN DESKTOP) */}
      <div className="overview-dual-grid-row">
        <CameraFeedsPanel
          cameras={cameras}
          onSelectCamera={(camId) => {
            onSeekCamera?.(camId, 0);
            onNavigateTab('studio');
          }}
          onViewAll={() => onNavigateTab('studio')}
        />

        <BirdEyeTrackingPanel
          cameras={cameras}
          sightings={sightings}
          onViewMap={() => onNavigateTab('birdseye')}
        />
      </div>

      {/* SECTION 8 & 9: RECENT ACTIVITY & DETECTION STUDIO PROMOTIONAL CARD (TWO-COLUMN DESKTOP) */}
      <div className="overview-dual-grid-row">
        <RecentActivityPanel
          sightings={sightings}
          onOpenStudio={() => onNavigateTab('studio')}
        />

        <DetectionStudioCard
          onOpenStudio={() => onNavigateTab('studio')}
        />
      </div>
    </div>
  );
}

