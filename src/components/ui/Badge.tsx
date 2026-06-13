interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  success: 'bg-green-950/60 text-green-300 border-green-700',
  warning: 'bg-amber-950/60 text-amber-300 border-amber-700',
  danger: 'bg-red-950/60 text-red-300 border-red-700',
  info: 'bg-blue-950/60 text-blue-300 border-blue-700',
  neutral: 'bg-slate-950/90 text-slate-300 border-slate-700',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
