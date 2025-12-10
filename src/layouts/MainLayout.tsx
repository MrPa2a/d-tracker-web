import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { Profile, DateRangePreset } from '../types';

interface MainLayoutProps {
  currentProfile: Profile | null;
  onSelectProfile: (profile: Profile | null) => void;
  servers: string[];
  selectedServer: string | null;
  onSelectServer: (server: string | null) => void;
  dateRange: DateRangePreset;
  onDateRangeChange: (range: DateRangePreset) => void;
  minPrice: string;
  onMinPriceChange: (val: string) => void;
  maxPrice: string;
  onMaxPriceChange: (val: string) => void;
  onlyFavorites: boolean;
  onToggleOnlyFavorites: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentProfile,
  onSelectProfile,
  servers,
  selectedServer,
  onSelectServer,
  dateRange,
  onDateRangeChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  onlyFavorites,
  onToggleOnlyFavorites
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#141517] text-gray-200 font-sans">
      <Sidebar 
        currentProfile={currentProfile}
        onSelectProfile={onSelectProfile}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-200">
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          servers={servers}
          selectedServer={selectedServer}
          onSelectServer={onSelectServer}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          minPrice={minPrice}
          onMinPriceChange={onMinPriceChange}
          maxPrice={maxPrice}
          onMaxPriceChange={onMaxPriceChange}
          onlyFavorites={onlyFavorites}
          onToggleOnlyFavorites={onToggleOnlyFavorites}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
