import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedBrandTextProps {
  className?: string;
  text?: string;
}

export function AnimatedBrandText({ 
  className, 
  text = "UNI-NEXUS" 
}: AnimatedBrandTextProps) {
  // Array of font families for each letter: 'font-sans' (default) or 'font-["Cube"]'
  const [fonts, setFonts] = useState<string[]>(Array(text.length).fill(''));
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const waveDelay = 150; // Delay between each letter's animation
    const idleTime = 5000; // 5 seconds idle

    let isMounted = true;

    const animateWave = async (toCube: boolean) => {
      for (let i = 0; i < text.length; i++) {
        if (!isMounted) return;
        
        setAnimatingIndices((prev) => new Set(prev).add(i));
        setFonts((prev) => {
          const newFonts = [...prev];
          newFonts[i] = toCube ? 'font-["Cube"] text-[0.33em]' : '';
          return newFonts;
        });

        setTimeout(() => {
          if (!isMounted) return;
          setAnimatingIndices((prev) => {
            const newSet = new Set(prev);
            newSet.delete(i);
            return newSet;
          });
        }, 500);

        await new Promise((resolve) => setTimeout(resolve, waveDelay));
      }
    };

    const runLoop = async () => {
      while (isMounted) {
        await animateWave(true);
        if (!isMounted) break;
        
        await new Promise((resolve) => setTimeout(resolve, idleTime));
        if (!isMounted) break;
        
        await animateWave(false);
        if (!isMounted) break;
        
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };

    timeoutId = setTimeout(() => {
      if (isMounted) runLoop();
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [text]);

  return (
    <span className={cn("inline-flex items-center", className)}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className={cn(
            "inline-block",
            fonts[index] === '' ? "font-['Technique'] glow-text-bright-gold" : fonts[index],
            animatingIndices.has(index) ? "animate-wave-jump" : ""
          )}
          style={{ whiteSpace: 'pre' }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
