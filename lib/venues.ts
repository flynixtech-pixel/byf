/* ------------------------------------------------------------------ */
/*  VENUES — view-model shared by the homepage's Trending Venues       */
/*  section (desktop + mobile).                                        */
/*                                                                     */
/*  `rating` and `distanceKm` have no backing system yet (no reviews    */
/*  engine, no geolocation) — they're neutral placeholders, not real    */
/*  per-venue data, until Reviews (System 7) and Maps (System 2) exist. */
/* ------------------------------------------------------------------ */

import type { Listing } from "./api/types";
import { categoryLabel } from "./taxonomy";

export type Venue = {
  id: string;
  /** Preferred over `id` for building /venues URLs — falls back to `id` when unset. */
  slug?: string;
  name: string;
  area: string;
  distanceKm: number;
  rating: number;
  pricePerHour: number;
  strikePrice?: number;
  status: "Available" | "Filling Fast" | "Full";
  sport: string;
  image: string;
};

export function listingToVenue(listing: Listing): Venue {
  return {
    id: listing._id,
    slug: listing.slug,
    name: listing.title,
    area: listing.city,
    distanceKm: 0,
    rating: listing.rating || 0,
    pricePerHour: listing.price,
    strikePrice: listing.strikePrice,
    status: "Available",
    sport: listing.categories.map(categoryLabel).join(", ") || "General",
    image: listing.coverImage ?? "",
  };
}
