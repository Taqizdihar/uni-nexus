import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/ui';
import { Shell } from './components/shell';
import { AuthPage } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import { Notifications } from './pages/notifications';
import { Settings } from './pages/settings';
import { ResourcePage } from './pages/resources';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/signup" element={<AuthPage mode="signup" />} />
              <Route path="/setup" element={<AuthPage mode="setup" />} />
              <Route path="/app" element={<Shell />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
                <Route path=":resource" element={<ResourcePage mode="list" />} />
                <Route path=":resource/new" element={<ResourcePage mode="new" />} />
                <Route path=":resource/:id" element={<ResourcePage mode="detail" />} />
                <Route path=":resource/:id/edit" element={<ResourcePage mode="edit" />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
