/** Preset cuisine tags for restaurant profiles — vendors can also add custom ones. */
export const CUISINE_PRESETS = [
  "North Indian",
  "South Indian",
  "Chinese",
  "Fast Food",
  "Street Food",
  "Pizza & Pasta",
  "Burgers & Sandwiches",
  "Biryani",
  "Beverages & Juices",
  "Shakes & Ice Cream",
  "Desserts & Bakery",
  "Snacks & Chaat",
  "Healthy & Salads",
  "Rolls & Momos",
];

/** Preset menu categories used when adding dishes — vendors can also type a custom one. */
export const MENU_CATEGORY_PRESETS = [
  "Starters",
  "Main Course",
  "Chinese",
  "Fast Food",
  "Breads",
  "Rice & Biryani",
  "Beverages",
  "Juices & Shakes",
  "Desserts",
  "Snacks",
  "Combos",
];

/**
 * Suggested prep time per category, in minutes — fast items ~5, hot food ~15.
 * These pre-fill the owner's prep-time editor; the saved values are what the
 * player's checkout ETA is actually calculated from. Kept in sync with
 * `backend/src/services/foodEta.service.ts`.
 */
export const DEFAULT_CATEGORY_PREP_MINS: Record<string, number> = {
  Beverages: 5,
  "Juices & Shakes": 5,
  Desserts: 5,
  Snacks: 8,
  Breads: 10,
  Starters: 12,
  "Fast Food": 12,
  "Main Course": 15,
  Chinese: 15,
  "Rice & Biryani": 20,
  Combos: 20,
};

/** Used when neither the owner nor the preset table knows a category. */
export const FALLBACK_PREP_MINS = 15;

export function suggestedPrepMins(category: string): number {
  const key = (category || "").trim().toLowerCase();
  const match = Object.keys(DEFAULT_CATEGORY_PREP_MINS).find((c) => c.toLowerCase() === key);
  return match ? DEFAULT_CATEGORY_PREP_MINS[match]! : FALLBACK_PREP_MINS;
}

/** The four ways a player can take delivery of food, in the order they're offered at checkout. */
export const ORDER_TYPE_OPTIONS = [
  {
    value: "PreOrder",
    label: "Pre-order",
    tagline: "Pickup on arrival",
    description: "Order before your match — it's ready and waiting when you reach the venue.",
    emoji: "⏰",
    /** Which outlet.fulfilment flag gates this option. */
    flag: "preOrder",
  },
  {
    value: "InVenue",
    label: "During play",
    tagline: "Brought to your court",
    description: "Order mid-game — we'll bring it out to your turf or court.",
    emoji: "🏸",
    flag: "inVenue",
  },
  {
    value: "PostMatch",
    label: "After match",
    tagline: "Collect at counter",
    description: "Order now, pick it up from the counter once you're done playing.",
    emoji: "🥤",
    flag: "postMatch",
  },
  {
    value: "DineIn",
    label: "Dine-in",
    tagline: "Served at the cafe",
    description: "Eat at the venue cafe — tell us your table and we'll serve you there.",
    emoji: "🍽️",
    flag: "dineIn",
  },
] as const;

export type OrderTypeOption = (typeof ORDER_TYPE_OPTIONS)[number];

/** Short labels for the owner's order list and the player's receipt. */
export const ORDER_TYPE_LABELS: Record<string, string> = {
  PreOrder: "Pre-order",
  InVenue: "During play",
  PostMatch: "After match",
  DineIn: "Dine-in",
  Counter: "Counter",
};
