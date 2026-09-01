import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, AlertCircle, Trash2, X, LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'warning' | 'danger';
  icon?: LucideIcon;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

type ConfirmationRequest = Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'cancelLabel' | 'variant' | 'icon'>;

/** Opens the shared React confirmation dialog for legacy event handlers that cannot render local JSX state. */
export function requestConfirmation(request: ConfirmationRequest): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const finish = (confirmed: boolean) => {
      root.unmount();
      container.remove();
      resolve(confirmed);
    };
    root.render(<ConfirmDialog {...request} open onCancel={() => finish(false)} onConfirm={() => finish(true)} />);
  });
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'default',
  icon: Icon,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  
  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          confirmBtnVariant: 'primary' as const,
          DefaultIcon: Trash2,
        };
      case 'warning':
        return {
          iconColor: 'text-orange-600',
          iconBg: 'bg-orange-100',
          confirmBtnVariant: 'primary' as const,
          DefaultIcon: AlertTriangle,
        };
      default:
        return {
          iconColor: 'text-[var(--nexus-yellow-deep)]',
          iconBg: 'bg-[var(--nexus-yellow)]/20',
          confirmBtnVariant: 'primary' as const,
          DefaultIcon: AlertCircle,
        };
    }
  };

  const styles = getVariantStyles();
  const DisplayIcon = Icon || styles.DefaultIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-start p-6 pb-0">
          <div className="flex gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}>
              <DisplayIcon className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-semibold text-gray-900 mt-1.5">
                {title}
              </h3>
            </div>
          </div>
          <button 
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-md hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-6 py-4 pl-[4.5rem]">
          <div className="text-sm text-gray-500">
            {description}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button 
            variant={styles.confirmBtnVariant}
            onClick={onConfirm}
            disabled={isLoading}
            className={variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}
          >
            {isLoading ? 'Memproses...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
