import React from 'react';
import { normalizeHexColor, shiftHexColor } from '../../../../lib/material-color';

export function FilamentSpoolIllustration({ colorHex, size = 'md' }: { colorHex?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const color = normalizeHexColor(colorHex, '#9CA3AF');
  const style = {
    '--filament-color': color,
    '--filament-light': shiftHexColor(color, 38),
    '--filament-dark': shiftHexColor(color, -46),
  } as React.CSSProperties;
  return <div className={`filament-spool filament-spool--${size}`} style={style} aria-hidden="true">
    <div className="filament-spool__flange filament-spool__flange--back" />
    <div className="filament-spool__coil"><i /><i /><i /><i /><i /></div>
    <div className="filament-spool__hub"><span /></div>
    <div className="filament-spool__flange filament-spool__flange--front" />
    <div className="filament-spool__shine" />
  </div>;
}
