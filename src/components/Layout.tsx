// src/components/Layout.tsx
import React from 'react';

interface LayoutProps {
  sidebar: React.ReactNode;
  topBar: React.ReactNode;
  main: React.ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  sidebar,
  topBar,
  main,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <div className={`app-root ${isSidebarOpen ? 'app-root--sidebar-open' : ''}`}>
      {/* Overlay pour mobile quand la sidebar est ouverte */}
      <div className="app-overlay" onClick={onToggleSidebar} />

      <aside className="app-sidebar">{sidebar}</aside>

      <div className="app-main-area">
        <header className="app-topbar">{topBar}</header>
        <main className="app-main">{main}</main>
      </div>
    </div>
  );
};
