import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 disabled:opacity-50 disabled:pointer-events-none bg-gradient-to-br from-sky-500 to-blue-800 hover:from-green-500 hover:to-yellow-400 text-white shadow-md rounded-md',
  {
    variants: {
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        pill: 'h-8 px-4 rounded-full text-xs'
      },
      variant: {
        default: '',
        subtle: 'from-neutral-700 to-neutral-700 hover:from-neutral-600 hover:to-neutral-600',
        ghost: 'bg-transparent hover:bg-neutral-700/60 shadow-none text-white',
      }
    },
    defaultVariants: {
      size: 'default',
      variant: 'default'
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, size, variant, ...props }, ref) => {
  return (
    <button ref={ref} className={cn(buttonVariants({ size, variant }), className)} {...props} />
  );
});
Button.displayName = 'Button';

export { buttonVariants };
