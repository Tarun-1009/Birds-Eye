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
  const isDone = percent >= 100 && !status.isRunning;
  const hasError = !!status.error;

  // Smooth number interpolation animation
  useEffect(() => {
    if (percent > displayPercent) {
      const step = Math.ceil((percent - displayPercent) / 5);
      const timer = setTimeout(() => {
        setDisplayPercent((prev) => Math.min(percent, prev + step));
      }, 35);
      return () => clearTimeout(timer);
    } else if (percent === 0) {
      setDisplayPercent(0);
    }
  }, [percent, displayPercent]);

  // Auto-dismiss and transition smoothly after reaching 100% ONLY when modal is actively open
  useEffect(() => {
    if (!isOpen || !isDone) return;

    const timer = setTimeout(() => {
      onComplete?.();
    }, 1400);
    return () => clearTimeout(timer);
  }, [isOpen, isDone, onComplete]);

  if (!isOpen) return null;

  // Checklist stages mapped to progress percent thresholds
  const pipelineSteps = [
    { label: 'Camera Feeds & Temporal Demuxing', threshold: 10, icon: Video },
    { label: 'YOLO11 Tracking (Persons, Cars, Bikes & Cycles)', threshold: 45, icon: Cpu },
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
        backgroundColor: 'rgba(16, 27, 61, 0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #E1E8F5',
          boxShadow: '0 20px 45px -8px rgba(16, 27, 61, 0.14), 0 0 0 1px rgba(225, 232, 245, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Glowing Top Primary Blue Line */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #1769FF, #60a5fa, #93c5fd, #1769FF)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2.2s infinite linear',
          }} 
        />

        {/* Modal Header & Radar Animation (White Theme) */}
        <div style={{ padding: '2rem 2rem 1.25rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Animated Clean Radar Core */}
          <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '1.15rem' }}>
            {/* Spinning Radar Ring */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px dashed #93c5fd',
                animation: 'spin 8s linear infinite',
              }} 
            />
            {/* Pulsing Outer Glow Ring */}
            <div 
              style={{
                position: 'absolute',
                inset: '-5px',
                borderRadius: '50%',
                border: '1px solid rgba(23, 105, 255, 0.2)',
                boxShadow: isDone 
                  ? '0 0 20px rgba(34, 197, 94, 0.25)' 
                  : '0 0 20px rgba(23, 105, 255, 0.2)',
                animation: 'pulse 2s infinite ease-in-out',
              }} 
            />
            {/* Center Core */}
            <div 
              style={{
                position: 'absolute',
                inset: '8px',
                borderRadius: '50%',
                backgroundColor: isDone ? '#dcfce7' : '#eff5ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDone ? '#16a34a' : '#1769FF',
                transition: 'all 0.3s ease',
              }}
            >
              {hasError ? (
                <AlertCircle size={32} color="#dc2626" />
              ) : isDone ? (
                <Check size={34} color="#16a34a" />
              ) : (
                <Cpu size={32} className="spin" style={{ animationDuration: '3.5s' }} />
              )}
            </div>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#101B3D', margin: '0 0 0.3rem 0', letterSpacing: '-0.01em' }}>
            {hasError ? 'Detection Encountered an Issue' : isDone ? 'AI Tracking Complete!' : 'AI Multi-Angle Tracking In Progress'}
          </h2>

          <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0, maxWidth: '400px', lineHeight: 1.45 }}>
            {hasError 
              ? status.error 
              : isDone 
              ? `Indexed ${status.identitiesCount || 0} unique targets across ${status.sightingsCount || 0} keyframes.`
              : 'Executing YOLO11 multi-category tracking & OSNet rotation-invariant Re-ID.'}
          </p>
        </div>

        {/* Progress Bar & Percentage Strip */}
        <div style={{ padding: '0 2rem 1.25rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1769FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isDone ? '#16a34a' : '#1769FF', display: 'inline-block' }} />
              {stage}
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#101B3D', fontFamily: 'monospace' }}>
              {displayPercent}%
            </span>
          </div>

          {/* Progress Track */}
          <div 
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#f1f5f9',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid #E1E8F5'
            }}
          >
            <div 
              style={{
                width: `${displayPercent}%`,
                height: '100%',
                background: isDone 
                  ? 'linear-gradient(90deg, #16a34a, #22c55e)' 
                  : 'linear-gradient(90deg, #1769FF, #3b82f6, #60a5fa)',
                borderRadius: '999px',
                transition: 'width 0.25s ease-out',
                boxShadow: isDone 
                  ? '0 0 10px rgba(34, 197, 94, 0.4)' 
                  : '0 0 10px rgba(23, 105, 255, 0.35)',
              }}
            />
          </div>
        </div>

        {/* Pipeline Checklist (Clean White Theme) */}
        <div 
          style={{
            margin: '0 2rem 1.75rem 2rem',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            backgroundColor: '#f8fbff',
            border: '1px solid #E1E8F5',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
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
                  color: isStepComplete ? '#101B3D' : isCurrentStep ? '#1769FF' : '#94a3b8',
                  fontWeight: isStepComplete || isCurrentStep ? 600 : 400,
                  transition: 'color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StepIcon size={14} color={isStepComplete ? '#16a34a' : isCurrentStep ? '#1769FF' : '#94a3b8'} />
                  <span>{step.label}</span>
                </div>

                <div>
                  {isStepComplete ? (
                    <CheckCircle2 size={15} color="#16a34a" />
                  ) : isCurrentStep ? (
                    <Loader2 size={14} className="spin" color="#1769FF" />
                  ) : (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#cbd5e1', marginRight: '4px' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer (Only if error) */}
        {hasError && (
          <div style={{ padding: '0 2rem 1.5rem 2rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E1E8F5', paddingTop: '1rem' }}>
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
