import React, { useEffect, useMemo, useState } from 'react';
import { cmykToRgb, hexToRgb, normalizeHexColor, rgbToCmyk, rgbToHex } from '../../../../lib/material-color';

type Mode = 'picker' | 'hex' | 'rgb' | 'cmyk';
const numberValue = (value: string, max: number) => Math.min(max, Math.max(0, Number.parseInt(value || '0', 10) || 0));

export function MaterialColorEditor({ hex, colorName, onChange, onColorNameChange }: {
  hex: string; colorName: string; onChange: (hex: string) => void; onColorNameChange: (name: string) => void;
}) {
  const [mode, setMode] = useState<Mode>('picker'); const normalized = normalizeHexColor(hex, '#9CA3AF');
  const [hexInput, setHexInput] = useState(normalized); useEffect(() => setHexInput(normalized), [normalized]);
  const rgb = useMemo(() => hexToRgb(normalized), [normalized]); const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);
  const updateRgb = (partial: Partial<typeof rgb>) => onChange(rgbToHex({ ...rgb, ...partial }));
  const updateCmyk = (partial: Partial<typeof cmyk>) => onChange(rgbToHex(cmykToRgb({ ...cmyk, ...partial })));
  return <section className="rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/55 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label className="material-field flex-1"><span>Nama Warna</span><input value={colorName} onChange={(event) => onColorNameChange(event.target.value)} placeholder="Contoh: Matte Black" /></label><div className="flex items-center gap-2"><span className="h-9 w-9 rounded-full border-2 border-white shadow ring-1 ring-black/15" style={{ backgroundColor: normalized }} /><code className="text-xs font-bold text-[var(--nexus-charcoal)]">{normalized}</code></div></div>
    <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-[var(--nexus-border)] bg-white p-1">{([['picker', 'Color Picker'], ['hex', 'HEX'], ['rgb', 'RGB'], ['cmyk', 'CMYK']] as Array<[Mode, string]>).map(([key, label]) => <button type="button" key={key} onClick={() => setMode(key)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === key ? 'bg-[var(--nexus-charcoal)] text-white' : 'text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]'}`}>{label}</button>)}</div>
    <div className="mt-4">{mode === 'picker' && <div className="flex items-center gap-3"><input aria-label="Pilih warna material" type="color" value={normalized} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-12 w-20 cursor-pointer rounded border border-[var(--nexus-border)] bg-white p-1" /><p className="text-xs leading-5 text-[var(--nexus-muted)]">Preview browser menggunakan sRGB. CMYK di bawah ini merupakan perkiraan layar, bukan output cetak yang dikelola warna.</p></div>}{mode === 'hex' && <label className="material-field"><span>HEX</span><input value={hexInput} onChange={(event) => { setHexInput(event.target.value.toUpperCase()); if (/^#[0-9A-F]{6}$/.test(event.target.value.toUpperCase())) onChange(event.target.value.toUpperCase()); }} onBlur={() => setHexInput(normalized)} maxLength={7} placeholder="#FFD232" /></label>}{mode === 'rgb' && <div className="grid grid-cols-3 gap-3">{(['r', 'g', 'b'] as const).map((channel) => <label key={channel} className="material-field"><span>{channel.toUpperCase()} (0–255)</span><input type="number" min="0" max="255" value={rgb[channel]} onChange={(event) => updateRgb({ [channel]: numberValue(event.target.value, 255) })} /></label>)}</div>}{mode === 'cmyk' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(['c', 'm', 'y', 'k'] as const).map((channel) => <label key={channel} className="material-field"><span>{channel.toUpperCase()} (0–100)</span><input type="number" min="0" max="100" value={cmyk[channel]} onChange={(event) => updateCmyk({ [channel]: numberValue(event.target.value, 100) })} /></label>)}</div>}</div>
  </section>;
}
