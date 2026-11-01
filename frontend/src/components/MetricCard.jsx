import React from 'react';

export default function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  trend,
  iconColor = '#1769FF',
  iconBg = '#eff5ff' 
}) {
  return (
    <div className="enterprise-metric-card">
      <div className="metric-card-inner">
        <div 
          className="metric-icon-circle"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {Icon && <Icon size={22} />}
        </div>
        <div className="metric-text-content">
          <span className="metric-sublabel">{label}</span>
          <div className="metric-main-val-row">
            <span className="metric-main-val">{value}</span>
            {trend && (
              <span className={`metric-trend-pill ${trend.positive ? 'positive' : 'neutral'}`}>
                {trend.text}
              </span>
            )}
          </div>
          {subtext && <span className="metric-extra-subtext">{subtext}</span>}
        </div>
      </div>
    </div>
  );
}

