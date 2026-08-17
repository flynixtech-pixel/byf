import { useMemo, useState } from "react";
import { type Venue } from "@/lib/venues";
import { SPORT_CATEGORIES } from "@/lib/taxonomy";

export const PRICE_OPTIONS = [
  { label: "Under ₹300", value: 300 },
  { label: "Under ₹600", value: 600 },
  { label: "Under ₹1000", value: 1000 },
] as const;

export const DISTANCE_OPTIONS = [
  { label: "< 2 km", value: 2 },
  { label: "< 5 km", value: 5 },
  { label: "< 10 km", value: 10 },
] as const;

export const SORT_OPTIONS = [
  { label: "Recommended", value: "recommended" },
  { label: "Top Rated", value: "rating" },
  { label: "Price: Low to High", value: "price" },
  { label: "Nearest", value: "distance" },
] as const;

export type SortBy = (typeof SORT_OPTIONS)[number]["value"];

/** A venue can offer several sports, stored for display as a comma-separated label. */
function sportsForVenue(sport: string): string[] {
  return sport
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function filterPillClass(active: boolean): string {
  return `rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
    active ? "border-brand-300 bg-brand-50 text-brand-600" : "border-slate-200 text-slate-600"
  }`;
}

/** Shared sport/price/distance/sort filtering used by both the mobile bottom-sheet and desktop filters modal. */
export function useVenueFilters(venues: Venue[], searchValue: string, initialCategory?: string) {
  const [selectedSports, setSelectedSports] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (initialCategory) {
      // Find the label for the id
      const cat = SPORT_CATEGORIES.find(c => c.id === initialCategory);
      if (cat) s.add(cat.label);
      else s.add(initialCategory); // fallback
    }
    return s;
  });
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("recommended");

  // Only expose sports that are currently offered by the loaded venues.
  const sportOptions = useMemo(() => {
    const venueSports = venues
      .flatMap((venue) => sportsForVenue(venue.sport))
      .filter((sport) => sport !== "Indoor Games" && sport.length > 0);
    return Array.from(new Set(venueSports)).sort();
  }, [venues]);

  const toggleSport = (sport: string) =>
    setSelectedSports((prev) => {
      const next = new Set(prev);
      if (next.has(sport)) {
        next.delete(sport);
      } else {
        next.add(sport);
      }
      return next;
    });

  const clearSports = () => setSelectedSports(new Set());

  const resetFilters = () => {
    setSelectedSports(new Set());
    setMaxPrice(null);
    setMaxDistance(null);
    setSortBy("recommended");
  };

  const activeFilterCount =
    selectedSports.size +
    (maxPrice !== null ? 1 : 0) +
    (maxDistance !== null ? 1 : 0) +
    (sortBy !== "recommended" ? 1 : 0);

  const filteredVenues = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const list = venues.filter((v) => {
      const matchesSearch =
        !query ||
        v.name.toLowerCase().includes(query) ||
        v.sport.toLowerCase().includes(query) ||
        v.area.toLowerCase().includes(query);
      const matchesSport =
        selectedSports.size === 0 || sportsForVenue(v.sport).some((sport) => selectedSports.has(sport));
      const matchesPrice = maxPrice === null || v.pricePerHour <= maxPrice;
      const matchesDistance = maxDistance === null || v.distanceKm <= maxDistance;
      return matchesSearch && matchesSport && matchesPrice && matchesDistance;
    });

    const sorted = [...list];
    if (sortBy === "rating") sorted.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "price") sorted.sort((a, b) => a.pricePerHour - b.pricePerHour);
    else if (sortBy === "distance") sorted.sort((a, b) => a.distanceKm - b.distanceKm);
    return sorted;
  }, [venues, searchValue, selectedSports, maxPrice, maxDistance, sortBy]);

  return {
    sportOptions,
    selectedSports,
    toggleSport,
    clearSports,
    maxPrice,
    setMaxPrice,
    maxDistance,
    setMaxDistance,
    sortBy,
    setSortBy,
    resetFilters,
    activeFilterCount,
    filteredVenues,
  };
}
