import * as React from 'react';
import { cn } from '@/lib/utils';

interface AccordionItemProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, defaultOpen }) => {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div className="rounded-lg bg-neutral-900/50">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 font-medium text-sm flex items-center justify-between hover:bg-neutral-800/60 transition"
      >
        <span>{title}</span>
        <span className="text-xs opacity-70">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm">
          {children}
        </div>
      )}
    </div>
  );
};

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}
export const Accordion: React.FC<AccordionProps> = ({ children, className }) => (
  <div className={cn('space-y-2', className)}>{children}</div>
);
