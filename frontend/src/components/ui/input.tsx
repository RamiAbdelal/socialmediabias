import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn('flex h-12 w-full rounded-md bg-neutral-900/60 px-4 py-2 text-sm ring-offset-neutral-950 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-inner', className)}
      {...props}
    />
  );
});
Input.displayName = 'Input';
