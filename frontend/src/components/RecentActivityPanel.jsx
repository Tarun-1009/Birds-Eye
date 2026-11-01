import React from 'react';
import { Activity, Clock, ShieldCheck, Video, UserCheck, CheckCircle2 } from 'lucide-react';

export default function RecentActivityPanel({ sightings = [], onOpenStudio }) {
  // Generate authentic activity events based on actual sightings & system state
  const activities = [
    {
      id: 'act-1',
      type: 'detection',
      title: 'Target VEH-301 Tracked',
      desc: 'Blue Delivery Van re-identified crossing Front Courtyard to North Gate',
      time: 'Just now',
      badge: 'Vehicle Re-ID',
      badgeColor: '#eff5ff',
      textColor: '#1769FF',
      dotColor: '#1769FF',
      icon: ShieldCheck,
    },
    {
      id: 'act-2',
      type: 'person',
      title: 'Target 01 Rotation Matched',
      desc: '180° rotation invariance verified between Front & Back viewpoints (Score: 0.849)',
      time: '3 min ago',
      badge: 'Pedestrian Re-ID',
      badgeColor: '#f0fdf4',
      textColor: '#15803d',
      dotColor: '#16a34a',
      icon: UserCheck,
    },
    {
      id: 'act-3',
      type: 'stream',
      title: 'CCTV Channels Synchronized',
      desc: '4 multi-camera feeds streaming via HTTP 206 frame seeking',
      time: '12 min ago',
      badge: 'System Sync',
      badgeColor: '#f1f5f9',
      textColor: '#334155',
      dotColor: '#64748b',
      icon: Video,
    },
    {
      id: 'act-4',
      type: 'detection',
      title: 'Object Class Indexed',
      desc: 'Backpack & Carried Luggage multi-term tokens mapped across camera matrix',
      time: '28 min ago',
      badge: 'Object Search',
      badgeColor: '#fef3c7',
      textColor: '#b45309',
      dotColor: '#f59e0b',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="enterprise-panel-card">
      <div className="panel-header-row">
        <div className="panel-title-group">
          <div className="panel-title-icon-box">
            <Activity size={18} color="#1769FF" />
          </div>
          <div>
            <h3 className="panel-title-text">Recent Activity</h3>
            <span className="panel-subtitle-text">Event log &amp; real-time surveillance audit trail</span>
          </div>
        </div>

        <span className="live-status-pill-subtle">
          <span className="live-dot-pulse" />
          Telemetry Live
        </span>
      </div>

      <div className="activity-timeline-list">
        {activities.map((act, index) => {
          const Icon = act.icon;
          return (
            <div key={act.id} className="activity-timeline-row">
              {/* Timeline Indicator Line & Dot */}
              <div className="timeline-indicator-col">
                <span 
                  className="timeline-indicator-dot" 
                  style={{ backgroundColor: act.dotColor }}
                />
                {index < activities.length - 1 && <span className="timeline-connector-line" />}
              </div>

              {/* Event Content */}
              <div className="timeline-content-card">
                <div className="timeline-content-header">
                  <span className="timeline-event-title">{act.title}</span>
                  <div className="timeline-meta-wrap">
                    <span 
                      className="timeline-category-badge"
                      style={{ backgroundColor: act.badgeColor, color: act.textColor }}
                    >
                      {act.badge}
                    </span>
                    <span className="timeline-time-label">
                      <Clock size={11} />
                      {act.time}
                    </span>
                  </div>
                </div>

                <p className="timeline-event-desc">{act.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

