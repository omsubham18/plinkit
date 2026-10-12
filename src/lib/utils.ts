import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format whole integer rupees per docs/DESIGN.md:
 * "₹45": rupee sign, no space, no decimals.
 */
export function formatPrice(amount: number): string {
  return `₹${Math.round(amount)}`;
}
