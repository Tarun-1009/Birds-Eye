import React from 'react';

export default function StatCard({ label, value, subtext, icon: Icon, color = 'var(--accent-cyan)', trend }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Accent subtle bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        backgroundColor: color
      }} />

      <div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.35rem', lineHeight: 1.1 }}>
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {trend && <span style={{ color: trend.startsWith('+') ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: '600' }}>{trend}</span>}
            <span>{subtext}</span>
          </div>
        )}
      </div>

      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {Icon && <Icon size={20} />}
      </div>
    </div>
  );
}

