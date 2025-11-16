// src/components/Layout.tsx
import React from 'react';

interface LayoutProps {
  sidebar: React.ReactNode;
  topBar: React.ReactNode;
  main: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ sidebar, topBar, main }) => {
  return (
    <div className="app-root">
      <aside className="app-sidebar">{sidebar}</aside>
      <div className="app-main-area">
        <header className="app-topbar">{topBar}</header>
        <main className="app-main">{main}</main>
      </div>
    </div>
  );
};
