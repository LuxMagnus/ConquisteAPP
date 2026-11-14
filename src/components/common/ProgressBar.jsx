import React from 'react';

const COLORS = {
  blue: 'bg-blue-500 shadow-blue-500/30',
  emerald: 'bg-emerald-500 shadow-emerald-500/30',
  orange: 'bg-orange-500 shadow-orange-500/30',
  purple: 'bg-purple-500 shadow-purple-500/30',
  gradient: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-indigo-500/30',
};

export function ProgressBar({
  value = 0,
  max = 100,
  color = 'blue',
  customColor,
  height = 'h-2.5',
  label,
  sublabel,
  showPercentage = false,
  className = '',
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));
  const colorClass = COLORS[color] || COLORS.blue;

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage || sublabel) && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <div className="flex items-center gap-2">
            {label && <span className="text-slate-200">{label}</span>}
            {sublabel && <span className="text-slate-400 text-[11px]">{sublabel}</span>}
          </div>
          {showPercentage && (
            <span className="text-slate-300 font-mono font-semibold">{percentage}%</span>
          )}
        </div>
      )}

      <div className={`w-full bg-[#0d1629] border border-[#1d2c4c] rounded-full overflow-hidden ${height}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 shadow-sm ${colorClass}`}
          style={{
            width: `${percentage}%`,
            backgroundColor: customColor || undefined,
          }}
        />
      </div>
    </div>
  );
}
