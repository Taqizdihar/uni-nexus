export type Row = Record<string, unknown> & { id: string };
export type Envelope<T> = { data: T };
export type Page<T = Row> = Envelope<T[]> & {
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

const origin = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const base = `${origin}/api/v1`;

/** Backend asset paths already include the /api/v1 prefix, so only the origin is prepended. */
export function assetUrl(path: string | null | undefined): string | undefined {
  return path ? `${origin}${path}` : undefined;
}

export async function api<T>(path: string, options: RequestInit & { workspace?: string } = {}): Promise<T> {
  const { workspace, ...init } = options;
  const headers = new Headers(init.headers);
  if (workspace) headers.set('X-Workspace-Id', workspace);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers });
  const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/') && !path.startsWith('/setup')) {
      window.dispatchEvent(new Event('session-expired'));
    }
    throw new ApiError(response.status, payload?.error?.code || 'REQUEST_FAILED', payload?.error?.message || 'Tidak dapat menyelesaikan permintaan ini. Silakan coba lagi.', payload?.error?.details);
  }
  return payload as T;
}

export function body(value: unknown) { return JSON.stringify(value); }

export async function download(resource: string, record: Row, workspace: string) {
  const response = await fetch(`${base}/files/${resource}/${record.id}`, { credentials: 'include', headers: { 'X-Workspace-Id': workspace } });
  if (!response.ok) {
    const result = await response.json().catch(() => undefined);
    throw new Error(result?.error?.message || 'Tidak dapat mengunduh berkas ini.');
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = String(record.original_filename || record.file_name || record.name || 'download');
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function message(error: unknown) { return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'; }
