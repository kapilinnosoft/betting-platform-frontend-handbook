import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard shadcn/ui-style helper: lets you conditionally combine class
// names (clsx) while correctly resolving conflicting Tailwind utility
// classes (twMerge), e.g. cn('p-2', condition && 'p-4') -> 'p-4' wins.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
