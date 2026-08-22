import React, { createContext, useContext, useState, ReactNode } from 'react';

type Workspace = 'craft' | 'studio' | 'global';

interface WorkspaceContextType {
  activeWorkspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>('craft');

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, setWorkspace: setActiveWorkspace }}>
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
