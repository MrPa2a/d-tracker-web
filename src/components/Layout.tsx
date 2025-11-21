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
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-transparent text-text-primary">
      {/* Overlay pour mobile quand la sidebar est ouverte */}
      <div 
        className={`fixed inset-0 bg-black/60 z-[55] md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} 
        onClick={onToggleSidebar} 
      />

      <aside 
        className={`
          fixed top-0 left-0 bottom-0 z-[60] w-[320px] max-w-[80%] h-screen
          flex flex-col
          border-r border-white/10 p-5 box-border
          backdrop-blur-xl bg-gradient-to-b from-bg-primary/95 to-bg-primary/85
          shadow-2xl
          transition-transform duration-200 ease-out
          md:static md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-h-0">
        <header className="p-2 md:p-4">{topBar}</header>
        <main className="p-2 md:p-4 flex-1 overflow-y-auto">{main}</main>
      </div>
    </div>
  );
};
