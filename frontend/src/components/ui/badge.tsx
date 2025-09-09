import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'soft';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold tracking-wide',
        variant === 'default' && 'bg-yellow-700/80 text-yellow-100',
        variant === 'outline' && 'border border-neutral-600 text-neutral-200',
        variant === 'soft' && 'bg-neutral-700/60 text-neutral-100',
        className
      )}
      {...props}
    />
  );
};
