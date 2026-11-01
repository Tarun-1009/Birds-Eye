import React from 'react';

export default function AmbientBackground() {
  return (
    <div className="ambient-background-layer" aria-hidden="true">
      {/* 1. Subtle Dot Matrix Telemetry Grid */}
      <div className="ambient-dot-grid" />

      {/* 2. Scalable Modern City Skyline Silhouette across Horizon */}
      <div className="ambient-skyline-wrap">
        <svg 
          viewBox="0 0 1440 220" 
          preserveAspectRatio="none" 
          className="ambient-skyline-svg"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Layer: Far Misty Towers */}
          <path 
            d="M0 220 V160 H60 V130 H85 V160 H140 V110 H170 V160 H220 V145 H260 V160 H330 V90 H355 V160 H420 V120 H450 V80 H465 V120 H500 V160 H560 V105 H585 V65 H600 V105 H630 V160 H710 V95 H740 V50 H750 V95 H780 V160 H850 V115 H890 V80 H910 V115 H960 V160 H1020 V100 H1050 V160 H1120 V130 H1160 V160 H1240 V110 H1280 V160 H1360 V140 H1440 V220 Z" 
            fill="url(#skyline-mist-grad)"
          />

          {/* Midground Layer: Modern Geometric City Architecture */}
          <path 
            d="M30 220 V175 H90 V140 H120 V175 H180 V125 H210 V175 H270 V150 H310 V175 H370 V110 H395 V70 H405 V110 H440 V175 H520 V130 H555 V175 H610 V120 H640 V85 H655 V120 H680 V175 H770 V105 H800 V175 H870 V135 H905 V175 H970 V115 H1000 V75 H1010 V115 H1050 V175 H1130 V140 H1170 V175 H1250 V125 H1290 V175 H1370 V155 H1440 V220 Z" 
            fill="url(#skyline-mid-grad)"
          />

          {/* Spire Highlights */}
          <line x1="400" y1="70" x2="400" y2="40" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="400" cy="38" r="2" fill="#60a5fa" />

          <line x1="648" y1="85" x2="648" y2="45" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="648" cy="43" r="2.5" fill="#3b82f6" />

          <line x1="745" y1="50" x2="745" y2="18" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
          <circle cx="745" cy="16" r="3" fill="#2563eb" />

          <line x1="1005" y1="75" x2="1005" y2="42" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="1005" cy="40" r="2" fill="#60a5fa" />

          {/* Datum Guide Lines */}
          <line x1="0" y1="175" x2="1440" y2="175" stroke="#dbeafe" strokeWidth="1" strokeDasharray="6 8" />
          <line x1="0" y1="219" x2="1440" y2="219" stroke="#e2e8f0" strokeWidth="1" />

          <defs>
            <linearGradient id="skyline-mist-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="skyline-mid-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#bfdbfe" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 3. Subtle Concentric Radar Telemetry Sweep in Top-Right */}
      <div className="ambient-radar-rings">
        <svg viewBox="0 0 700 700" className="ambient-radar-svg" fill="none">
          <circle cx="620" cy="110" r="90" stroke="#bfdbfe" strokeWidth="1.2" strokeDasharray="3 4" opacity="0.6" />
          <circle cx="620" cy="110" r="175" stroke="#93c5fd" strokeWidth="1" opacity="0.45" />
          <circle cx="620" cy="110" r="270" stroke="#bfdbfe" strokeWidth="1.2" strokeDasharray="5 6" opacity="0.35" />
          <circle cx="620" cy="110" r="390" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 5" opacity="0.25" />
          <circle cx="620" cy="110" r="530" stroke="#e2e8f0" strokeWidth="1" opacity="0.15" />
        </svg>
      </div>
    </div>
  );
}
