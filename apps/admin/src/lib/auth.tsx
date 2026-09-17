import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Envelope } from './api';

export type Workspace = { id: string; name: string; code: string; role: string };
export type SessionUser = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  account_status?: string;
  presence_status: string;
};
export type Session = { user: SessionUser; workspaces: Workspace[]; default_workspace_id: string | null };
type AuthContextType = {
  session: Session | null | undefined;
  loading: boolean;
  error: unknown;
  workspace: Workspace | undefined;
  setWorkspace: (id: string) => void;
  refresh: () => Promise<unknown>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [chosen, setChosen] = useState(() => localStorage.getItem('uni-nexus.workspace') || '');
  const query = useQuery({ queryKey: ['session'], queryFn: async () => {
    try { return (await api<Envelope<Session>>('/auth/me')).data; }
    catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
  }, retry: false, staleTime: 60_000 });
  const workspace =
    query.data?.workspaces.find((item) => item.id === chosen) ||
    query.data?.workspaces.find((item) => item.id === query.data?.default_workspace_id) ||
    query.data?.workspaces[0];
  useEffect(() => {
    const expired = () => { client.setQueryData(['session'], null); client.removeQueries({ predicate: (item) => item.queryKey[0] !== 'session' }); };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, [client]);
  const setWorkspace = (id: string) => { setChosen(id); localStorage.setItem('uni-nexus.workspace', id); };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); client.clear(); client.setQueryData(['session'], null); };
  return <AuthContext.Provider value={{ session: query.data, loading: query.isPending, error: query.error, workspace, setWorkspace, refresh: () => query.refetch(), logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('AuthProvider is required.'); return context; }
