import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'blue' | 'green' | 'amber' | 'pink' | 'none';
  onClick?: () => void;
  hover?: boolean;
  variant?: 'default' | 'sm' | 'md' | 'lg' | 'xl';
  gradient?: boolean;
  style?: React.CSSProperties;
}

export function GlassCard({ 
  children, 
  className = '', 
  glow = 'none', 
  onClick, 
  hover = false,
  variant = 'default',
  gradient = false,
  style,
}: GlassCardProps) {
  const glowClass = '';
  const gradientClass = gradient ? 'bg-gradient-to-br from-slate-900/60 via-slate-950/80 to-slate-950/95 border-slate-600/30 shadow-lg' : 'bg-slate-950/90 border border-slate-700 shadow-sm';
  const variantClass = gradientClass;
  const hoverClass = hover ? 'hover:border-slate-600 hover:bg-slate-900/95 cursor-pointer transition-all' : '';

  return (
    <div
      className={`${variantClass} p-5 ${hoverClass} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
