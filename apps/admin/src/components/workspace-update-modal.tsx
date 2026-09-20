import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import studioArtwork from '../assets/branding/logos/uni-inside-studio/Uni-Inside Complex.avif';

export function WorkspaceUpdateModal({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const isClosingRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(onClose, 260);
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [requestClose]);

  return createPortal(
    <div
      className={`modal-backdrop workspace-update-backdrop${isClosing ? ' is-closing' : ''}`}
      onClick={requestClose}
    >
      <section
        className={`workspace-update-modal${isClosing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-update-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="workspace-update-close"
          type="button"
          aria-label="Tutup"
          onClick={requestClose}
        >
          <X size={38} strokeWidth={2.5} />
        </button>
        <img className="workspace-update-artwork" src={studioArtwork} alt="Uni-Inside Studio" />
        <p className="workspace-update-eyebrow">In Update</p>
        <h2 id="workspace-update-title">Workspace: STUDIO</h2>
        <p className="workspace-update-copy">
          Nexus adalah koneksi dan berhubungan dengan adanya penyediaan CDN sebagai object storage
          yang lebih besar. Maka diadakan update untuk workspace Studio dalam UNI-NEXUS. Harap
          ditunggu paralel dengan desain 3D, ya.
        </p>
      </section>
    </div>,
    document.body,
  );
}
