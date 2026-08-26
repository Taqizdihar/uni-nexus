export interface RgbColor { r: number; g: number; b: number; }
export interface CmykColor { c: number; m: number; y: number; k: number; }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const channel = (value: number) => Math.round(clamp(value, 0, 255));
const percent = (value: number) => Math.round(clamp(value, 0, 100));

export function normalizeHexColor(value: string | null | undefined, fallback = '#202020') {
  const normalized = (value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : fallback.toUpperCase();
}
export function hexToRgb(value: string): RgbColor {
  const hex = normalizeHexColor(value).slice(1); return { r: Number.parseInt(hex.slice(0, 2), 16), g: Number.parseInt(hex.slice(2, 4), 16), b: Number.parseInt(hex.slice(4, 6), 16) };
}
export function rgbToHex({ r, g, b }: RgbColor) { return `#${[channel(r), channel(g), channel(b)].map((part) => part.toString(16).padStart(2, '0')).join('').toUpperCase()}`; }
export function rgbToCmyk({ r, g, b }: RgbColor): CmykColor {
  const red = channel(r) / 255; const green = channel(g) / 255; const blue = channel(b) / 255; const k = 1 - Math.max(red, green, blue);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: percent(((1 - red - k) / (1 - k)) * 100), m: percent(((1 - green - k) / (1 - k)) * 100), y: percent(((1 - blue - k) / (1 - k)) * 100), k: percent(k * 100) };
}
export function cmykToRgb({ c, m, y, k }: CmykColor): RgbColor {
  const cyan = clamp(c, 0, 100) / 100; const magenta = clamp(m, 0, 100) / 100; const yellow = clamp(y, 0, 100) / 100; const black = clamp(k, 0, 100) / 100;
  return { r: channel(255 * (1 - cyan) * (1 - black)), g: channel(255 * (1 - magenta) * (1 - black)), b: channel(255 * (1 - yellow) * (1 - black)) };
}
export function shiftHexColor(value: string, amount: number) {
  const rgb = hexToRgb(value); return rgbToHex({ r: rgb.r + amount, g: rgb.g + amount, b: rgb.b + amount });
}
