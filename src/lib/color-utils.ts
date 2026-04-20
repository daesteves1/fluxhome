// hex → sRGB [0-1]
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return [
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255,
  ].map((v) => v / 255) as [number, number, number];
}

// WCAG 2.1 relative luminance
function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map((v) => {
    if (v <= 0.03928) return v / 12.92;
    return Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// contrast ratio against white (luminance 1.0)
function contrastOnWhite(hex: string): number {
  const L = luminance(hex);
  return 1.05 / (L + 0.05);
}

// hex → HSL
function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// HSL → hex
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  function f(n: number): string {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  }
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Darkens hex until it achieves WCAG AA (4.5:1) contrast on white.
 * Use for text and button backgrounds where white text must be legible.
 */
export function safeAccentColor(hex: string): string {
  if (!hex?.startsWith('#')) return '#0f172a';
  try {
    let [h, s, l] = hexToHsl(hex);
    let attempts = 0;
    while (contrastOnWhite(hslToHex(h, s, l)) < 4.5 && attempts < 20) {
      l = Math.max(0, l - 5);
      attempts++;
    }
    return hslToHex(h, s, l);
  } catch {
    return '#0f172a';
  }
}

/** Raw accent — use for decorative fills, borders, progress bar. */
export function rawAccentColor(hex: string): string {
  return hex?.startsWith('#') ? hex : '#0f172a';
}
