// Currency configuration with proper formatting info
export const CURRENCY_CONFIG = {
  PKR: { 
    symbol: '₨', 
    name: 'Pakistani Rupee', 
    locale: 'en-PK',
    code: 'PKR'
  },
  INR: { 
    symbol: '₹', 
    name: 'Indian Rupee', 
    locale: 'en-IN',
    code: 'INR'
  },
  USD: { 
    symbol: '$', 
    name: 'US Dollar', 
    locale: 'en-US',
    code: 'USD'
  },
  EUR: { 
    symbol: '€', 
    name: 'Euro', 
    locale: 'de-DE',
    code: 'EUR'
  },
  GBP: { 
    symbol: '£', 
    name: 'British Pound', 
    locale: 'en-GB',
    code: 'GBP'
  },
  AED: { 
    symbol: 'د.إ', 
    name: 'UAE Dirham', 
    locale: 'ar-AE',
    code: 'AED'
  },
  SAR: { 
    symbol: '﷼', 
    name: 'Saudi Riyal', 
    locale: 'ar-SA',
    code: 'SAR'
  },
  CNY: { 
    symbol: '¥', 
    name: 'Chinese Yuan', 
    locale: 'zh-CN',
    code: 'CNY'
  }
} as const;

export type CurrencyCode = keyof typeof CURRENCY_CONFIG;
export type CurrencyConfig = (typeof CURRENCY_CONFIG)[CurrencyCode];

// Helper function to get currency symbol without context
export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  return CURRENCY_CONFIG[currencyCode].symbol;
}

// Helper function to format currency amount without context
export function formatAmount(
  amount: number | string, 
  currencyCode: CurrencyCode = 'PKR',
  options: Intl.NumberFormatOptions = {}
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return `${CURRENCY_CONFIG[currencyCode].symbol}0`;
  
  const config = CURRENCY_CONFIG[currencyCode];
  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });

  return formatter.format(numAmount);
}

// Helper function for compact formatting
export function formatAmountCompact(
  amount: number | string, 
  currencyCode: CurrencyCode = 'PKR'
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return `${CURRENCY_CONFIG[currencyCode].symbol}0`;

  const config = CURRENCY_CONFIG[currencyCode];

  // For Pakistani Rupee, show in Lakhs (1L = 100,000)
  if (currencyCode === 'PKR' && numAmount >= 100000) {
    return `${config.symbol}${(numAmount / 100000).toFixed(1)}L`;
  }
  
  // For other currencies, use compact notation
  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    notation: 'compact',
    compactDisplay: 'short'
  });

  return formatter.format(numAmount);
}

// Parse currency string back to number (removing symbols and formatting)
export function parseCurrencyString(currencyString: string): number {
  // Remove all non-numeric characters except decimal point and minus sign
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

// Validate currency code
export function isValidCurrency(code: string): code is CurrencyCode {
  return code in CURRENCY_CONFIG;
}