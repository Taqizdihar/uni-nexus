import { useEffect, useRef, useState } from 'react';

type AnimatedBrandTextProps = {
  className?: string;
  text?: string;
  glow?: boolean;
};

export function AnimatedBrandText({ className = '', text = 'UNI-NEXUS', glow = true }: AnimatedBrandTextProps) {
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
  const animationIdRef = useRef(0);

  useEffect(() => () => {
    animationIdRef.current += 1;
  }, []);

  const animateWave = async () => {
    const animationId = ++animationIdRef.current;
    const waveDelay = 150;
    const jumpDuration = 500;
    setAnimatingIndices(new Set());

    for (let index = 0; index < text.length; index += 1) {
      if (animationId !== animationIdRef.current) return;
      setAnimatingIndices((previous) => new Set(previous).add(index));
      window.setTimeout(() => {
        if (animationId !== animationIdRef.current) return;
        setAnimatingIndices((previous) => {
          const next = new Set(previous);
          next.delete(index);
          return next;
        });
      }, jumpDuration);
      await new Promise((resolve) => window.setTimeout(resolve, waveDelay));
    }
  };

  return (
    <span className={'inline-flex items-center ' + className} onPointerEnter={() => void animateWave()}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className={'inline-block nexus-brand-font' + (glow ? ' glow-text-bright-gold' : '') + (animatingIndices.has(index) ? ' animate-wave-jump' : '')}
          style={{ whiteSpace: 'pre' }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
