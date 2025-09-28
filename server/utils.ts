
import { customAlphabet } from 'nanoid';

// Generate a custom ID for database records
export function generateId(): string {
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);
  return nanoid();
}

// Format currency values
export function formatCurrency(amount: number | string, currency = 'PKR'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${currency} 0.00`;
  
  return `${currency} ${numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Validate date range
export function validateDateRange(fromDate: string, toDate: string): boolean {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return from <= to;
}

// Get date range for queries
export function getDateRange(fromDate?: string, toDate?: string) {
  const today = new Date();
  const from = fromDate ? new Date(fromDate) : new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const to = toDate ? new Date(toDate) : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}
