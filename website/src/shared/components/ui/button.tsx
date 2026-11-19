import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';

// A plain UI primitive: no data-fetching, no business logic, works the
// same whether it's rendered inside a Server Component's tree or used
// inside a 'use client' form. This file itself has NO 'use client'
// directive because it has no interactivity of its own (no useState,
// onClick logic beyond passing props through) — Next.js is happy to
// render it on the server as part of a page, and it still works fine
// when a parent client component uses it interactively.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-4 py-2 disabled:opacity-50 disabled:pointer-events-none',
          variant === 'default' && 'bg-slate-900 text-white hover:bg-slate-800',
          variant === 'outline' && 'border border-slate-300 hover:bg-slate-50',
          variant === 'ghost' && 'hover:bg-slate-100',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
