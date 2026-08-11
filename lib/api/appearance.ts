import { apiRequest } from "./client";
import { isThemeId, DEFAULT_THEME, type ThemeId } from "@/lib/themes";

export interface SiteAppearance {
  theme: ThemeId;
  customBrand?: string;
  customAccent?: string;
}

/** Public — the live site-wide theme every visitor's browser should render, no auth required. */
export async function getSiteAppearance(): Promise<SiteAppearance> {
  const res = await apiRequest<{ theme: string; customBrand?: string; customAccent?: string }>("/site-appearance");
  return {
    theme: isThemeId(res.theme) ? res.theme : DEFAULT_THEME,
    customBrand: res.customBrand,
    customAccent: res.customAccent,
  };
}
