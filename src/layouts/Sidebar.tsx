import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, List, BarChart2, Server, ChevronDown } from 'lucide-react';
import { ProfileSelector } from '../components/ProfileSelector';
import type { Profile } from '../types';

interface SidebarProps {
  currentProfile: Profile | null;
  onSelectProfile: (profile: Profile | null) => void;
  isOpen: boolean;
  onClose: () => void;
  servers: string[];
  selectedServer: string | null;
  onSelectServer: (server: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentProfile,
  onSelectProfile,
  isOpen,
  onClose,
  servers,
  selectedServer,
  onSelectServer
}) => {
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/market', label: 'Marché', icon: ShoppingBag },
    { path: '/lists', label: 'Listes', icon: List },
    { path: '/analytics', label: 'Analyses', icon: BarChart2 },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside 
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-64 h-screen
          flex flex-col
          bg-bg-secondary border-r border-border-normal
          transition-transform duration-200 ease-out
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-border-normal">
          <span className="text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            Dofus Tracker
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 768 && onClose()}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-accent-primary/10 text-accent-primary' 
                  : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border-normal space-y-4">
          {/* Mobile Server Selector */}
          <div className="md:hidden">
            <button
              onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-bg-tertiary/50 border border-border-normal rounded-lg text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Server size={16} className="text-accent-primary" />
                <span className="truncate">{selectedServer || 'Tous les serveurs'}</span>
              </div>
              <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 ${isServerMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isServerMenuOpen && (
              <div className="mt-2 space-y-1 pl-2 border-l-2 border-border-normal ml-2 animate-in slide-in-from-top-2">
                <button
                  onClick={() => {
                    onSelectServer(null);
                    setIsServerMenuOpen(false);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${!selectedServer ? 'text-accent-primary bg-accent-primary/10 font-medium' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Tous les serveurs
                </button>
                {servers.map(server => (
                  <button
                    key={server}
                    onClick={() => {
                      onSelectServer(server);
                      setIsServerMenuOpen(false);
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${selectedServer === server ? 'text-accent-primary bg-accent-primary/10 font-medium' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    {server}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ProfileSelector 
            currentProfile={currentProfile} 
            onSelectProfile={onSelectProfile} 
          />
        </div>
      </aside>
    </>
  );
};
