import React, { useEffect, useState } from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Video, 
  Compass, 
  Layers, 
  Check, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function DetectionProgressModal({ 
  isOpen, 
  status = {}, 
  onComplete, 
  onClose 
}) {
  const [displayPercent, setDisplayPercent] = useState(0);

  const percent = Math.min(100, Math.max(0, status.percent || 0));
  const stage = status.stage || 'Initializing AI Pipeline...';
  const camera = status.camera;
  const isDone = percent >= 100 && !status.isRunning;
  const hasError = !!status.error;

  // Smooth number interpolation animation
  useEffect(() => {
    if (percent > displayPercent) {
      const step = Math.ceil((percent - displayPercent) / 5);
      const timer = setTimeout(() => {
        setDisplayPercent((prev) => Math.min(percent, prev + step));
      }, 40);
      return () => clearTimeout(timer);
    } else if (percent === 0) {
      setDisplayPercent(0);
    }
  }, [percent, displayPercent]);

  // Auto-dismiss and transition after reaching 100%
  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [isDone, onComplete]);

  if (!isOpen) return null;

  // Checklist stages mapped to progress percent thresholds
  const pipelineSteps = [
    { label: 'Camera Feeds & Temporal Demuxing', threshold: 10, icon: Video },
    { label: 'YOLO11 Multi-Category Tracking (Persons & Vehicles)', threshold: 45, icon: Cpu },
    { label: 'YOLO11-Pose 180° Orientation Analysis (Front / Back)', threshold: 75, icon: Compass },
    { label: 'OSNet Deep Visual Metric Clustering', threshold: 88, icon: Layers },
    { label: 'Chronological Keyframe Trajectories & Crops', threshold: 98, icon: Sparkles },
  ];

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(10, 15, 30, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(59, 130, 246, 0.28)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 35px rgba(37, 99, 235, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Glowing Top Ambient Line */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #2563eb, #38bdf8, #818cf8, #2563eb)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2.5s infinite linear',
          }} 
        />

        {/* Modal Header & Radar Animation */}
        <div style={{ padding: '2rem 2rem 1.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Animated Futuristic Radar Core */}
          <div style={{ position: 'relative', width: '84px', height: '84px', marginBottom: '1.25rem' }}>
            {/* Spinning Radar Ring */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px dashed rgba(56, 189, 248, 0.45)',
                animation: 'spin 10s linear infinite',
              }} 
            />
            {/* Pulsing Outer Glow Ring */}
            <div 
              style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '50%',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                boxShadow: isDone 
                  ? '0 0 25px rgba(34, 197, 94, 0.4)' 
                  : '0 0 25px rgba(37, 99, 235, 0.35)',
                animation: 'pulse 2s infinite ease-in-out',
              }} 
            />
            {/* Center Core */}
            <div 
              style={{
                position: 'absolute',
                inset: '8px',
                borderRadius: '50%',
                backgroundColor: isDone ? '#14532d' : '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDone ? '#4ade80' : '#38bdf8',
                transition: 'all 0.4s ease',
              }}
            >
              {hasError ? (
                <AlertCircle size={34} color="#f87171" />
              ) : isDone ? (
                <Check size={36} color="#4ade80" />
              ) : (
                <Cpu size={34} className="spin" style={{ animationDuration: '4s' }} />
              )}
            </div>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.35rem 0', letterSpacing: '-0.01em' }}>
            {hasError ? 'Detection Encountered an Issue' : isDone ? 'AI Tracking Complete!' : 'AI Multi-Angle Tracking In Progress'}
          </h2>

          <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0, maxWidth: '420px', lineHeight: 1.45 }}>
            {hasError 
              ? status.error 
              : isDone 
              ? `Successfully indexed ${status.identitiesCount || 0} unique targets across ${status.sightingsCount || 0} keyframes.`
              : 'Executing YOLO11 multi-category tracking & OSNet rotation-invariant Re-ID.'}
          </p>
        </div>

        {/* Progress Bar & Percentage Strip */}
        <div style={{ padding: '0 2rem 1.25rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isDone ? '#4ade80' : '#38bdf8', display: 'inline-block' }} />
              {stage}
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
              {displayPercent}%
            </span>
          </div>

          {/* Progress Track */}
          <div 
            style={{
              width: '100%',
              height: '9px',
              backgroundColor: '#1e293b',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
            }}
          >
            <div 
              style={{
                width: `${displayPercent}%`,
                height: '100%',
                background: isDone 
                  ? 'linear-gradient(90deg, #16a34a, #4ade80)' 
                  : 'linear-gradient(90deg, #2563eb, #38bdf8, #60a5fa)',
                borderRadius: '999px',
                transition: 'width 0.25s ease-out',
                boxShadow: isDone 
                  ? '0 0 12px rgba(74, 222, 128, 0.7)' 
                  : '0 0 12px rgba(56, 189, 248, 0.7)',
              }}
            />
          </div>
        </div>

        {/* Pipeline Checklist */}
        <div 
          style={{
            margin: '0 2rem 1.75rem 2rem',
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: '#131d35',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}
        >
          {pipelineSteps.map((step, idx) => {
            const StepIcon = step.icon;
            const isStepComplete = displayPercent >= step.threshold;
            const isCurrentStep = !isStepComplete && (idx === 0 || displayPercent >= pipelineSteps[idx - 1].threshold);

            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: isStepComplete ? '#e2e8f0' : isCurrentStep ? '#38bdf8' : '#64748b',
                  fontWeight: isStepComplete || isCurrentStep ? 600 : 400,
                  transition: 'color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StepIcon size={14} color={isStepComplete ? '#4ade80' : isCurrentStep ? '#38bdf8' : '#64748b'} />
                  <span>{step.label}</span>
                </div>

                <div>
                  {isStepComplete ? (
                    <CheckCircle2 size={15} color="#4ade80" />
                  ) : isCurrentStep ? (
                    <Loader2 size={14} className="spin" color="#38bdf8" />
                  ) : (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#334155', marginRight: '4px' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        {hasError && (
          <div style={{ padding: '0 2rem 1.75rem 2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              className="continue-blue-btn"
              style={{ padding: '0.45rem 1.25rem', fontSize: '0.84rem' }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

