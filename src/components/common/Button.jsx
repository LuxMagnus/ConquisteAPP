import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 border border-blue-500/40 active:scale-[0.98]',
  secondary:
    'bg-[#182542] hover:bg-[#1f3054] text-slate-200 border border-[#23355b] active:scale-[0.98]',
  emerald:
    'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 border border-emerald-500/40 active:scale-[0.98]',
  orange:
    'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25 border border-orange-500/40 active:scale-[0.98]',
  danger:
    'bg-rose-600/90 hover:bg-rose-600 text-white shadow-lg shadow-rose-900/30 border border-rose-500/50 active:scale-[0.98]',
  outline:
    'bg-transparent hover:bg-[#182542] text-slate-300 hover:text-white border border-[#23355b] active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white border-transparent active:scale-[0.98]',
};

const SIZES = {
  xs: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
  sm: 'text-xs sm:text-sm px-3.5 py-2 rounded-xl gap-2 font-medium',
  md: 'text-sm sm:text-base px-4 py-2.5 rounded-xl gap-2 font-semibold',
  lg: 'text-base sm:text-lg px-6 py-3.5 rounded-2xl gap-2.5 font-bold',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) {
  const variantStyles = VARIANTS[variant] || VARIANTS.primary;
  const sizeStyles = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0 text-current" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
