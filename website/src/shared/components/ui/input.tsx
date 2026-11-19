import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';

// Same idea as button.tsx — a "dumb" primitive with no directive of its
// own. It becomes interactive only because whatever USES it (e.g.
// features/auth/components/LoginForm.tsx) is itself a 'use client'
// component that manages the state.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
