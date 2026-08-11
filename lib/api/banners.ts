import { apiRequest } from "./client";
import type { AdBanner } from "./types";

export function getActiveBanners() {
  return apiRequest<AdBanner[]>("/banners");
}
