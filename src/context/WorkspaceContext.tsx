import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type Workspace = 'craft' | 'studio' | 'global';

interface WorkspaceContextType {
  activeWorkspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const isKnownWorkspace = (value: unknown): value is 'craft' | 'studio' => value === 'craft' || value === 'studio';

/** Resolves the workspace a freshly-authenticated user should land in: their configured
 * default if they can access it, otherwise the first workspace they can access at all. */
function resolveDefaultWorkspace(user: { default_workspace_code: string; workspaces?: string[] } | null): 'craft' | 'studio' {
  if (!user) return 'craft';
  const accessible = user.workspaces || [];
  const preferred = isKnownWorkspace(user.default_workspace_code) ? user.default_workspace_code : null;
  if (preferred && accessible.includes(preferred)) return preferred;
  const firstAccessible = accessible.find(isKnownWorkspace) as 'craft' | 'studio' | undefined;
  return firstAccessible || preferred || 'craft';
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Derived synchronously from `user` on every render so the correct workspace is
  // available on the very first paint after login/reload — no post-mount correction,
  // no flash of the wrong workspace.
  const defaultWorkspace = useMemo(() => resolveDefaultWorkspace(user), [user]);

  const [manualOverride, setManualOverride] = useState<Workspace | null>(null);
  const lastUserId = useRef<number | null>(user?.id ?? null);

  useEffect(() => {
    // A new login (different user id) should not inherit the previous user's manual switch.
    if (user?.id !== lastUserId.current) {
      lastUserId.current = user?.id ?? null;
      setManualOverride(null);
    }
  }, [user?.id]);

  const activeWorkspace = manualOverride ?? defaultWorkspace;

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, setWorkspace: setManualOverride }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
