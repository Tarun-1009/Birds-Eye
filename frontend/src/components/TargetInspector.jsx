import React from 'react';
import { Crosshair, X, ShieldAlert, Activity, Gauge, MapPin } from 'lucide-react';

export default function TargetInspector({ target, onClose }) {
  if (!target) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '260px',
        textAlign: 'center',
        color: 'var(--text-dim)'
      }}>
        <Crosshair size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
        <h4 style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
          No Target Selected
        </h4>
        <p style={{ fontSize: '0.78rem', maxWidth: '240px' }}>
          Click any tracked entity on the Bird's-Eye grid to inspect real-time telemetry.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan)'
            }}>
              {target.id}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{target.type}</span>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)', marginTop: '0.35rem' }}>
            {target.label}
          </h3>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Grid of properties */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <Gauge size={13} />
            <span>Velocity</span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.2rem' }}>
            {target.speed}
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <Activity size={13} />
            <span>AI Confidence</span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
            {(target.confidence * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <MapPin size={13} />
            <span>Zone</span>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginTop: '0.2rem' }}>
            {target.zone}
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <Crosshair size={13} />
            <span>Grid Coordinates</span>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
            X:{target.x.toFixed(1)} Y:{target.y.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <button style={{
          flex: 1,
          padding: '0.6rem',
          backgroundColor: 'var(--accent-cyan)',
          color: '#0b0f19',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem'
        }}>
          <Crosshair size={14} /> Lock Target
        </button>

        <button style={{
          padding: '0.6rem 0.85rem',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          color: 'var(--accent-rose)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          Flag Anomaly
        </button>
      </div>
    </div>
  );
}

