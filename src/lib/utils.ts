import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Player price must always display with 4 decimals
export function formatPrice(price: number | string | undefined | null): string {
  const num = typeof price === 'string' ? parseFloat(price) : (price || 0);
  return num.toFixed(4);
}

// Currency is Caps (🧢)
export function formatCaps(amount: number | string | undefined | null, decimals: number = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(value: number | undefined | null): string {
  const num = value || 0;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

// Generate simple 12-char recovery code (e.g. GS-XXXX-XXXX)
export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const segment2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GS-${segment1}-${segment2}`;
}

// Simple fast SHA256 string hash for recovery code
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.trim().toUpperCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Synthetic internal email for username auth
export function makeSyntheticEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean}@goalstreet.internal`;
}
