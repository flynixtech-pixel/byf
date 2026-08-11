/* ------------------------------------------------------------------ */
/*  SHARED SPORTS/ACTIVITY TAXONOMY                                    */
/*  Used by the vendor listing form (category/sub-category multi-      */
/*  select) and by customer browse/filter pages (/games, /venues).     */
/* ------------------------------------------------------------------ */

export interface SubCategoryOption {
  id: string;
  label: string;
}

export type VenueSetting = "indoor" | "outdoor" | "both";

export interface SportCategory {
  id: string;
  label: string;
  image?: string;
  venue: VenueSetting;
  subCategories: SubCategoryOption[];
  isCustom?: boolean;
  customId?: string;
}

export const SPORT_CATEGORIES: SportCategory[] = [
  {
    id: "cricket",
    label: "Cricket",
    image: "/bat.png",
    venue: "both",
    subCategories: [
      { id: "box-cricket", label: "Box Cricket" },
      { id: "cricket-nets", label: "Cricket Nets / Practice" },
      { id: "turf-cricket", label: "Full Turf Cricket" },
    ],
  },
  {
    id: "football",
    label: "Football",
    image: "/football.png",
    venue: "both",
    subCategories: [
      { id: "football-5s", label: "5-a-side Turf" },
      { id: "football-7s", label: "7-a-side Turf" },
      { id: "football-full", label: "Full Ground" },
    ],
  },
  {
    id: "badminton",
    label: "Badminton",
    image: "/badminton.png",
    venue: "indoor",
    subCategories: [
      { id: "badminton-single", label: "Single Court" },
      { id: "badminton-multi", label: "Multi Court" },
      { id: "badminton-coaching", label: "Coaching" },
    ],
  },
  {
    id: "pickleball",
    label: "Pickleball",
    image: "/pickball.png",
    venue: "both",
    subCategories: [{ id: "pickleball-standard", label: "Standard Court" }],
  },
  {
    id: "tennis",
    label: "Tennis",
    image: "/tennis.png",
    venue: "both",
    subCategories: [
      { id: "tennis-singles", label: "Singles Court" },
      { id: "tennis-doubles", label: "Doubles Court" },
      { id: "tennis-coaching", label: "Coaching" },
    ],
  },
  {
    id: "table-tennis",
    label: "Table Tennis",
    image: "/tabletennis.png",
    venue: "indoor",
    subCategories: [
      { id: "tt-casual", label: "Casual Play" },
      { id: "tt-tournament", label: "Tournament Table" },
    ],
  },
  {
    id: "basketball",
    label: "Basketball",
    image: "/basketball.jpg",
    venue: "both",
    subCategories: [
      { id: "basketball-half", label: "Half Court" },
      { id: "basketball-full", label: "Full Court" },
    ],
  },
  {
    id: "volleyball",
    label: "Volleyball",
    image: "/volleyball.jpg",
    venue: "both",
    subCategories: [
      { id: "volleyball-indoor", label: "Indoor" },
      { id: "volleyball-beach", label: "Beach" },
    ],
  },
  {
    id: "swimming",
    label: "Swimming",
    image: "/swimming.jpg",
    venue: "both",
    subCategories: [
      { id: "swimming-pool", label: "Pool Access" },
      { id: "swimming-coaching", label: "Coaching" },
    ],
  },
  {
    id: "snooker-pool",
    label: "Snooker & Pool",
    image: "/snooker.jpg",
    venue: "indoor",
    subCategories: [
      { id: "snooker-table", label: "Snooker Table" },
      { id: "pool-table", label: "Pool Table" },
    ],
  },
  {
    id: "skating",
    label: "Skating",
    image: "/skating.jpg",
    venue: "both",
    subCategories: [{ id: "skating-rink", label: "Rink Access" }],
  },
  {
    id: "indoor-games",
    label: "Indoor Games",
    image: "/indoor-games.jpg",
    venue: "indoor",
    subCategories: [
      { id: "carrom", label: "Carrom" },
      { id: "chess", label: "Chess" },
      { id: "foosball", label: "Foosball" },
    ],
  },
];

export function venueOptionsFor(venue: VenueSetting): SportCategory[] {
  if (venue === "both") return SPORT_CATEGORIES;
  return SPORT_CATEGORIES.filter((c) => c.venue === venue || c.venue === "both");
}

export function subCategoriesForCategories(categoryIds: string[]): SubCategoryOption[] {
  const seen = new Map<string, SubCategoryOption>();
  for (const catId of categoryIds) {
    const cat = SPORT_CATEGORIES.find((c) => c.id === catId);
    if (!cat) continue;
    for (const sub of cat.subCategories) {
      seen.set(sub.id, sub);
    }
  }
  return Array.from(seen.values());
}

export function categoryLabel(id: string): string {
  return SPORT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function subCategoryLabel(id: string): string {
  for (const cat of SPORT_CATEGORIES) {
    const sub = cat.subCategories.find((s) => s.id === id);
    if (sub) return sub.label;
  }
  return id;
}

/** Checks if a court hosting `courtSports` supports the player's selected `targetSport`.
 * An empty `courtSports` array means the court hosts all sports for the venue. */
export function matchesCourtSport(courtSports: string[] | undefined, targetSport: string | undefined): boolean {
  if (!targetSport || !targetSport.trim()) return true;
  if (!courtSports || courtSports.length === 0) return true;

  const targetLower = targetSport.trim().toLowerCase();

  return courtSports.some((s) => {
    const sLower = s.trim().toLowerCase();
    // 1. Direct case-insensitive match or substring match
    if (sLower === targetLower || sLower.includes(targetLower) || targetLower.includes(sLower)) return true;

    // 2. Map category ID <-> Label (e.g. "badminton" <-> "Badminton")
    const catByTarget = SPORT_CATEGORIES.find((c) => c.id.toLowerCase() === targetLower || c.label.toLowerCase() === targetLower);
    if (catByTarget) {
      if (sLower === catByTarget.id.toLowerCase() || sLower === catByTarget.label.toLowerCase()) return true;
    }

    const catByS = SPORT_CATEGORIES.find((c) => c.id.toLowerCase() === sLower || c.label.toLowerCase() === sLower);
    if (catByS) {
      if (targetLower === catByS.id.toLowerCase() || targetLower === catByS.label.toLowerCase()) return true;
    }

    // 3. SubCategory mapping (e.g. "badminton-single" -> parent category "badminton" / "Badminton")
    for (const cat of SPORT_CATEGORIES) {
      const isSubOfCat = cat.subCategories.some((sub) => sub.id.toLowerCase() === targetLower || sub.label.toLowerCase() === targetLower);
      if (isSubOfCat) {
        if (sLower === cat.id.toLowerCase() || sLower === cat.label.toLowerCase()) return true;
      }

      const isSubOfS = cat.subCategories.some((sub) => sub.id.toLowerCase() === sLower || sub.label.toLowerCase() === sLower);
      if (isSubOfS) {
        if (targetLower === cat.id.toLowerCase() || targetLower === cat.label.toLowerCase()) return true;
      }
    }

    return false;
  });
}

