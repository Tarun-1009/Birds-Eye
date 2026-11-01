import React from 'react';
import { Bell, RefreshCw, ChevronRight } from 'lucide-react';

export default function Topbar({ activeTab, onRefresh, isRefreshing, isOnline }) {
  const getTabLabel = (id) => {
    switch (id) {
      case 'overview': return 'Overview';
      case 'ingestion': return 'Video Ingestion';
      case 'vault': return 'Video Vault';
      case 'studio': return 'Detection Studio';
      case 'activity': return 'Activity';
      default: return 'Video Ingestion';
    }
  };

  return (
    <header className="app-topbar">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <span>Workspace</span>
        <ChevronRight size={14} color="#94a3b8" />
        <span className="current">{getTabLabel(activeTab)}</span>
      </div>

      {/* Right Controls */}
      <div className="topbar-right">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="player-btn-clean"
            title="Refresh system data"
            style={{ padding: '6px' }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          </button>
        )}

        {/* Bell Notification with Dot */}
        <button className="notification-btn" aria-label="Notifications">
          <Bell size={19} />
          <span className="notification-badge-dot" />
        </button>

        {/* User Profile Avatar */}
        <div className="user-avatar" title="Commander Alex (Operator)">
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" 
            alt="User Avatar"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.textContent = 'JD';
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
    </header>
  );
}
