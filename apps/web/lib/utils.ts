import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class names safely, resolving conflicts.
 * Used by all shadcn/ui components — cn('px-4', condition && 'px-8') → 'px-8'.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
