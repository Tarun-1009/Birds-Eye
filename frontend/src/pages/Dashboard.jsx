import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import BirdsEyeCanvas from '../components/BirdsEyeCanvas';
import TargetInspector from '../components/TargetInspector';
import LiveAlertsTable from '../components/LiveAlertsTable';
import DroneFleetList from '../components/DroneFleetList';
import { 
  Radar, 
  Cpu, 
  MapPin, 
  ShieldCheck, 
  Crosshair, 
  Activity,
  AlertTriangle
} from 'lucide-react';
import { fetchTelemetryNodes, fetchTargets, fetchAlerts } from '../services/api';

export default function Dashboard({ selectedZone }) {
  const [nodes, setNodes] = useState([]);
  const [targets, setTargets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [nodesData, targetsData, alertsData] = await Promise.all([
        fetchTelemetryNodes(),
        fetchTargets(),
        fetchAlerts()
      ]);
      setNodes(nodesData);
      setTargets(targetsData);
      setAlerts(alertsData);
      if (targetsData.length > 0 && !selectedTarget) {
        setSelectedTarget(targetsData[0]);
      }
    } catch (err) {
      console.error('Error loading telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalObjects = targets.length;
  const activeDrones = nodes.filter(n => n.status === 'Active' || n.status === 'Patrolling').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length;

  return (
    <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* KPI Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem'
      }}>
        <StatCard
          label="Tracked Entities"
          value={totalObjects}
          subtext="Detected across all sectors"
          trend="+3"
          icon={Crosshair}
          color="var(--accent-cyan)"
        />

        <StatCard
          label="Aerial Sensor Fleet"
          value={`${activeDrones} / ${nodes.length || 4}`}
          subtext="Coverage efficiency 99.4%"
          trend="100%"
          icon={Cpu}
          color="var(--accent-emerald)"
        />

        <StatCard
          label="Surveillance Area"
          value="12.5 km²"
          subtext="4 Operational Sectors"
          icon={MapPin}
          color="var(--accent-indigo)"
        />

        <StatCard
          label="Security Status"
          value={criticalAlerts > 0 ? `${criticalAlerts} Flagged` : 'Nominal'}
          subtext="Neural Anomaly Detector"
          icon={criticalAlerts > 0 ? AlertTriangle : ShieldCheck}
          color={criticalAlerts > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'}
        />
      </div>

      {/* Main Interactive Grid Section & Inspector Drawer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Bird's-Eye Radar Viewport */}
        <BirdsEyeCanvas
          nodes={nodes}
          targets={targets}
          selectedTarget={selectedTarget}
          onSelectTarget={setSelectedTarget}
          selectedZone={selectedZone}
        />

        {/* Selected Target Inspector */}
        <TargetInspector
          target={selectedTarget}
          onClose={() => setSelectedTarget(null)}
        />
      </div>

      {/* Secondary Row: Fleet status & Live alerts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        <DroneFleetList nodes={nodes} />
        <LiveAlertsTable alerts={alerts} />
      </div>
    </div>
  );
}

