import React from 'react';
import { Cpu, Battery, Wifi, Radio } from 'lucide-react';

export default function DroneFleetList({ nodes }) {
  const getBatteryColor = (level) => {
    if (level > 60) return 'var(--accent-emerald)';
    if (level > 30) return 'var(--accent-amber)';
    return 'var(--accent-rose)';
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
          <Cpu size={17} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Active Aerial Fleet & Sensors</h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: '600' }}>
          {nodes.length} Aerial Units
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem'
      }}>
        {nodes.map(node => (
          <div
            key={node.id}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Radio size={12} color="var(--accent-cyan)" />
                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{node.id}</span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                fontWeight: '600'
              }}>
                {node.status}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {node.name} • {node.zone}
            </div>

            {/* Metrics */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              marginTop: '0.2rem',
              paddingTop: '0.4rem',
              borderTop: '1px solid rgba(255,255,255,0.05)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Battery size={12} color={getBatteryColor(node.battery)} />
                <span style={{ color: getBatteryColor(node.battery), fontWeight: '600' }}>{node.battery}%</span>
              </span>
              <span>Alt: <strong style={{ color: 'var(--text-main)' }}>{node.altitude}</strong></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Wifi size={12} />
                <span>{node.latency}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

