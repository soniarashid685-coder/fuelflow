import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';

export interface StationProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  registrationNumber: string;
  taxNumber: string;
  logo?: string;
}

export interface StationSettings {
  stationName: string;
  contactNumber: string;
  email: string;
  gstNumber: string;
  address: string;
  registrationNumber: string;
  logo?: string;
}

interface StationContextType {
  station: StationProfile | null;
  updateStation: (station: Partial<StationProfile>) => Promise<void>;
  stationSettings: StationSettings | null;
  updateStationSettings: (settings: Partial<StationSettings>) => Promise<void>;
  loadSettings: (stationId: string) => Promise<void>;
  isLoading: boolean;
}

const StationContext = createContext<StationContextType>({
  station: null,
  updateStation: async () => {},
  stationSettings: null,
  updateStationSettings: async () => {},
  isLoading: true,
});

export const useStation = () => {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error('useStation must be used within a StationProvider');
  }
  return context;
};

interface StationProviderProps {
  children: ReactNode;
}

export const StationProvider: React.FC<StationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [station, setStation] = useState<StationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert station to stationSettings format
  const stationSettings: StationSettings | null = station ? {
    stationName: station.name,
    contactNumber: station.phone,
    email: station.email,
    gstNumber: station.taxNumber,
    address: station.address,
    registrationNumber: station.registrationNumber,
    logo: station.logo,
  } : null;

  useEffect(() => {
    const fetchStationDetails = async () => {
      if (user?.stationId) {
        try {
          const response = await apiRequest('GET', `/api/stations/${user.stationId}`);
          if (response.ok) {
            const stationData = await response.json();
            setStation({
              id: stationData.id,
              name: stationData.name,
              address: stationData.address || 'Station Address',
              phone: stationData.phone || '+92-XXX-XXXXXXX',
              email: stationData.email || 'station@fuelflow.com',
              registrationNumber: stationData.registrationNumber || 'REG-001',
              taxNumber: stationData.taxNumber || 'TAX-001',
              logo: stationData.logo,
            });
          }
        } catch (error) {
          console.error('Failed to fetch station details:', error);
          // Set default station details if fetch fails
          setStation({
            id: user.stationId,
            name: 'FuelFlow Station',
            address: 'Station Address',
            phone: '+92-XXX-XXXXXXX',
            email: 'station@fuelflow.com',
            registrationNumber: 'REG-001',
            taxNumber: 'TAX-001',
          });
        }
      }
      setIsLoading(false);
    };

    fetchStationDetails();
  }, [user?.stationId]);

  const updateStation = async (updates: Partial<StationProfile>) => {
    if (!station || !user?.stationId) return;

    try {
      const response = await apiRequest("PUT", `/api/stations/${user.stationId}`, updates);
      if (response.ok) {
        const updatedStation = await response.json();
        setStation(prev => prev ? { ...prev, ...updatedStation } : null);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update station:', error);
      throw error;
    }
  };

  const updateStationSettings = async (settings: Partial<StationSettings>) => {
    if (!station || !user?.stationId) return;

    // Convert stationSettings format to station format
    const updates: Partial<StationProfile> = {};
    if (settings.stationName !== undefined) updates.name = settings.stationName;
    if (settings.contactNumber !== undefined) updates.phone = settings.contactNumber;
    if (settings.email !== undefined) updates.email = settings.email;
    if (settings.gstNumber !== undefined) updates.taxNumber = settings.gstNumber;
    if (settings.address !== undefined) updates.address = settings.address;
    if (settings.registrationNumber !== undefined) updates.registrationNumber = settings.registrationNumber;
    if (settings.logo !== undefined) updates.logo = settings.logo;

    await updateStation(updates);
  };

  const loadSettings = async (stationId: string) => {
    try {
      const response = await apiRequest('GET', `/api/stations/${stationId}`);
      if (response.ok) {
        const stationData = await response.json();
        setStation({
          id: stationData.id,
          name: stationData.name,
          address: stationData.address || 'Station Address',
          phone: stationData.phone || '+92-XXX-XXXXXXX',
          email: stationData.email || 'station@fuelflow.com',
          registrationNumber: stationData.registrationNumber || 'REG-001',
          taxNumber: stationData.taxNumber || 'TAX-001',
          logo: stationData.logo,
        });
      }
    } catch (error) {
      console.error('Failed to load station settings:', error);
    }
  };

  return (
    <StationContext.Provider value={{ station, updateStation, stationSettings, updateStationSettings, loadSettings, isLoading }}>
      {children}
    </StationContext.Provider>
  );
};