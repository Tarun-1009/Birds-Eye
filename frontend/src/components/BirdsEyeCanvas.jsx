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
  SlidersHorizontal,
  Video
} from 'lucide-react';

export default function BirdsEyeCanvas({ 
  nodes = [], 
  targets = [], 
  selectedTarget, 
  onSelectTarget, 
  selectedZone = 'ALL' 
}) {
  const [isSweeping, setIsSweeping] = useState(true);
  const [showCones, setShowCones] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [localTargets, setLocalTargets] = useState(targets);
  const [activeTargetId, setActiveTargetId] = useState(targets[0]?.id || null);

  useEffect(() => {
    setLocalTargets(targets);
    if (!activeTargetId && targets.length > 0) {
      setActiveTargetId(targets[0].id);
    }
  }, [targets]);

  // Subtle real-time drift to simulate continuous tracking
  useEffect(() => {
    if (!isSweeping) return;
    const interval = setInterval(() => {
      setLocalTargets(prev => prev.map(t => {
        const dx = (Math.random() - 0.5) * 0.7;
        const dy = (Math.random() - 0.5) * 0.7;
        return {
          ...t,
          x: Math.min(88, Math.max(12, (t.x || 50) + dx)),
          y: Math.min(88, Math.max(12, (t.y || 50) + dy)),
        };
      }));
    }, 1800);
    return () => clearInterval(interval);
  }, [isSweeping]);

  const getNodeX = (node) => node.coords?.x ?? node.x ?? 50;
  const getNodeY = (node) => node.coords?.y ?? node.y ?? 50;

  const getTargetIcon = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('veh') || t.includes('car') || t.includes('van')) return Car;
    if (t.includes('person') || t.includes('ped')) return User;
    return Crosshair;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Canvas Toolbar Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Crosshair size={18} color="#2563eb" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Top-Down Tactical Tracking Matrix
          </h4>
          <span className="ready-status-pill-blue" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
            <span className="operational-dot-blue"></span>
            {nodes.length} CAMERAS SYNCHRONIZED
          </span>
        </div>

        {/* View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setIsSweeping(!isSweeping)}
            className={`light-filter-btn ${isSweeping ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.75rem' }}
          >
            {isSweeping ? <Pause size={13} /> : <Play size={13} />}
            <span>{isSweeping ? 'Radar Live' : 'Paused'}</span>
          </button>

          <button
            onClick={() => setShowCones(!showCones)}
            className={`light-filter-btn ${showCones ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.75rem' }}
          >
            <Radio size={13} />
            <span>FoV Cones</span>
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`light-filter-btn ${showGrid ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.75rem' }}
          >
            <Layers size={13} />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Main Radar Viewport (Clean Light Tactical Theme) */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '460px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <svg
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            {/* Soft Royal Blue Radar Glow */}
            <radialGradient id="lightRadarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="lightSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="coneGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines & Sector boundaries */}
          {showGrid && (
            <g stroke="#cbd5e1" strokeWidth="0.25" strokeDasharray="1,1">
              <circle cx="50" cy="50" r="15" fill="none" />
              <circle cx="50" cy="50" r="30" fill="none" />
              <circle cx="50" cy="50" r="45" fill="none" />

              <line x1="50" y1="0" x2="50" y2="100" stroke="#94a3b8" strokeWidth="0.3" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#94a3b8" strokeWidth="0.3" />
            </g>
          )}

          {/* Sector Labels */}
          <text x="25" y="10" fill="#94a3b8" fontSize="2.6" fontWeight="700" textAnchor="middle">SECTOR A (NORTH ENTRANCE)</text>
          <text x="75" y="10" fill="#94a3b8" fontSize="2.6" fontWeight="700" textAnchor="middle">SECTOR B (NORTH GATE)</text>
          <text x="25" y="96" fill="#94a3b8" fontSize="2.6" fontWeight="700" textAnchor="middle">SECTOR C (CORRIDOR)</text>
          <text x="75" y="96" fill="#94a3b8" fontSize="2.6" fontWeight="700" textAnchor="middle">SECTOR D (CENTRAL PLAZA)</text>

          {/* Live Radar Sweep Animation */}
          {isSweeping && (
            <g className="radar-sweep-line">
              <line x1="50" y1="50" x2="95" y2="50" stroke="url(#lightSweepGrad)" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="45" fill="url(#lightRadarGlow)" />
            </g>
          )}

          {/* Camera Sensor Nodes & FoV Cones */}
          {nodes.map((node) => {
            const nx = getNodeX(node);
            const ny = getNodeY(node);

            return (
              <g key={node.id}>
                {showCones && (
                  <circle
                    cx={nx}
                    cy={ny}
                    r="16"
                    fill="url(#coneGradLight)"
                    stroke="#93c5fd"
                    strokeWidth="0.3"
                    strokeDasharray="1,1"
                  />
                )}
                <circle cx={nx} cy={ny} r="2.2" fill="#2563eb" />
                <circle cx={nx} cy={ny} r="3.2" fill="none" stroke="#2563eb" strokeWidth="0.3" />
                <text
                  x={nx}
                  y={ny - 3.8}
                  fill="#1e3a8a"
                  fontSize="2.4"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {node.name?.split(' ')[0] || node.id}
                </text>
              </g>
            );
          })}

          {/* Trajectory Path Line connecting tracked sightings */}
          {localTargets.length > 1 && (
            <polyline
              points={localTargets.map(t => `${t.x || 50},${t.y || 50}`).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.6"
              strokeDasharray="1.5,1.5"
            />
          )}

          {/* Active Targets & Detections */}
          {localTargets.map((target, idx) => {
            const tx = target.x || 50;
            const ty = target.y || 50;
            const isSelected = activeTargetId === target.id;
            const targetColor = target.color || (idx === 0 ? '#2563eb' : '#059669');

            return (
              <g
                key={target.id || idx}
                onClick={() => {
                  setActiveTargetId(target.id);
                  onSelectTarget?.(target);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Selection Pulse Ring */}
                {isSelected && (
                  <circle
                    cx={tx}
                    cy={ty}
                    r="4.8"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="0.4"
                    strokeDasharray="1,1"
                  />
                )}

                <circle cx={tx} cy={ty} r="2.2" fill={targetColor} />
                <circle cx={tx} cy={ty} r="1" fill="#ffffff" />

                <text
                  x={tx}
                  y={ty + 4.5}
                  fill="#0f172a"
                  fontSize="2.1"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {target.label || target.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Target Details Overlay Card */}
        {activeTargetId && (
          <div style={{
            position: 'absolute',
            bottom: '15px',
            left: '15px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.65rem 1rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            zIndex: 10
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#2563eb'
            }} />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb' }}>
                TARGET LOCK
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                {localTargets.find(t => t.id === activeTargetId)?.label || activeTargetId}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', borderLeft: '1px solid #cbd5e1', paddingLeft: '0.75rem' }}>
              <div>Coordinates: <strong>X: {Math.round(localTargets.find(t => t.id === activeTargetId)?.x || 50)} | Y: {Math.round(localTargets.find(t => t.id === activeTargetId)?.y || 50)}</strong></div>
              <div>State: <span style={{ color: '#16a34a', fontWeight: 600 }}>Active Tracked</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
