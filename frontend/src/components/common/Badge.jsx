import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm', dot = false, className = '' }) {
  const variants = {
    neutral: 'bg-white/5 text-gray-300 border-white/10',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    danger: 'bg-[#ca0019]/10 text-[#ff4d64] border-[#ca0019]/30',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
  };

  const dotColors = {
    neutral: 'bg-gray-400',
    success: 'bg-emerald-400 animate-pulse',
    danger: 'bg-[#ff4d64] animate-pulse',
    warning: 'bg-amber-400',
    info: 'bg-blue-400',
    purple: 'bg-purple-400',
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 font-medium',
    sm: 'text-xs px-2.5 py-1 font-semibold',
    md: 'text-sm px-3 py-1.5 font-semibold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase transition-colors select-none ${variants[variant] || variants.neutral} ${sizes[size]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.neutral}`} />
      )}
      {children}
    </span>
  );
}
