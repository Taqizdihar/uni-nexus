import { useEffect, useState, type ReactNode } from 'react';
import { assetUrl } from '../lib/api';

/** Hides a failed remote image while retaining useful alt text for loaded media. */
export function SafeImage({ source, alt, className, fallback, onLoad }: {
  source?: string | null; alt: string; className?: string; fallback?: ReactNode; onLoad?: () => void;
}) {
  const src = assetUrl(source);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return <>{fallback ?? null}</>;
  return <img className={className} src={src} alt={alt} onLoad={onLoad} onError={() => setFailed(true)} />;
}
