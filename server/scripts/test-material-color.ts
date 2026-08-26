import { cmykToRgb, hexToRgb, normalizeHexColor, rgbToCmyk, rgbToHex } from '../../src/lib/material-color';

function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }
assert(normalizeHexColor('#ff00aa') === '#FF00AA', 'HEX should normalize');
assert(normalizeHexColor('invalid') === '#202020', 'Invalid HEX should fall back');
assert(JSON.stringify(hexToRgb('#FF0000')) === JSON.stringify({ r: 255, g: 0, b: 0 }), 'HEX to RGB should convert');
assert(rgbToHex({ r: 255, g: 0, b: 255 }) === '#FF00FF', 'RGB to HEX should convert');
assert(JSON.stringify(rgbToCmyk({ r: 0, g: 0, b: 0 })) === JSON.stringify({ c: 0, m: 0, y: 0, k: 100 }), 'Black CMYK special case should be stable');
assert(JSON.stringify(cmykToRgb({ c: 100, m: 0, y: 0, k: 0 })) === JSON.stringify({ r: 0, g: 255, b: 255 }), 'CMYK to RGB should convert');
console.log('Material color utility tests passed.');
