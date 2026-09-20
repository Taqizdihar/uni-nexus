import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertCircle, Check, Inbox, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { message } from '../lib/api';
import { statusLabel } from '../lib/format';

export function Spinner({ label = 'Memuat data workspace…' }: { label?: string }) {
  return <div className="loading-state" role="status"><LoaderCircle size={22} className="spin" /><span>{label}</span></div>;
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="error-state" role="alert"><AlertCircle size={22} /><div><strong>Kami tidak dapat memuat informasi ini</strong><p>{message(error)}</p>{retry && <button className="button secondary small" onClick={retry}><RotateCcw size={14} />Coba lagi</button>}</div></div>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Inbox size={28} strokeWidth={1.5} /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Badge({ value }: { value: unknown }) {
  const text = String(value ?? '');
  const tone = /ACTIVE|ACCEPTED|APPROVED|COMPLETED|SUCCESS|PASS|PAID|IDLE|AVAILABLE|FEASIBLE|PUBLISHED/.test(text) && !/INACTIVE|NOT_/.test(text) ? 'green' : /FAILED|ERROR|CANCELLED|REJECTED|DECLINED|NOT_FEASIBLE/.test(text) ? 'red' : /PENDING|REVIEW|QUEUED|DRAFT|NEW|ESTIMATING|MAINTENANCE/.test(text) ? 'amber' : 'blue';
  return <span className={`badge ${tone}`}><span className="badge-dot" />{statusLabel(text)}</span>;
}
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>;
}
type Toast = { id: number; text: string; error?: boolean };
const ToastContext = createContext<(text: string, error?: boolean) => void>(() => undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, text, error }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 6000);
  }, []);
  return <ToastContext.Provider value={notify}>{children}<div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className={`toast ${toast.error ? 'toast-error' : ''}`} key={toast.id}>{toast.error ? <AlertCircle size={18} /> : <Check size={18} />}<span>{toast.text}</span><button aria-label="Tutup notifikasi" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><X size={15} /></button></div>)}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
