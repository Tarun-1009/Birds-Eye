import React from 'react';
import { 
  Radar, 
  LayoutDashboard, 
  MapPin, 
  Bell, 
  Cpu, 
  Sliders, 
  ShieldCheck, 
  Radio
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'overview', label: 'Bird\'s-Eye Grid', icon: Radar },
    { id: 'fleet', label: 'Aerial Fleet', icon: Cpu },
    { id: 'alerts', label: 'Security & Alerts', icon: Bell },
    { id: 'zones', label: 'Sectors & Zones', icon: MapPin },
    { id: 'settings', label: 'Sensor Calibration', icon: Sliders },
  ];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.5rem 1rem',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      <div>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem 1.5rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <Radar size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
              BIRDS-EYE
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Top-Down Telemetry
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--bg-card-hover)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: isActive ? '1px solid var(--border-light)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status Pill Footer */}
      <div style={{
        padding: '0.9rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Defense Radar</span>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: '999px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--accent-emerald)',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Radio size={10} className="pulse-target" /> ONLINE
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          Sensors synced to Node.js backend
        </div>
      </div>
    </aside>
  );
}

