import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactNumber(value: number | string | null | undefined, options?: { 
  currency?: string, 
  includeSymbol?: boolean 
}): string {
  const numValue = parseFloat(String(value || 0));
  
  if (isNaN(numValue)) return '0';
  
  const { currency = 'PKR', includeSymbol = true } = options || {};
  
  let formatted: string;
  const absValue = Math.abs(numValue);
  
  if (absValue >= 1_000_000) {
    formatted = (numValue / 1_000_000).toFixed(1) + 'M';
  } else if (absValue >= 1_000) {
    formatted = (numValue / 1_000).toFixed(1) + 'K';
  } else {
    formatted = numValue.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  }
  
  // Remove trailing .0
  formatted = formatted.replace(/\.0([KM])$/, '$1');
  
  if (includeSymbol) {
    const symbol = currency === 'PKR' ? '₨' : currency === 'USD' ? '$' : currency;
    return `${symbol}${formatted}`;
  }
  
  return formatted;
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
