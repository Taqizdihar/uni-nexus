import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/ui';
import { Shell } from './components/shell';
import { AuthPage } from './pages/auth';
import { AccountStatusPage } from './pages/account-status';
import { Landing } from './pages/landing';
import { Dashboard } from './pages/dashboard';
import { Notifications } from './pages/notifications';
import { Settings } from './pages/settings';
import { Profile } from './pages/profile';
import { Team } from './pages/team';
import { UserManagement } from './pages/user-management';
import { ResourcePage } from './pages/resources';
import { ProductionWorkflowWorkspace, SalesWorkflowDetail, SalesWorkflowWorkspace } from './pages/workflows';
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
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/signup" element={<AuthPage mode="signup" />} />
              <Route path="/account-status" element={<AccountStatusPage />} />
              <Route path="/app" element={<Shell />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="pesanan" element={<SalesWorkflowWorkspace />} />
                <Route path="pesanan/:workflowKey" element={<SalesWorkflowDetail />} />
                <Route path="produksi" element={<ProductionWorkflowWorkspace />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
                <Route path="team" element={<Team />} />
                <Route path="team/:userId" element={<Team />} />
                <Route path="user-management" element={<UserManagement />} />
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
