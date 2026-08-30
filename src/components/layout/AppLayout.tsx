import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PresenceProvider } from '../../context/PresenceContext';
import { NotificationProvider } from '../../context/NotificationContext';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--nexus-cream)]">
      <PresenceProvider>
        <NotificationProvider>
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="max-w-7xl mx-auto h-full">
                <Outlet />
              </div>
            </main>
          </div>
        </NotificationProvider>
      </PresenceProvider>
    </div>
  );
}
