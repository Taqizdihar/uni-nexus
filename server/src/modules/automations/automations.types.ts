export type AutomationWorkspace = 'craft' | 'studio';
export type AutomationCapability = { accessible: boolean; read: boolean; write: boolean; run: boolean; businessUnitId: number | null; label: string };
export type AutomationActor = { id: number; organization_id: number; permissions: string[] };

export const workspaceCode = (workspace: AutomationWorkspace) => workspace === 'craft' ? 'CRAFT' : 'STUDIO';
export const workspacePermission = (workspace: AutomationWorkspace, operation: 'read' | 'write' | 'run') => `${workspace}.automations.${operation}`;
