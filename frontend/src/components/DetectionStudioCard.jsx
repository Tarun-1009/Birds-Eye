import React from 'react';
import { ArrowRight, Crosshair, Sparkles, Shield, Cpu } from 'lucide-react';

export default function DetectionStudioCard({ onOpenStudio }) {
  return (
    <div className="detection-studio-promo-card">
      {/* Background Decorative Tech Vector Lines */}
      <div className="promo-card-bg-lines" aria-hidden="true">
        <svg viewBox="0 0 400 240" fill="none" preserveAspectRatio="none">
          <circle cx="340" cy="50" r="120" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
          <circle cx="340" cy="50" r="180" stroke="#93c5fd" strokeWidth="0.8" opacity="0.4" />
          <line x1="20" y1="210" x2="380" y2="210" stroke="#dbeafe" strokeWidth="1" strokeDasharray="6 8" />
        </svg>
      </div>

      <div className="promo-card-content">
        {/* Subtle Icon Pill */}
        <div className="promo-badge-pill">
          <Sparkles size={13} color="#1769FF" />
          <span>AI Vision Engine v2.4</span>
        </div>

        {/* Copy Text */}
        <h3 className="promo-heading">
          Smarter Surveillance.<br />
          Greater Awareness.
        </h3>
        
        <p className="promo-subtext">
          AI-powered detection and cross-camera tracking.
        </p>

        {/* Action Button */}
        <button 
          onClick={onOpenStudio}
          className="promo-action-btn"
        >
          <span>Open Detection Studio</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Layered Surveillance / AI Illustration Widget */}
      <div className="promo-illustration-widget" aria-hidden="true">
        <div className="promo-widget-circle">
          <Crosshair size={32} color="#1769FF" />
        </div>
      </div>
    </div>
  );
}

