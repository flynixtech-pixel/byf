/** Generates a Tailwind-style 50–950 shade scale from a single hex color, so a custom theme only needs one brand hex + one accent hex. */

export type ShadeStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export type ColorShades = Record<ShadeStep, string>;

const SHADE_STEPS: ShadeStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Target lightness (%) per step; 500 is `null` — it always keeps the exact hex the admin picked. */
const SHADE_LIGHTNESS: Record<ShadeStep, number | null> = {
  50: 97,
  100: 94,
  200: 87,
  300: 76,
  400: 63,
  500: null,
  600: 43,
  700: 35,
  800: 28,
  900: 22,
  950: 13,
};

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const int = parseInt(clean, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Derives the full 50–950 scale from one hex, keeping the picked color's hue & saturation and only varying lightness. */
export function generateShades(baseHex: string): ColorShades {
  const [r, g, b] = hexToRgb(baseHex);
  const [h, s] = rgbToHsl(r, g, b);

  const shades = {} as ColorShades;
  for (const step of SHADE_STEPS) {
    const targetLightness = SHADE_LIGHTNESS[step];
    if (targetLightness === null) {
      shades[step] = baseHex.toLowerCase();
    } else {
      shades[step] = rgbToHex(...hslToRgb(h, s, targetLightness));
    }
  }
  return shades;
}
