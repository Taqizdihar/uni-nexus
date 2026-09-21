import { useEffect, useMemo, useState } from 'react';
import { handlePetImageError, resolvePetImage, type PetImageData } from '../lib/pets';
import { assetUrl } from '../lib/api';

/** Ordered IDLE playback is intentionally timer-light and stops for hidden/reduced-motion views. */
export function PetImage({ pet, alt, className }: { pet: PetImageData; alt: string; className?: string }) {
  const frames = useMemo(() => (pet.media?.IDLE ?? []).map((frame) => assetUrl(frame.url)).filter((url): url is string => Boolean(url)), [pet.media]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (frames.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (document.hidden) return;
      const duration = pet.media?.IDLE?.[index]?.duration_ms ?? 900;
      timer = setTimeout(() => setIndex((value) => (value + 1) % frames.length), duration);
    };
    const visibility = () => { if (!document.hidden) schedule(); else if (timer) clearTimeout(timer); };
    schedule(); document.addEventListener('visibilitychange', visibility);
    return () => { if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [frames.length, index, pet.media]);
  const source = frames[index] ?? resolvePetImage(pet);
  return source ? <img key={source} className={className} src={source} alt={alt} onError={(event) => handlePetImageError(event, pet)} /> : null;
}
