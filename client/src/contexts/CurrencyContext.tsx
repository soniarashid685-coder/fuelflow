import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CURRENCY_CONFIG, type CurrencyCode, type CurrencyConfig } from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyConfig: CurrencyConfig;
  formatCurrency: (amount: number | string, options?: Intl.NumberFormatOptions) => string;
  formatCurrencyCompact: (amount: number | string) => string;
  setCurrency: (currency: CurrencyCode) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    // Initialize from localStorage if available
    const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('selectedCurrency') : null;
    if (savedCurrency && savedCurrency in CURRENCY_CONFIG) {
      return savedCurrency as CurrencyCode;
    }
    return 'PKR'; // Default to Pakistani Rupee
  });
  const [isLoading, setIsLoading] = useState(false);

  const currencyConfig = CURRENCY_CONFIG[currency];

  const formatCurrency = (
    amount: number | string, 
    options: Intl.NumberFormatOptions = {}
  ): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return `${currencyConfig.symbol}0`;
    
    const formatter = new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    });

    return formatter.format(numAmount);
  };

  const formatCurrencyCompact = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return `${currencyConfig.symbol}0`;

    // For Pakistani Rupee, show in Lakhs (1L = 100,000)
    if (currency === 'PKR' && numAmount >= 100000) {
      return `${currencyConfig.symbol}${(numAmount / 100000).toFixed(1)}L`;
    }
    
    // For other currencies, use compact notation
    const formatter = new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code,
      notation: 'compact',
      compactDisplay: 'short'
    });

    return formatter.format(numAmount);
  };

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCurrency', newCurrency);
    }
    // Note: In a real app, you'd want to update the station's default currency via API
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyConfig,
        formatCurrency,
        formatCurrencyCompact,
        setCurrency,
        isLoading
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}