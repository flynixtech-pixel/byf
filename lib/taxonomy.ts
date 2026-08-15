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
  venueType?: string;
  subCategories: SubCategoryOption[];
  isCustom?: boolean;
  customId?: string;
}

export const SPORT_CATEGORIES: SportCategory[] = [
  {
    id: "cricket",
    label: "Cricket",
    image: "/bat.png",
    venueType: "Turf",
    venue: "both",
    subCategories: [],
  },
  {
    id: "box-cricket",
    label: "Box Cricket",
    venueType: "Turf",
    venue: "both",
    subCategories: [],
  },
  {
    id: "tennis-ball-cricket",
    label: "Tennis Ball Cricket",
    venueType: "Turf",
    venue: "both",
    subCategories: [],
  },
  {
    id: "football",
    label: "Football",
    image: "/football.png",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "futsal",
    label: "Futsal",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "badminton",
    label: "Badminton",
    image: "/badminton.png",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "tennis",
    label: "Tennis",
    image: "/tennis.png",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "soft-tennis",
    label: "Soft Tennis",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "pickleball",
    label: "Pickleball",
    image: "/pickball.png",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "padel",
    label: "Padel",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "squash",
    label: "Squash",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "racquetball",
    label: "Racquetball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "basketball",
    label: "Basketball",
    image: "/basketball.jpg",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "3x3-basketball",
    label: "3x3 Basketball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "volleyball",
    label: "Volleyball",
    image: "/volleyball.jpg",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "beach-volleyball",
    label: "Beach Volleyball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "handball",
    label: "Handball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "kabaddi",
    label: "Kabaddi",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "beach-kabaddi",
    label: "Beach Kabaddi",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "circle-kabaddi",
    label: "Circle Kabaddi",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "kho-kho",
    label: "Kho-Kho",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "hockey",
    label: "Hockey",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "field-hockey",
    label: "Field Hockey",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "rugby",
    label: "Rugby",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "american-football",
    label: "American Football",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "baseball",
    label: "Baseball",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "softball",
    label: "Softball",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "athletics",
    label: "Athletics",
    venueType: "Track",
    venue: "both",
    subCategories: [],
  },
  {
    id: "cycling",
    label: "Cycling",
    venueType: "Track",
    venue: "both",
    subCategories: [],
  },
  {
    id: "track-cycling",
    label: "Track Cycling",
    venueType: "Velodrome",
    venue: "both",
    subCategories: [],
  },
  {
    id: "skating",
    label: "Skating",
    image: "/skating.jpg",
    venueType: "Rink",
    venue: "both",
    subCategories: [],
  },
  {
    id: "roller-skating",
    label: "Roller Skating",
    venueType: "Rink",
    venue: "both",
    subCategories: [],
  },
  {
    id: "ice-skating",
    label: "Ice Skating",
    venueType: "Rink",
    venue: "both",
    subCategories: [],
  },
  {
    id: "ice-hockey",
    label: "Ice Hockey",
    venueType: "Rink",
    venue: "both",
    subCategories: [],
  },
  {
    id: "swimming",
    label: "Swimming",
    image: "/swimming.jpg",
    venueType: "Pool",
    venue: "both",
    subCategories: [],
  },
  {
    id: "water-polo",
    label: "Water Polo",
    venueType: "Pool",
    venue: "both",
    subCategories: [],
  },
  {
    id: "diving",
    label: "Diving",
    venueType: "Pool",
    venue: "both",
    subCategories: [],
  },
  {
    id: "artistic-swimming",
    label: "Artistic Swimming",
    venueType: "Pool",
    venue: "both",
    subCategories: [],
  },
  {
    id: "table-tennis",
    label: "Table Tennis",
    image: "/tabletennis.png",
    venueType: "Table",
    venue: "both",
    subCategories: [],
  },
  {
    id: "billiards",
    label: "Billiards",
    venueType: "Table",
    venue: "both",
    subCategories: [],
  },
  {
    id: "snooker",
    label: "Snooker",
    venueType: "Table",
    venue: "both",
    subCategories: [],
  },
  {
    id: "pool",
    label: "Pool",
    venueType: "Table",
    venue: "both",
    subCategories: [],
  },
  {
    id: "carrom",
    label: "Carrom",
    venueType: "Board",
    venue: "both",
    subCategories: [],
  },
  {
    id: "chess",
    label: "Chess",
    venueType: "Table",
    venue: "both",
    subCategories: [],
  },
  {
    id: "archery",
    label: "Archery",
    venueType: "Range",
    venue: "both",
    subCategories: [],
  },
  {
    id: "shooting",
    label: "Shooting",
    venueType: "Range",
    venue: "both",
    subCategories: [],
  },
  {
    id: "boxing",
    label: "Boxing",
    venueType: "Ring",
    venue: "both",
    subCategories: [],
  },
  {
    id: "kickboxing",
    label: "Kickboxing",
    venueType: "Ring",
    venue: "both",
    subCategories: [],
  },
  {
    id: "wrestling",
    label: "Wrestling",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "judo",
    label: "Judo",
    venueType: "Dojo",
    venue: "both",
    subCategories: [],
  },
  {
    id: "karate",
    label: "Karate",
    venueType: "Dojo",
    venue: "both",
    subCategories: [],
  },
  {
    id: "taekwondo",
    label: "Taekwondo",
    venueType: "Dojo",
    venue: "both",
    subCategories: [],
  },
  {
    id: "wushu",
    label: "Wushu",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "fencing",
    label: "Fencing",
    venueType: "Piste",
    venue: "both",
    subCategories: [],
  },
  {
    id: "gymnastics",
    label: "Gymnastics",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "yoga",
    label: "Yoga",
    venueType: "Studio",
    venue: "both",
    subCategories: [],
  },
  {
    id: "yogasana",
    label: "Yogasana",
    venueType: "Studio",
    venue: "both",
    subCategories: [],
  },
  {
    id: "pilates",
    label: "Pilates",
    venueType: "Studio",
    venue: "both",
    subCategories: [],
  },
  {
    id: "dance",
    label: "Dance",
    venueType: "Studio",
    venue: "both",
    subCategories: [],
  },
  {
    id: "fitness",
    label: "Fitness",
    venueType: "Gym",
    venue: "both",
    subCategories: [],
  },
  {
    id: "gym",
    label: "Gym",
    venueType: "Gym",
    venue: "both",
    subCategories: [],
  },
  {
    id: "golf",
    label: "Golf",
    venueType: "Course",
    venue: "both",
    subCategories: [],
  },
  {
    id: "mini-golf",
    label: "Mini Golf",
    venueType: "Course",
    venue: "both",
    subCategories: [],
  },
  {
    id: "polo",
    label: "Polo",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "equestrian",
    label: "Equestrian",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "horse-riding",
    label: "Horse Riding",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "rowing",
    label: "Rowing",
    venueType: "Water Course",
    venue: "both",
    subCategories: [],
  },
  {
    id: "kayaking",
    label: "Kayaking",
    venueType: "Water Course",
    venue: "both",
    subCategories: [],
  },
  {
    id: "canoeing",
    label: "Canoeing",
    venueType: "Water Course",
    venue: "both",
    subCategories: [],
  },
  {
    id: "surfing",
    label: "Surfing",
    venueType: "Beach",
    venue: "both",
    subCategories: [],
  },
  {
    id: "sailing",
    label: "Sailing",
    venueType: "Water Course",
    venue: "both",
    subCategories: [],
  },
  {
    id: "yachting",
    label: "Yachting",
    venueType: "Marina",
    venue: "both",
    subCategories: [],
  },
  {
    id: "triathlon",
    label: "Triathlon",
    venueType: "Course",
    venue: "both",
    subCategories: [],
  },
  {
    id: "modern-pentathlon",
    label: "Modern Pentathlon",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "sepaktakraw",
    label: "Sepak Takraw",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "netball",
    label: "Netball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "korfball",
    label: "Korfball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "throwball",
    label: "Throwball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "roll-ball",
    label: "Roll Ball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "shooting-ball",
    label: "Shooting Ball",
    venueType: "Court",
    venue: "both",
    subCategories: [],
  },
  {
    id: "atya-patya",
    label: "Atya Patya",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "mallakhamb",
    label: "Mallakhamb",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "powerlifting",
    label: "Powerlifting",
    venueType: "Gym",
    venue: "both",
    subCategories: [],
  },
  {
    id: "weightlifting",
    label: "Weightlifting",
    venueType: "Gym",
    venue: "both",
    subCategories: [],
  },
  {
    id: "bodybuilding",
    label: "Bodybuilding",
    venueType: "Gym",
    venue: "both",
    subCategories: [],
  },
  {
    id: "tug-of-war",
    label: "Tug of War",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "bridge",
    label: "Bridge",
    venueType: "Table",
    venue: "both",
    subCategories: [],
  },
  {
    id: "bowling",
    label: "Bowling",
    venueType: "Lane",
    venue: "both",
    subCategories: [],
  },
  {
    id: "ten-pin-bowling",
    label: "Ten-Pin Bowling",
    venueType: "Lane",
    venue: "both",
    subCategories: [],
  },
  {
    id: "darts",
    label: "Darts",
    venueType: "Board",
    venue: "both",
    subCategories: [],
  },
  {
    id: "air-hockey",
    label: "Air Hockey",
    venueType: "Table",
    venue: "both",
    subCategories: [],
  },
  {
    id: "foosball",
    label: "Foosball",
    venueType: "Table",
    venue: "both",
    subCategories: [],
  },
  {
    id: "paintball",
    label: "Paintball",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "laser-tag",
    label: "Laser Tag",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "climbing",
    label: "Climbing",
    venueType: "Climbing Wall",
    venue: "both",
    subCategories: [],
  },
  {
    id: "bouldering",
    label: "Bouldering",
    venueType: "Climbing Wall",
    venue: "both",
    subCategories: [],
  },
  {
    id: "martial-arts",
    label: "Martial Arts",
    venueType: "Dojo",
    venue: "both",
    subCategories: [],
  },
  {
    id: "aikido",
    label: "Aikido",
    venueType: "Dojo",
    venue: "both",
    subCategories: [],
  },
  {
    id: "jiu-jitsu",
    label: "Jiu-Jitsu",
    venueType: "Dojo",
    venue: "both",
    subCategories: [],
  },
  {
    id: "muay-thai",
    label: "Muay Thai",
    venueType: "Ring",
    venue: "both",
    subCategories: [],
  },
  {
    id: "mma",
    label: "MMA",
    venueType: "Arena",
    venue: "both",
    subCategories: [],
  },
  {
    id: "wushu-sanda",
    label: "Wushu Sanda",
    venueType: "Ring",
    venue: "both",
    subCategories: [],
  },
  {
    id: "flying-disc",
    label: "Flying Disc",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "ultimate-frisbee",
    label: "Ultimate Frisbee",
    venueType: "Ground",
    venue: "both",
    subCategories: [],
  },
  {
    id: "base-jumping",
    label: "Base Jumping",
    venueType: "Outdoor Site",
    venue: "both",
    subCategories: [],
  },
  {
    id: "skateboarding",
    label: "Skateboarding",
    venueType: "Skate Park",
    venue: "both",
    subCategories: [],
  },
  {
    id: "bmx",
    label: "BMX",
    venueType: "Track",
    venue: "both",
    subCategories: [],
  },
  {
    id: "motorsport",
    label: "Motorsport",
    venueType: "Circuit",
    venue: "both",
    subCategories: [],
  },
  {
    id: "karting",
    label: "Karting",
    venueType: "Circuit",
    venue: "both",
    subCategories: [],
  },
  {
    id: "drag-racing",
    label: "Drag Racing",
    venueType: "Track",
    venue: "both",
    subCategories: [],
  },
  {
    id: "air-sports",
    label: "Air Sports",
    venueType: "Airfield",
    venue: "both",
    subCategories: [],
  },
  {
    id: "paragliding",
    label: "Paragliding",
    venueType: "Launch Site",
    venue: "both",
    subCategories: [],
  },
  {
    id: "hang-gliding",
    label: "Hang Gliding",
    venueType: "Launch Site",
    venue: "both",
    subCategories: [],
  },
  {
    id: "triathlon-swimming",
    label: "Triathlon Swimming",
    venueType: "Pool",
    venue: "both",
    subCategories: [],
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

