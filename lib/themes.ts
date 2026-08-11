export type ThemeId =
  | "vibe-orange"
  | "turf-emerald"
  | "midnight-stadium"
  | "sunset-court"
  | "ocean-court"
  | "royal-purple"
  | "fire-red"
  | "gold-luxury"
  | "custom";

/** Not a preset — picked live by the admin as a one-off brand/accent hex pair. */
export const CUSTOM_THEME_ID: ThemeId = "custom";

export interface ThemePreset {
  id: ThemeId;
  name: string;
  tagline: string;
  /** Representative 500-shade hex, used for swatches/previews. */
  brand: string;
  accent: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "vibe-orange", name: "Vibe Orange", tagline: "Energetic & warm — the original BYV look", brand: "#f97316", accent: "#f43f5e" },
  { id: "turf-emerald", name: "Turf Emerald", tagline: "Deep pitch green with a gold accent", brand: "#10b981", accent: "#f59e0b" },
  { id: "midnight-stadium", name: "Midnight Stadium", tagline: "Floodlit night-match blue on indigo", brand: "#0ea5e9", accent: "#6366f1" },
  { id: "sunset-court", name: "Sunset Court", tagline: "Coral pink meeting royal violet", brand: "#ec4899", accent: "#8b5cf6" },
  { id: "ocean-court", name: "Ocean Court", tagline: "Coastal teal with a warm sand accent", brand: "#14b8a6", accent: "#f59e0b" },
  { id: "royal-purple", name: "Royal Purple", tagline: "Regal violet with a gold accent", brand: "#8b5cf6", accent: "#f59e0b" },
  { id: "fire-red", name: "Fire Red", tagline: "Bold crimson with an ember-orange accent", brand: "#ef4444", accent: "#f97316" },
  { id: "gold-luxury", name: "Gold Luxury", tagline: "Champagne gold on charcoal — premium feel", brand: "#cf9d2f", accent: "#52525b" },
];

export const DEFAULT_THEME: ThemeId = "vibe-orange";

export function isThemeId(value: string | null): value is ThemeId {
  return !!value && (value === CUSTOM_THEME_ID || THEME_PRESETS.some((t) => t.id === value));
}
