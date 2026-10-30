import React from 'react';
import { AlertTriangle, Info, ShieldAlert, CheckCircle } from 'lucide-react';

export default function LiveAlertsTable({ alerts }) {
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'rgba(244, 63, 94, 0.15)',
          color: 'var(--accent-rose)',
          border: 'rgba(244, 63, 94, 0.3)',
          icon: ShieldAlert
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: 'var(--accent-amber)',
          border: 'rgba(245, 158, 11, 0.3)',
          icon: AlertTriangle
        };
      default:
        return {
          bg: 'rgba(6, 182, 212, 0.15)',
          color: 'var(--accent-cyan)',
          border: 'rgba(6, 182, 212, 0.3)',
          icon: Info
        };
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={17} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Live Security & Anomaly Feed</h3>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Auto-updating</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {alerts.map((alert) => {
          const badge = getSeverityBadge(alert.severity);
          const Icon = badge.icon;

          return (
            <div
              key={alert.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: badge.bg,
                  border: `1px solid ${badge.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: badge.color
                }}>
                  <Icon size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                    {alert.type}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    {alert.zone} • Confidence {alert.confidence}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '600',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  backgroundColor: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  textTransform: 'uppercase'
                }}>
                  {alert.severity}
                </span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                  {alert.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

