import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedBrandTextProps {
  className?: string;
  text?: string;
  glow?: boolean;
}

export function AnimatedBrandText({ 
  className, 
  text = "UNI-NEXUS",
  glow = true,
}: AnimatedBrandTextProps) {
  const [fonts, setFonts] = useState<string[]>(() => Array(text.length).fill('Technique'));
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
  const animationIdRef = useRef(0);

  useEffect(() => {
    return () => {
      // Invalidate any in-progress wave when the component is unmounted.
      animationIdRef.current += 1;
    };
  }, []);

  const animateWave = async (toCube: boolean) => {
    const animationId = ++animationIdRef.current;
    const waveDelay = 150;
    const jumpDuration = 500;

    setAnimatingIndices(new Set());

    for (let i = 0; i < text.length; i++) {
      if (animationId !== animationIdRef.current) return;

      setAnimatingIndices((prev) => new Set(prev).add(i));
      setFonts((prev) => {
        const newFonts = [...prev];
        newFonts[i] = toCube ? 'Cube' : 'Technique';
        return newFonts;
      });

      window.setTimeout(() => {
        if (animationId !== animationIdRef.current) return;
        setAnimatingIndices((prev) => {
          const newSet = new Set(prev);
          newSet.delete(i);
          return newSet;
        });
      }, jumpDuration);

      await new Promise((resolve) => window.setTimeout(resolve, waveDelay));
    }
  };

  return (
    <span
      className={cn("inline-flex items-center", className)}
      onPointerEnter={() => void animateWave(true)}
      onPointerLeave={() => void animateWave(false)}
    >
      {text.split('').map((char, index) => (
        <span
          key={index}
          className={cn(
            "inline-block",
            fonts[index] === 'Cube' ? "font-['Cube'] text-[0.33em]" : cn("font-['Technique']", glow && "glow-text-bright-gold"),
            animatingIndices.has(index) ? "animate-wave-jump" : ""
          )}
          style={{
            fontFamily: fonts[index] === 'Cube' ? 'Cube' : 'Technique',
            whiteSpace: 'pre',
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
