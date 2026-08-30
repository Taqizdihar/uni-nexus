import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  className?: string;
}

/** A small accessible primitive for profile and account-lifecycle workflows. */
export function Modal({ open, title, children, onClose, busy = false, className = 'max-w-lg' }: ModalProps) {
  const titleId = useId();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={() => !busy && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className={`max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${className}`} onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--nexus-charcoal)]">{title}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Tutup" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>
        {children}
      </section>
    </div>
  );
}
