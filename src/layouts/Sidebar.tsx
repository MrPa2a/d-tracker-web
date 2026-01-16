import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, List, BarChart2, Server, ChevronDown, ChevronRight, ScanLine, TrendingUp, Target, Hammer, Wrench, Zap, ChevronsUp, Calendar, Coins } from 'lucide-react';
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
  const location = useLocation();
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(true);
  const [isToolboxOpen, setIsToolboxOpen] = useState(true);

  // Auto-open menus if we are in their section
  useEffect(() => {
    if (location.pathname.startsWith('/analysis')) {
      setIsAnalysisOpen(true);
    }
    if (location.pathname.startsWith('/toolbox')) {
      setIsToolboxOpen(true);
    }
  }, [location.pathname]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/bank', label: 'Banque', icon: Coins },
    { path: '/market', label: 'Marché', icon: ShoppingBag },
    { path: '/lists', label: 'Listes', icon: List },
    { path: '/crafting', label: 'Artisans', icon: Hammer },
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

        {/* Navigation - scrollable */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
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

          {/* Analysis Section */}
          <div>
            <button
              onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors
                ${location.pathname.startsWith('/analysis')
                  ? 'text-accent-primary' 
                  : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
              `}
            >
              <div className="flex items-center gap-3">
                <BarChart2 size={20} />
                <span className="font-medium">Analyses</span>
              </div>
              {isAnalysisOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isAnalysisOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-border-normal space-y-1">
                <NavLink
                  to="/analysis/scanner"
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                    ${isActive 
                      ? 'bg-accent-primary/10 text-accent-primary' 
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
                  `}
                >
                  <ScanLine size={16} />
                  <span className="font-medium">Scanner</span>
                </NavLink>
                <NavLink
                  to="/analysis/trends"
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                    ${isActive 
                      ? 'bg-accent-primary/10 text-accent-primary' 
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
                  `}
                >
                  <TrendingUp size={16} />
                  <span className="font-medium">Tendances</span>
                </NavLink>
                <NavLink
                  to="/analysis/matrix"
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                    ${isActive 
                      ? 'bg-accent-primary/10 text-accent-primary' 
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
                  `}
                >
                  <Target size={16} />
                  <span className="font-medium">Matrice</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Toolbox Section */}
          <div>
            <button
              onClick={() => setIsToolboxOpen(!isToolboxOpen)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors
                ${location.pathname.startsWith('/toolbox')
                  ? 'text-accent-primary' 
                  : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
              `}
            >
              <div className="flex items-center gap-3">
                <Wrench size={20} />
                <span className="font-medium">Boite à outils</span>
              </div>
              {isToolboxOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isToolboxOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-border-normal space-y-1">
                <NavLink
                  to="/toolbox/consumables"
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                    ${isActive 
                      ? 'bg-accent-primary/10 text-accent-primary' 
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
                  `}
                >
                  <Zap size={16} />
                  <span className="font-medium">Consommables</span>
                </NavLink>
                <NavLink
                  to="/toolbox/leveling"
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                    ${isActive 
                      ? 'bg-accent-primary/10 text-accent-primary' 
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
                  `}
                >
                  <ChevronsUp size={16} />
                  <span className="font-medium">Leveling</span>
                </NavLink>                <NavLink
                  to="/toolbox/almanax"
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                    ${isActive 
                      ? 'bg-accent-primary/10 text-accent-primary' 
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}
                  `}
                >
                  <Calendar size={16} />
                  <span className="font-medium">Almanax</span>
                </NavLink>              </div>
            )}
          </div>
        </nav>

        {/* Bottom Section - fixed at bottom, shrinks if needed */}
        <div className="shrink-0 p-4 border-t border-border-normal space-y-4">
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
