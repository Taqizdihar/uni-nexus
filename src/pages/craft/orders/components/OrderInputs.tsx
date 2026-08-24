import React, { useEffect, useState } from 'react';
import { Minus, Plus, Search } from 'lucide-react';
import { cn } from '../../../../lib/utils';

type EditableNumeric = number | '';

export function OrdersSearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return <span className={cn('relative block', className)}><Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--nexus-muted)]" aria-hidden="true" /><input type="search" className="orders-input orders-input-leading" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></span>;
}

export function OrdersCurrencyInput({ value, onChange, className, placeholder = '0', min = 0 }: { value: EditableNumeric; onChange: (value: EditableNumeric) => void; className?: string; placeholder?: string; min?: number }) {
  const [display, setDisplay] = useState(value === '' ? '' : String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDisplay(value === '' ? '' : formatInteger(Number(value))); }, [value, focused]);
  const handleChange = (raw: string) => { const digits = raw.replace(/[^0-9]/g, ''); if (!digits) { setDisplay(''); onChange(''); return; } const next = Math.max(min, Number(digits)); setDisplay(String(next)); onChange(next); };
  return <span className={cn('relative block', className)}><span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-xs font-semibold text-[var(--nexus-muted)]">Rp</span><input type="text" inputMode="numeric" className="orders-input orders-input-leading" value={display} placeholder={placeholder} onFocus={() => { setFocused(true); setDisplay(value === '' ? '' : String(value)); }} onChange={event => handleChange(event.target.value)} onBlur={() => { setFocused(false); if (display) setDisplay(formatInteger(Number(display))); }} /></span>;
}

export function OrdersIntegerInput({ value, onChange, className, min = 1, placeholder = '1', stepper = true }: { value: EditableNumeric; onChange: (value: EditableNumeric) => void; className?: string; min?: number; placeholder?: string; stepper?: boolean }) {
  const [display, setDisplay] = useState(value === '' ? '' : String(Math.trunc(Number(value))));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDisplay(value === '' ? '' : String(Math.trunc(Number(value)))); }, [value, focused]);
  const setNext = (next: number | '') => { if (next === '') { setDisplay(''); onChange(''); return; } const normalized = Math.max(min, Math.trunc(next)); setDisplay(String(normalized)); onChange(normalized); };
  return <span className={cn('relative flex', className)}>{stepper && <button type="button" className="orders-stepper-button rounded-l-lg border border-r-0 border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]" onClick={() => setNext(Number(value || min) - 1)} aria-label="Kurangi jumlah"><Minus className="h-3.5 w-3.5" /></button>}<input type="text" inputMode="numeric" className={cn('orders-input text-center', stepper && 'rounded-none')} value={display} placeholder={placeholder} onFocus={() => { setFocused(true); setDisplay(value === '' ? '' : String(value)); }} onChange={event => { const raw = event.target.value; if (raw === '') { setNext(''); return; } if (!/^\d+$/.test(raw)) { const parsed = Number(raw); setDisplay(raw); onChange(Number.isFinite(parsed) ? parsed : ''); return; } setNext(Number(raw)); }} onBlur={() => { setFocused(false); if (display === '') setNext(min); else setNext(Number(display)); }} />{stepper && <button type="button" className="orders-stepper-button rounded-r-lg border border-l-0 border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]" onClick={() => setNext(Number(value || min) + 1)} aria-label="Tambah jumlah"><Plus className="h-3.5 w-3.5" /></button>}</span>;
}

export function OrdersUnitInput({ value, onChange, unit, integer = false, min = 0, className, placeholder = '0' }: { value: EditableNumeric; onChange: (value: EditableNumeric) => void; unit: string; integer?: boolean; min?: number; className?: string; placeholder?: string }) {
  const [display, setDisplay] = useState(value === '' ? '' : String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDisplay(value === '' ? '' : String(value)); }, [value, focused]);
  const handleChange = (raw: string) => { const cleaned = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); if (!cleaned) { setDisplay(''); onChange(''); return; } const parsed = integer ? Math.trunc(Number(cleaned)) : Number(cleaned); setDisplay(integer ? String(parsed) : cleaned); onChange(Number.isFinite(parsed) ? Math.max(min, parsed) : ''); };
  return <span className={cn('relative block', className)}><input type="text" inputMode={integer ? 'numeric' : 'decimal'} className="orders-input orders-input-trailing" value={display} placeholder={placeholder} onFocus={() => { setFocused(true); setDisplay(value === '' ? '' : String(value)); }} onChange={event => handleChange(event.target.value)} onBlur={() => { setFocused(false); if (display) { const next = integer ? Math.max(min, Math.trunc(Number(display))) : Math.max(min, Number(display)); setDisplay(String(next)); onChange(next); } }} /><span className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-xs font-semibold text-[var(--nexus-muted)]">{unit}</span></span>;
}

export function OrdersDateTimeInput({ value, onChange, type = 'datetime-local', className, disabled = false }: { value: string; onChange: (value: string) => void; type?: 'date' | 'datetime-local'; className?: string; disabled?: boolean }) {
  return <input type={type} className={cn('orders-input', className)} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} />;
}

function formatInteger(value: number) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value); }
