import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] group relative overflow-hidden';

  const variants = {
    primary: 'bg-[#ca0019] hover:bg-[#b91c1c] text-white shadow-lg shadow-[#ca0019]/30 hover:shadow-[#ca0019]/50 border border-[#ca0019] hover:-translate-y-0.5 focus-visible:ring-[#ca0019] btn-shimmer',
    secondary: 'bg-[#18181b] hover:bg-[#27272a] text-gray-200 border border-[#27272a] hover:border-[#3f3f46] hover:text-white focus-visible:ring-gray-400',
    outline: 'bg-[#ca0019]/10 hover:bg-[#ca0019] text-[#ef4444] hover:text-white border border-[#ca0019]/40 hover:border-[#ca0019] hover:-translate-y-0.5 focus-visible:ring-[#ca0019]',
    danger: 'bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/40 hover:border-red-700/60 focus-visible:ring-red-500',
    ghost: 'bg-transparent hover:bg-white/5 text-gray-400 hover:text-white border border-transparent',
    accent: 'bg-gradient-to-r from-[#ca0019] via-[#e0283c] to-[#ef4444] text-white shadow-glow-crimson hover:shadow-glow-crimson-lg hover:brightness-110 border border-white/20 hover:-translate-y-0.5 focus-visible:ring-[#ca0019] btn-shimmer'
  };

  const sizes = {
    xs: 'text-[11px] px-2.5 py-1 gap-1.5 rounded-lg',
    sm: 'text-xs px-3 py-1.5 gap-2 rounded-lg',
    md: 'text-sm px-4 py-2.5 gap-2 rounded-xl',
    lg: 'text-base px-6 py-3 gap-2.5 rounded-xl font-extrabold tracking-wide'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
