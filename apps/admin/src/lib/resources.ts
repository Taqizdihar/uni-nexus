import { useQuery } from '@tanstack/react-query';
import type { ResourceDefinition } from '@uni-nexus/shared';
import { api, type Envelope } from './api';
import { useAuth } from './auth';

export function useResources() {
  const { workspace } = useAuth();
  return useQuery({ queryKey: ['resources', workspace?.id], enabled: !!workspace, staleTime: 300_000, queryFn: async () => (await api<Envelope<ResourceDefinition[]>>('/meta', { workspace: workspace!.id })).data });
}
