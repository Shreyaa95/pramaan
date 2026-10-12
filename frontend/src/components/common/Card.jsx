import React from 'react';

export function Card({
  children,
  className = '',
  hoverEffect = false,
  glow = false,
  glowingTop = false,
  shimmer = false,
  variant = 'default',
  onClick,
  ...props
}) {
  const variantStyles = {
    default: 'bg-[#121215]/95 backdrop-blur-xl border border-[#27272a] shadow-lg shadow-black/40',
    elevated: 'bg-[#18181b]/95 backdrop-blur-2xl border border-[#3f3f46] shadow-2xl shadow-black/60',
    glass: 'bg-[#121215]/60 backdrop-blur-2xl border border-white/[0.08]',
    subtle: 'bg-[#0c0c0e]/95 border border-[#1f1f23]'
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${variantStyles[variant] || variantStyles.default}
        rounded-2xl p-6 relative overflow-hidden transition-all duration-300
        ${glowingTop ? 'glowing-border' : ''}
        ${shimmer || hoverEffect ? 'card-shimmer' : ''}
        ${hoverEffect ? 'hover:border-[#ca0019]/70 hover:bg-[#18181b] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#ca0019]/15 cursor-pointer active:translate-y-0 active:scale-[0.99]' : ''}
        ${glow ? 'hover:border-[#ca0019] hover:shadow-glow-crimson' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
