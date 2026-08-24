const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any) {
    super(message);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      // Auto logout on unauthorized (token expired/invalid) - skip for login to allow normal error handling
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    throw new ApiError(
      response.status,
      data?.error?.code || 'UNKNOWN_ERROR',
      data?.error?.message || 'Terjadi kesalahan pada server.',
      data?.error?.details
    );
  }

  return data.data;
}

async function requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.error?.code || 'DOWNLOAD_ERROR', data?.error?.message || 'Gagal mengunduh dokumen.');
  }
  return response.blob();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  put: <T>(endpoint: string, body: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  patch: <T>(endpoint: string, body: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'DELETE' }),
  getBlob: (endpoint: string, options?: RequestInit) => requestBlob(endpoint, { ...options, method: 'GET' }),
};
