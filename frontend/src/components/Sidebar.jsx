import React, { useState } from 'react';
import { 
  Home, 
  Video, 
  Database, 
  Crosshair, 
  MapPin,
  BarChart2,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isOnline = true }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'ingestion', label: 'Video Ingestion', icon: Video },
    { id: 'vault', label: 'Video Vault', icon: Database },
    { id: 'studio', label: 'Detection Studio', icon: Crosshair },
    { id: 'birdseye', label: "Bird's-Eye View", icon: MapPin },
    { id: 'activity', label: 'Activity', icon: BarChart2 },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="mobile-sidebar-toggle-btn"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle Navigation"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop for Mobile Drawer */}
      {isMobileOpen && (
        <div 
          className="mobile-sidebar-backdrop" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`enterprise-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top-section">
          {/* Brand Header */}
          <div className="sidebar-brand-header">
            <div className="brand-logo-icon">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 5C7.5 5 2.5 14 2.5 14C2.5 14 7.5 23 14 23C20.5 23 25.5 14 25.5 14C25.5 14 20.5 5 14 5Z" stroke="#1769FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="14" cy="14" r="5" fill="#1769FF" />
                <circle cx="15.5" cy="12.5" r="1.5" fill="#ffffff" />
              </svg>
            </div>
            <div className="brand-title-wrap">
              <span className="brand-title-main">BIRD EYE</span>
            </div>
          </div>

          {/* Navigation Items List */}
          <nav className="sidebar-nav-container">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-btn-icon-wrap">
                    <Icon size={18} />
                  </div>
                  <span className="nav-btn-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Status (Clean Pale Green Operational Pill) */}
        <div className="sidebar-bottom-status-wrap">
          <div className="sidebar-operational-pill">
            <span className={`status-dot ${isOnline ? 'operational' : 'offline'}`} />
            <span className="operational-text">
              {isOnline ? 'All systems operational' : 'System degraded'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
