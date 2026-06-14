import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'shield' | 'practice' | 'goals';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: 'glass-interactive bg-slate-900/90 border-slate-700 text-white hover:bg-slate-800/95 hover:border-slate-600',
  secondary: 'glass-interactive bg-slate-800/75 border-slate-600 text-slate-200 hover:bg-slate-700/80 hover:border-slate-600',
  danger: 'glass-interactive bg-red-600/95 border-red-500 text-white hover:bg-red-500/95 hover:border-red-400 shadow-sm shadow-red-500/25',
  ghost: 'glass-interactive bg-slate-950/70 border-slate-700 text-slate-300 hover:bg-slate-900/80 hover:text-white',
  shield: 'glass-interactive bg-slate-900/85 border-slate-700 text-slate-200 hover:bg-slate-800/90 hover:border-slate-600',
  practice: 'glass-interactive bg-slate-900/85 border-slate-700 text-slate-200 hover:bg-slate-800/90 hover:border-slate-600',
  goals: 'glass-interactive bg-slate-900/85 border-slate-700 text-slate-200 hover:bg-slate-800/90 hover:border-slate-600',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ variant = 'primary', size = 'md', children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition-all duration-300 active:scale-95 ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
