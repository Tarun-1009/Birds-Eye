import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Shield, Layers, Bell, Eye } from 'lucide-react';
import { checkHealth } from '../services/api';

export default function Topbar({ onRefresh, isRefreshing, selectedZone, setSelectedZone }) {
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: '' });
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    verifyBackend();
  }, []);

  const verifyBackend = async () => {
    const health = await checkHealth();
    setBackendHealth(health);
  };

  const isOnline = backendHealth.status === 'online' || backendHealth.status === 'ok';

  return (
    <header style={{
      height: '68px',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      {/* Left: View selector & Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Eye size={18} color="var(--accent-cyan)" />
          <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Aerial Surveillance Feed</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Sector:</span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Sectors (Global View)</option>
            <option value="Sector A">Sector A - North Perimeter</option>
            <option value="Sector B">Sector B - Logistics Hub</option>
            <option value="Sector C">Sector C - Transit Corridor</option>
            <option value="Sector D">Sector D - Aerial Flight Corridor</option>
          </select>
        </div>
      </div>

      {/* Right: Actions, Backend Status & Live Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Backend Connectivity Status */}
        <div 
          onClick={verifyBackend}
          title="Click to re-ping Node.js Backend"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            borderRadius: '999px',
            backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            cursor: 'pointer',
            fontSize: '0.78rem',
            color: isOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)'
          }}
        >
          <Server size={14} />
          <span>{isOnline ? 'Backend API Active' : 'Backend Standalone Mode'}</span>
        </div>

        {/* Live Clock */}
        <div style={{
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-card)',
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          {currentTime} UTC
        </div>

        {/* Manual Sync Button */}
        <button
          onClick={() => {
            onRefresh();
            verifyBackend();
          }}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.45rem 0.85rem',
            fontSize: '0.85rem',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease'
          }}
        >
          <RefreshCw size={14} style={{ animation: isRefreshing ? 'radar-sweep 1s linear infinite' : 'none' }} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
        </button>
      </div>
    </header>
  );
}

