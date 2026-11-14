import React from 'react';
import { Button } from './Button.jsx';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  actionVariant = 'primary',
  className = '',
  children,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-[#121c33]/70 border border-[#1d2c4c] rounded-2xl ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400 shadow-inner">
          <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
        </div>
      )}

      {title && (
        <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 tracking-tight">
          {title}
        </h3>
      )}

      {description && (
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button
          variant={actionVariant}
          size="sm"
          onClick={onAction}
          icon={actionIcon}
        >
          {actionLabel}
        </Button>
      )}

      {children}
    </div>
  );
}
