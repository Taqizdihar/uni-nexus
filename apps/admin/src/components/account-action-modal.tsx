import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, X } from 'lucide-react';

export function AccountActionModal({
  title,
  children,
  confirmLabel,
  busy,
  reasonLabel = 'Catatan (opsional)',
  minimumReason = 0,
  showReason = true,
  confirmTone = 'danger',
  confirmDisabled = false,
  wide = false,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy: boolean;
  reasonLabel?: string;
  minimumReason?: number;
  showReason?: boolean;
  /** Visual weight of the confirm button — 'danger' (default) for destructive actions, 'primary' for affirmative ones like approval. */
  confirmTone?: 'primary' | 'danger';
  /** Extra external condition (e.g. required selects not yet filled) that also disables the confirm button. */
  confirmDisabled?: boolean;
  /** Wider body for content-heavy dialogs (e.g. an identity summary plus multiple fields). */
  wide?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const titleId = useId();
  const fieldId = useId();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="modal-backdrop account-action-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className={`modal account-action-modal${wide ? ' wide' : ''}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose();
          if (event.key === 'Tab') {
            const fields = Array.from(
              ref.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), textarea, [href]',
              ) ?? [],
            );
            const first = fields[0],
              last = fields[fields.length - 1];
            if (
              event.shiftKey &&
              (document.activeElement === first || document.activeElement === ref.current)
            ) {
              event.preventDefault();
              last?.focus();
            } else if (
              !event.shiftKey &&
              (document.activeElement === last || document.activeElement === ref.current)
            ) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <button
          className="icon-button modal-close"
          type="button"
          aria-label="Tutup"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <h2 id={titleId}>{title}</h2>
        {children}
        {showReason && (
          <div className="field">
            <label htmlFor={fieldId}>{reasonLabel}</label>
            <textarea
              id={fieldId}
              rows={3}
              maxLength={500}
              value={reason}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
            {minimumReason > 0 && (
              <span className="helper-note">Minimal {minimumReason} karakter.</span>
            )}
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="button-row">
          <button className="button secondary" type="button" disabled={busy} onClick={onClose}>
            Batal
          </button>
          <button
            className={`button ${confirmTone}`}
            type="button"
            disabled={busy || confirmDisabled || reason.trim().length < minimumReason}
            onClick={() => onConfirm(reason.trim())}
          >
            {busy && <LoaderCircle className="spin" size={16} />}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
