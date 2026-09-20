import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Envelope } from './api';
import { useAuth } from './auth';

export type OnlineUser = {
  id: string;
  full_name: string;
  username: string;
  presence_status: string;
  role: { code: string; name: string } | null;
  photo_url: string | null;
};

/** Matches the backend heartbeat cadence/TTL in apps/api/src/modules/online-presence/service.ts. */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** Sends an authenticated heartbeat for the current workspace so this user counts as online. */
export function useHeartbeat() {
  const { session, workspace } = useAuth();
  const client = useQueryClient();
  const workspaceId = workspace?.id;
  useEffect(() => {
    if (!session || !workspaceId) return;
    const send = () => {
      void api('/online-presence/heartbeat', { method: 'POST', workspace: workspaceId })
        .then(() => client.invalidateQueries({ queryKey: ['online-presence', workspaceId] }))
        .catch(() => undefined);
    };
    send();
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') send();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client, session, workspaceId]);
}

export function useOnlineUsers() {
  const { workspace } = useAuth();
  return useQuery({
    queryKey: ['online-presence', workspace?.id],
    enabled: !!workspace,
    queryFn: async () => (await api<Envelope<OnlineUser[]>>('/online-presence', { workspace: workspace!.id })).data,
    refetchInterval: HEARTBEAT_INTERVAL_MS,
  });
}
