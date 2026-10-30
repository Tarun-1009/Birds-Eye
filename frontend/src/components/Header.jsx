import React from 'react';
import { Radio } from 'lucide-react';

export default function Header({ stats, target, isOnline }) {
  return (
    <header style={{
      backgroundColor: 'var(--header-bg)',
      borderBottom: '2px solid var(--header-border)',
      padding: '0.85rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: '#ffffff',
      boxShadow: 'var(--shadow-md)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Brand Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: '#132347',
          border: '1.5px solid #3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#fbbf24',
            boxShadow: '0 0 8px #fbbf24'
          }} />
          <div style={{
            position: 'absolute',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '1px dashed rgba(59, 130, 246, 0.6)',
            animation: 'spin 12s linear infinite'
          }} />
        </div>
        <div>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            letterSpacing: '0.04em',
            margin: 0,
            color: '#ffffff',
            lineHeight: 1.1
          }}>
            BIRD EYE VIEW
          </h1>
          <span style={{
            fontSize: '0.68rem',
            color: '#94a3b8',
            fontWeight: '600',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}>
            Surveillance Ingestion &amp; Multi-Angle Detection
          </span>
        </div>
      </div>

      {/* Metrics Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.07)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 1rem',
          minWidth: '100px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.65rem', color: '#93c5fd', fontWeight: '700', letterSpacing: '0.05em' }}>
            STORED VIDEOS
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', marginTop: '1px' }}>
            {stats?.videoCount || 0}
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.07)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 1rem',
          minWidth: '110px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.65rem', color: '#93c5fd', fontWeight: '700', letterSpacing: '0.05em' }}>
            TOTAL STORAGE
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', marginTop: '1px' }}>
            {stats?.formattedTotalSize || '0 B'}
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.07)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 1rem',
          minWidth: '110px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.65rem', color: '#93c5fd', fontWeight: '700', letterSpacing: '0.05em' }}>
            TARGET PHOTO
          </div>
          <div style={{
            fontSize: '1rem',
            fontWeight: '800',
            color: target ? '#34d399' : '#94a3b8',
            marginTop: '1px'
          }}>
            {target ? 'ATTACHED' : 'NONE'}
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.07)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 1rem',
          minWidth: '95px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.65rem', color: '#93c5fd', fontWeight: '700', letterSpacing: '0.05em' }}>
            SYSTEM
          </div>
          <div style={{
            fontSize: '1rem',
            fontWeight: '800',
            color: isOnline ? '#34d399' : '#f87171',
            marginTop: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#34d399' : '#f87171'
            }} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
      </div>
    </header>
  );
}
