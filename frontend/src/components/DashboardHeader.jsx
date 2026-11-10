import React from 'react';
import { Bell, ChevronRight } from 'lucide-react';

export default function DashboardHeader({ 
  activeTab, 
  user = { name: 'Operator Alex', role: 'Security Ops Lead' }
}) {
  const getTabLabel = (id) => {
    switch (id) {
      case 'ingestion': return 'Upload Feeds';
      case 'studio': return 'Tracking Studio';
      case 'vault': return 'Video Vault';
      default: return 'Upload Feeds';
    }
  };

  return (
    <header className="enterprise-top-header">
      {/* Left: Clean Breadcrumb (Workspace > Current Page) */}
      <div className="header-breadcrumbs">
        <span className="crumb-workspace">Workspace</span>
        <ChevronRight size={13} className="crumb-chevron" />
        <span className="current-crumb">{getTabLabel(activeTab)}</span>
      </div>

      {/* Right: Notification Bell & User Avatar */}
      <div className="header-right-col">
        <button className="header-icon-btn notification-btn" aria-label="Notifications" title="2 New Alerts">
          <Bell size={18} />
          <span className="notification-badge-dot" />
        </button>

        <div className="header-user-avatar-only" title={`Signed in as ${user.name}`}>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" 
            alt={user.name}
            className="user-avatar-img"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.textContent = 'OA';
            }}
          />
        </div>
      </div>
    </header>
  );
}
