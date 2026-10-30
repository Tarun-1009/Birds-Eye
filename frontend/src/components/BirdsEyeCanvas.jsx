import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Layers, 
  Crosshair, 
  Maximize2, 
  Car, 
  User, 
  Navigation, 
  Radio,
  SlidersHorizontal
} from 'lucide-react';

export default function BirdsEyeCanvas({ 
  nodes, 
  targets, 
  selectedTarget, 
  onSelectTarget, 
  selectedZone 
}) {
  const [isSweeping, setIsSweeping] = useState(true);
  const [showCones, setShowCones] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [localTargets, setLocalTargets] = useState(targets);

  // Sync when parent targets update
  useEffect(() => {
    setLocalTargets(targets);
  }, [targets]);

  // Subtle real-time drift to simulate live tracking movement
  useEffect(() => {
    if (!isSweeping) return;
    const interval = setInterval(() => {
      setLocalTargets(prev => prev.map(t => {
        const dx = (Math.random() - 0.5) * 0.8;
        const dy = (Math.random() - 0.5) * 0.8;
        return {
          ...t,
          x: Math.min(92, Math.max(8, t.x + dx)),
          y: Math.min(92, Math.max(8, t.y + dy)),
        };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [isSweeping]);

  const filteredTargets = selectedZone === 'ALL' 
    ? localTargets 
    : localTargets.filter(t => t.zone.includes(selectedZone));

  const filteredNodes = selectedZone === 'ALL'
    ? nodes
    : nodes.filter(n => n.zone.includes(selectedZone));

  const getTargetIcon = (type) => {
    switch (type) {
      case 'Vehicle': return Car;
      case 'Pedestrian': return User;
      case 'Drone': return Navigation;
      default: return Crosshair;
    }
  };

  const getTargetColor = (type) => {
    switch (type) {
      case 'Vehicle': return 'var(--accent-cyan)';
      case 'Pedestrian': return 'var(--accent-emerald)';
      case 'Drone': return 'var(--accent-rose)';
      default: return 'var(--accent-amber)';
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Canvas Header / Controls Toolbar */}
      <div style={{
        padding: '0.85rem 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Crosshair size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Tactical Bird's-Eye Grid</span>
          </div>
          <span style={{
            fontSize: '0.72rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)'
          }}>
            Scale: 1:500m | Coord: WGS84
          </span>
        </div>

        {/* View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setIsSweeping(!isSweeping)}
            title={isSweeping ? 'Pause Radar Sweep' : 'Resume Radar Sweep'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: isSweeping ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-surface)',
              color: isSweeping ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            {isSweeping ? <Pause size={13} /> : <Play size={13} />}
            <span>{isSweeping ? 'Live Sweep' : 'Paused'}</span>
          </button>

          <button
            onClick={() => setShowCones(!showCones)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: showCones ? 'var(--bg-surface)' : 'transparent',
              color: showCones ? 'var(--text-main)' : 'var(--text-dim)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <Radio size={13} />
            <span>Sensors</span>
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: showGrid ? 'var(--bg-surface)' : 'transparent',
              color: showGrid ? 'var(--text-main)' : 'var(--text-dim)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <Layers size={13} />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Main Top-Down Radar Viewport */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '480px',
        backgroundColor: '#070b14',
        overflow: 'hidden',
        userSelect: 'none'
      }}>
        <svg
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            {/* Radar Sweep Gradient */}
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="sweepLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Sector boundaries */}
          {showGrid && (
            <g stroke="#1a2538" strokeWidth="0.3" strokeDasharray="1,1">
              {/* Concentric distance range rings */}
              <circle cx="50" cy="50" r="15" fill="none" />
              <circle cx="50" cy="50" r="30" fill="none" />
              <circle cx="50" cy="50" r="45" fill="none" />

              {/* Axis Dividers */}
              <line x1="50" y1="0" x2="50" y2="100" stroke="#24344d" strokeWidth="0.4" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#24344d" strokeWidth="0.4" />
            </g>
          )}

          {/* Sector Watermarks */}
          <text x="25" y="25" fill="#1e293b" fontSize="3.5" fontWeight="700" textAnchor="middle">SECTOR A (NORTH)</text>
          <text x="75" y="25" fill="#1e293b" fontSize="3.5" fontWeight="700" textAnchor="middle">SECTOR B (EAST)</text>
          <text x="25" y="85" fill="#1e293b" fontSize="3.5" fontWeight="700" textAnchor="middle">SECTOR C (SOUTH)</text>
          <text x="75" y="85" fill="#1e293b" fontSize="3.5" fontWeight="700" textAnchor="middle">SECTOR D (WEST)</text>

          {/* Radar Sweep Animated Element */}
          {isSweeping && (
            <g className="radar-sweep-line">
              <line x1="50" y1="50" x2="95" y2="50" stroke="url(#sweepLineGrad)" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="45" fill="url(#radarGlow)" />
            </g>
          )}

          {/* Aerial Node / Drone Sensor Cones */}
          {showCones && filteredNodes.map(node => (
            <g key={node.id}>
              <circle
                cx={node.coords.x}
                cy={node.coords.y}
                r="14"
                fill="rgba(6, 182, 212, 0.04)"
                stroke="#06b6d4"
                strokeWidth="0.3"
                strokeDasharray="1.5,1.5"
              />
              <circle
                cx={node.coords.x}
                cy={node.coords.y}
                r="1.8"
                fill="#06b6d4"
              />
              <text
                x={node.coords.x}
                y={node.coords.y - 3}
                fill="#38bdf8"
                fontSize="2.2"
                textAnchor="middle"
                fontWeight="600"
              >
                {node.id}
              </text>
            </g>
          ))}
        </svg>

        {/* Dynamic Entities / Detected Targets (HTML Overlay for crisp interaction) */}
        {filteredTargets.map(target => {
          const isSelected = selectedTarget?.id === target.id;
          const TargetIcon = getTargetIcon(target.type);
          const color = getTargetColor(target.type);

          return (
            <div
              key={target.id}
              onClick={() => onSelectTarget(target)}
              title={`${target.label} (${target.type}) - Click to inspect`}
              style={{
                position: 'absolute',
                left: `${target.x}%`,
                top: `${target.y}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: isSelected ? 5 : 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'top 0.4s ease, left 0.4s ease'
              }}
            >
              {/* Target Marker Pin */}
              <div style={{
                width: isSelected ? '32px' : '26px',
                height: isSelected ? '32px' : '26px',
                borderRadius: '50%',
                backgroundColor: 'rgba(11, 15, 25, 0.85)',
                border: `2px solid ${color}`,
                boxShadow: isSelected ? `0 0 14px ${color}` : `0 0 6px rgba(0,0,0,0.5)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                transition: 'all 0.2s ease'
              }}>
                <TargetIcon size={isSelected ? 16 : 13} />
              </div>

              {/* Target label badge */}
              <div style={{
                marginTop: '3px',
                padding: '1px 5px',
                backgroundColor: isSelected ? color : 'rgba(17, 24, 39, 0.85)',
                color: isSelected ? '#0b0f19' : 'var(--text-main)',
                fontSize: '0.65rem',
                fontWeight: '600',
                borderRadius: '3px',
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {target.id}
              </div>
            </div>
          );
        })}

        {/* Legend Overlay at bottom-left */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 12px',
          display: 'flex',
          gap: '12px',
          fontSize: '0.72rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }} />
            <span>Drone Base</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }} />
            <span>Vehicles</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald)' }} />
            <span>Pedestrians</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-rose)' }} />
            <span>Rogue/Air Target</span>
          </div>
        </div>

        {/* Center Target Crosshairs coordinate badge */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
          fontFamily: 'monospace',
          fontSize: '0.7rem',
          color: 'var(--accent-cyan)'
        }}>
          CAM: OVERHEAD-01 [90° NADIR]
        </div>
      </div>
    </div>
  );
}

