import type { FoodOutlet, MenuItem } from "@/lib/api/types";

export interface DiningReview {
  author: string;
  rating: number;
  comment: string;
  visited: string;
}

export interface DiningMenuSection {
  title: string;
  note?: string;
  items: Array<{
    name: string;
    description?: string;
    price: number;
    badge?: string;
  }>;
}

export interface DiningRestaurantMeta {
  key: string;
  slug: string;
  /** Display name, cuisines and area — used verbatim when the API is unreachable and the
   *  marketplace falls back to this catalog, so cards never show a de-slugified name. */
  name: string;
  cuisines: string[];
  area: string;
  hero: string;
  gallery: string[];
  rating: number;
  reviewCount: number;
  distanceKm: number;
  costForTwo: number;
  timings: string;
  features: string[];
  vibe: string;
  offers: string[];
  aiSummary: string;
  aiHighlights: string[];
  seatingOptions: string[];
  reviews: DiningReview[];
  menuSections: DiningMenuSection[];
  similarKeys: string[];
  bankOffers: Array<{ code: string; label: string; description: string }>;
}

export interface DiningSpotView {
  key: string;
  slug: string;
  name: string;
  city: string;
  area: string;
  cuisines: string[];
  rating: number;
  reviewCount: number;
  distanceKm: number;
  costForTwo: number;
  timings: string;
  features: string[];
  vibe: string;
  offers: string[];
  aiSummary: string;
  aiHighlights: string[];
  seatingOptions: string[];
  reviews: DiningReview[];
  gallery: string[];
  hero: string;
  menuSections: DiningMenuSection[];
  similarKeys: string[];
  bankOffers: Array<{ code: string; label: string; description: string }>;
}

/**
 * Placeholder card used when a restaurant has no photo of its own.
 *
 * Deliberately text-free: the card already renders the restaurant name, rating and
 * cuisines as real DOM text on top of this image, so any label baked in here collided
 * with them. `title` only seeds the caption a screen reader gets via the img alt.
 */
function svgCard(_title: string, from: string, to: string, accent: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${from}" />
        <stop offset="100%" stop-color="${to}" />
      </linearGradient>
      <radialGradient id="r" cx="72%" cy="18%" r="80%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#g)" />
    <rect width="1200" height="800" fill="url(#r)" />
    <circle cx="210" cy="190" r="110" fill="rgba(255,255,255,0.12)" />
    <circle cx="980" cy="610" r="180" fill="rgba(255,255,255,0.08)" />
    <circle cx="640" cy="360" r="46" fill="rgba(255,255,255,0.10)" />
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const DINING_SPOTS: DiningRestaurantMeta[] = [
  {
    key: "marigold-rooftop-kitchen",
    slug: "marigold-rooftop-kitchen",
    name: "Marigold Rooftop Kitchen",
    cuisines: ["North Indian", "Continental", "Mediterranean", "Desserts"],
    area: "Lake Palace Road",
    hero: svgCard("Marigold Rooftop Kitchen", "#2a1206", "#9a3412", "#f59e0b"),
    gallery: [
      svgCard("Marigold Terrace", "#2a1206", "#9a3412", "#f59e0b"),
      svgCard("Open Kitchen", "#1f2937", "#7c2d12", "#fb923c"),
      svgCard("Sunset Table", "#3f2c1f", "#b45309", "#fde68a"),
      svgCard("Live Acoustic", "#111827", "#4c1d95", "#c084fc"),
    ],
    rating: 4.7,
    reviewCount: 1362,
    distanceKm: 2.4,
    costForTwo: 1400,
    timings: "Open till 11:45 PM",
    features: ["Rooftop", "Fine dining", "Live music", "Outdoor seating", "Date-night"],
    vibe: "Sunset dinners, anniversaries, and weekend acoustic sets",
    offers: ["Flat 15% off for BYV players", "Sunset slot tables at 6:30 PM", "Earn DineCash on every bill"],
    aiSummary:
      "The strongest pick for a celebration dinner. Reviews consistently call out the terrace view, the wood-fired grill, and staff who handle cake surprises well.",
    aiHighlights: [
      "Sunset tables (6:00–7:30 PM) book out first",
      "The grill platter is the single most-ordered dish",
      "Live acoustic sets on Friday and Saturday nights",
    ],
    seatingOptions: ["Rooftop", "Outdoor", "Indoor"],
    reviews: [
      { author: "Simran", rating: 5, comment: "Booked the 7 PM slot for our anniversary — the terrace at sunset is unreal.", visited: "2 days ago" },
      { author: "Rohit", rating: 5, comment: "Grill platter easily fed three of us. Service was quick even on a Saturday.", visited: "1 week ago" },
      { author: "Nidhi", rating: 4, comment: "Slightly premium, but the view and the live music make it worth it.", visited: "3 weeks ago" },
    ],
    menuSections: [
      {
        title: "Starters",
        items: [
          { name: "Marigold Mezze Platter", description: "Four dips, warm pita, olives", price: 520, badge: "Popular" },
          { name: "Smoked Paneer Tikka", description: "Charcoal finish, mint chutney", price: 440 },
        ],
      },
      {
        title: "From the Grill",
        items: [
          { name: "Rooftop Grill Platter", description: "Veg and chicken assortment", price: 890, badge: "Chef's pick" },
          { name: "Lemon Herb Chicken Steak", description: "Rosemary jus, mashed potato", price: 720 },
        ],
      },
    ],
    similarKeys: ["copper-lane-social", "bean-basil-cafe", "haveli-chulha"],
    bankOffers: [
      { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
      { code: "ICICI8", label: "ICICI Bank Dining", description: "Up to 8% off, max ₹200" },
    ],
  },
  {
    key: "haveli-chulha",
    slug: "haveli-chulha",
    name: "Haveli Chulha",
    cuisines: ["Rajasthani", "North Indian", "Thali", "Pure Veg"],
    area: "Chandpole",
    hero: svgCard("Haveli Chulha", "#3b1106", "#92400e", "#fbbf24"),
    gallery: [
      svgCard("Haveli Courtyard", "#3b1106", "#92400e", "#fbbf24"),
      svgCard("Chulha Kitchen", "#1c1917", "#78350f", "#f97316"),
      svgCard("Thali Service", "#292524", "#a16207", "#fde68a"),
      svgCard("Folk Evening", "#1f2937", "#7c2d12", "#fb7185"),
    ],
    rating: 4.6,
    reviewCount: 2043,
    distanceKm: 3.1,
    costForTwo: 850,
    timings: "Open till 11:00 PM",
    features: ["Family-friendly", "Pure veg", "Heritage", "Live folk music", "Group dining"],
    vibe: "Unlimited Mewari thalis in a 90-year-old haveli courtyard",
    offers: ["Flat 12% off for BYV players", "Unlimited thali refills", "Group tables up to 24"],
    aiSummary:
      "The most family-friendly option on the list. Reviewers keep mentioning the unlimited thali, the ghee-soaked dal baati, and the 7 PM folk performance.",
    aiHighlights: [
      "The Royal Mewari Thali is what nearly everyone orders",
      "Folk music starts at 7 PM every evening",
      "Courtyard handles large family groups comfortably",
    ],
    seatingOptions: ["Courtyard", "Indoor", "Floor seating"],
    reviews: [
      { author: "Pooja", rating: 5, comment: "Came with eight people and they seated us in ten minutes. Thali refills kept coming.", visited: "3 days ago" },
      { author: "Mahesh", rating: 5, comment: "Best dal baati churma I have had in Udaipur. The bajra roti is the real hero.", visited: "1 week ago" },
      { author: "Anjali", rating: 4, comment: "Gets crowded after 8 PM — book ahead and you are fine.", visited: "2 weeks ago" },
    ],
    menuSections: [
      {
        title: "Thali",
        items: [
          { name: "Royal Mewari Thali", description: "Unlimited, 4 sabzi and two sweets", price: 649, badge: "Popular" },
          { name: "Chulha Special Veg Thali", description: "3 sabzi, dal, rice, one sweet", price: 399 },
        ],
      },
      {
        title: "Mewari Specials",
        items: [
          { name: "Dal Baati Churma", description: "Wood-fired baati, panchmel dal", price: 320, badge: "Chef's pick" },
          { name: "Ker Sangri", description: "Desert berries, red chilli tempering", price: 280 },
        ],
      },
    ],
    similarKeys: ["marigold-rooftop-kitchen", "bean-basil-cafe", "copper-lane-social"],
    bankOffers: [
      { code: "SBI7", label: "SBI Dining Offer", description: "Up to 7% off, max ₹150" },
      { code: "AXIS5", label: "Axis Dining Offer", description: "Up to 5% off, max ₹100" },
    ],
  },
  {
    key: "bean-basil-cafe",
    slug: "bean-basil-cafe",
    name: "Bean & Basil Cafe",
    cuisines: ["Cafe", "Italian", "Continental", "Bakery"],
    area: "Fateh Sagar",
    hero: svgCard("Bean & Basil Cafe", "#0b3b2e", "#0f766e", "#5eead4"),
    gallery: [
      svgCard("Cafe Floor", "#0b3b2e", "#0f766e", "#5eead4"),
      svgCard("Coffee Bar", "#1f2937", "#334155", "#7dd3fc"),
      svgCard("Bakery Counter", "#3f2c1f", "#7c4a25", "#fdba74"),
      svgCard("Lake Window", "#134e4a", "#155e75", "#a5f3fc"),
    ],
    rating: 4.7,
    reviewCount: 1618,
    distanceKm: 1.6,
    costForTwo: 700,
    timings: "Open till 11:30 PM",
    features: ["Cafe", "Wi-Fi", "Co-working", "Breakfast", "Outdoor seating"],
    vibe: "Long work mornings, slow brunches, and lake-side coffee runs",
    offers: ["Flat 10% off for BYV players", "All-day brunch till close", "Earn DineCash on every bill"],
    aiSummary:
      "The laptop-friendly one. Fast Wi-Fi, plug points at every table, and a bakery counter that reviewers say sells out by evening.",
    aiHighlights: [
      "Plug points and Wi-Fi come up in almost every review",
      "The Basque cheesecake is gone most evenings — go early",
      "Quietest between 10 AM and 1 PM on weekdays",
    ],
    seatingOptions: ["Indoor", "Outdoor", "Window"],
    reviews: [
      { author: "Ananya", rating: 5, comment: "Worked here for five hours, nobody rushed me. The pour over is excellent.", visited: "Yesterday" },
      { author: "Kabir", rating: 5, comment: "Shakshuka and a cold brew is my standard weekend order now.", visited: "5 days ago" },
      { author: "Ritika", rating: 4, comment: "Great coffee, but the cheesecake was sold out by the time I got there at 8.", visited: "2 weeks ago" },
    ],
    menuSections: [
      {
        title: "Coffee",
        items: [
          { name: "Single-Origin Pour Over", description: "Rotating Indian estate beans", price: 260, badge: "Popular" },
          { name: "Honey Oat Latte", description: "Oat milk, wild honey", price: 240 },
        ],
      },
      {
        title: "All-Day Brunch",
        items: [
          { name: "Sourdough Shakshuka", description: "Baked eggs, feta, toasted sourdough", price: 420, badge: "Chef's pick" },
          { name: "Avocado & Feta Toast", description: "Whipped feta, chilli flakes", price: 380 },
        ],
      },
    ],
    similarKeys: ["marigold-rooftop-kitchen", "copper-lane-social", "haveli-chulha"],
    bankOffers: [
      { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
      { code: "CITI6", label: "Citi Dining Offer", description: "Up to 6% off, max ₹120" },
    ],
  },
  {
    key: "copper-lane-social",
    slug: "copper-lane-social",
    name: "Copper Lane Social",
    cuisines: ["Continental", "Asian", "Pub Fare", "Bar"],
    area: "Hiran Magri",
    hero: svgCard("Copper Lane Social", "#1c1917", "#7c2d12", "#fb923c"),
    gallery: [
      svgCard("Copper Bar", "#1c1917", "#7c2d12", "#fb923c"),
      svgCard("Booth Seating", "#0f172a", "#312e81", "#a855f7"),
      svgCard("Match Screens", "#111827", "#065f46", "#34d399"),
      svgCard("DJ Nights", "#18181b", "#4c1d95", "#f472b6"),
    ],
    rating: 4.5,
    reviewCount: 1187,
    distanceKm: 4.3,
    costForTwo: 1200,
    timings: "Open till 11:45 PM",
    features: ["Pub", "Live music", "Late-night", "Group dining", "Sports screens"],
    vibe: "After-match plans, sharing boards, and weekend DJ nights",
    offers: ["Flat 12% off for BYV players", "Sharing platters for groups of four", "Late-night happy hour"],
    aiSummary:
      "Built for the post-game crowd. Big sharing boards, screens showing live sport, and a DJ from 9 PM on weekends — the loudest and most social pick here.",
    aiHighlights: [
      "The Game Night Platter is the standard group order",
      "DJ from 9 PM on Friday and Saturday",
      "Books out fastest right after evening match slots",
    ],
    seatingOptions: ["Indoor", "Booth", "Bar counter"],
    reviews: [
      { author: "Arjun", rating: 5, comment: "Came straight here after our 8 PM turf slot. Platter and the match on screen — sorted.", visited: "2 days ago" },
      { author: "Tanvi", rating: 4, comment: "Loud in the best way on a Saturday. Book ahead if you want a booth.", visited: "1 week ago" },
      { author: "Sahil", rating: 5, comment: "Smash burger is genuinely good and the fries keep coming.", visited: "3 weeks ago" },
    ],
    menuSections: [
      {
        title: "Sharing Boards",
        items: [
          { name: "Game Night Platter", description: "Wings, fries, nachos, toast. Feeds four", price: 890, badge: "Popular" },
          { name: "Copper Lane Loaded Nachos", description: "Cheddar, jalapenos, pico de gallo", price: 420 },
        ],
      },
      {
        title: "Burgers & Mains",
        items: [
          { name: "Double Smash Burger", description: "Two patties, burger sauce, fries", price: 590, badge: "Chef's pick" },
          { name: "Crispy Paneer Burger", description: "Panko paneer, sriracha mayo", price: 490 },
        ],
      },
    ],
    similarKeys: ["marigold-rooftop-kitchen", "bean-basil-cafe", "haveli-chulha"],
    bankOffers: [
      { code: "ICICI8", label: "ICICI Bank Dining", description: "Up to 8% off, max ₹200" },
      { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
    ],
  },
  {
    key: "aosa-bakehouse-roastery",
    slug: "aosa-bakehouse-roastery",
    name: "Aosa Bakehouse & Roastery",
    cuisines: ["Cafe", "Bakery", "Coffee"],
    area: "Gulab Bagh Road",
    hero: svgCard("Aosa Bakehouse & Roastery", "#2f1a10", "#7c4a25", "#f59e0b"),
    gallery: [
      svgCard("Aosa Patio", "#2f1a10", "#7c4a25", "#f59e0b"),
      svgCard("Coffee Bar", "#443023", "#8b5e34", "#fde68a"),
      svgCard("Roastery", "#1f2937", "#374151", "#f97316"),
      svgCard("Window Table", "#325036", "#6b8e62", "#fb7185"),
    ],
    rating: 4.6,
    reviewCount: 1084,
    distanceKm: 3.5,
    costForTwo: 900,
    timings: "Open till 2:00 AM",
    features: ["Cafe", "Rooftop", "Outdoor seating", "Fine dining", "Wi-Fi"],
    vibe: "Slow brunches, work-friendly coffee runs, sunset desserts",
    offers: ["Flat 10% off on pre-booking", "Use DINE250 for extra savings", "10% cashback on bill payment"],
    aiSummary:
      "Best for late-evening coffee, bakery plates, and a quiet rooftop vibe. The AI picked up a strong date-night and work-from-cafe pattern from reviews.",
    aiHighlights: ["Rooftop seating gets mentioned often", "Desserts and pour-over coffee are repeat favourites", "Quiet weekdays, busy weekends"],
    seatingOptions: ["Indoor", "Outdoor", "Rooftop"],
    reviews: [
      { author: "Meera", rating: 5, comment: "Loved the roast, great for a long catch-up without feeling rushed.", visited: "2 days ago" },
      { author: "Kabir", rating: 4, comment: "Rooftop is gorgeous at sunset and the cheesecake was excellent.", visited: "1 week ago" },
      { author: "Aarav", rating: 5, comment: "Booked through BookYourVibe and the table was ready on time.", visited: "3 weeks ago" },
    ],
    menuSections: [
      {
        title: "Signature bakes",
        note: "Fresh out of the oven",
        items: [
          { name: "Burnt Basque Cheesecake", description: "Silky, lightly caramelized", price: 320, badge: "Popular" },
          { name: "Cinnamon Babka", description: "Soft loaf with espresso glaze", price: 260 },
        ],
      },
      {
        title: "Brunch plates",
        items: [
          { name: "Sourdough Shakshuka", description: "Slow-cooked tomatoes, eggs, herbs", price: 410 },
          { name: "Avocado Croissant Stack", description: "Microgreens, whipped feta", price: 390, badge: "Chef's pick" },
        ],
      },
      {
        title: "Coffee & pour overs",
        items: [
          { name: "House Cold Brew", description: "20-hour steep", price: 210 },
          { name: "Ethiopian Pour Over", description: "Single-origin, floral finish", price: 280 },
        ],
      },
    ],
    similarKeys: ["ember-rooftop-kitchen", "garden-table-house", "miso-mint-cafe"],
    bankOffers: [
      { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
      { code: "SBI7", label: "SBI Dining Offer", description: "Up to 7% off, max ₹150" },
    ],
  },
  {
    key: "ember-rooftop-kitchen",
    slug: "ember-rooftop-kitchen",
    name: "Ember Rooftop Kitchen",
    cuisines: ["Continental", "Grill", "Bar"],
    area: "City Palace Road",
    hero: svgCard("Ember Rooftop Kitchen", "#0f172a", "#312e81", "#a855f7"),
    gallery: [
      svgCard("Rooftop Night", "#0f172a", "#312e81", "#a855f7"),
      svgCard("Bar Counter", "#1f2937", "#4c1d95", "#c084fc"),
      svgCard("Open Air", "#111827", "#0f766e", "#34d399"),
      svgCard("Chef Table", "#4a1d1d", "#8b4513", "#f97316"),
    ],
    rating: 4.8,
    reviewCount: 2110,
    distanceKm: 2.1,
    costForTwo: 1400,
    timings: "Open till 1:00 AM",
    features: ["Rooftop", "Live music", "Fine dining", "Outdoor seating", "Date-night"],
    vibe: "Cocktail evenings, date nights, live acoustic sets",
    offers: ["Flat 15% off on pre-booking", "VIP seating on selected time slots", "Earn DineCash on every bill"],
    aiSummary:
      "The AI sees Ember as a high-energy rooftop with consistently strong ratings for ambience and service. It is the top pick for celebrations and date nights.",
    aiHighlights: ["Live music draws the biggest crowd on Fridays", "Outdoor tables are most requested", "Dessert plus cocktails pairs are a recurring review theme"],
    seatingOptions: ["Indoor", "Outdoor", "Terrace"],
    reviews: [
      { author: "Simran", rating: 5, comment: "Perfect anniversary spot. The staff handled our cake surprise beautifully.", visited: "Yesterday" },
      { author: "Rohan", rating: 5, comment: "The live music and skyline view are worth it alone.", visited: "5 days ago" },
      { author: "Nisha", rating: 4, comment: "A little premium on price, but the ambience makes up for it.", visited: "2 weeks ago" },
    ],
    menuSections: [
      {
        title: "Chef specials",
        items: [
          { name: "Smoked Tomato Tart", description: "Herb cream, parmesan crisps", price: 460, badge: "Popular" },
          { name: "Charred Corn Tempura", description: "Chili aioli, lime dust", price: 390 },
        ],
      },
      {
        title: "Mains",
        items: [
          { name: "Black Pepper Chicken Steak", description: "Potato gratin, pepper jus", price: 690 },
          { name: "Truffle Mushroom Tagliatelle", description: "Cream sauce, parmesan", price: 610, badge: "Chef's pick" },
        ],
      },
      {
        title: "Desserts",
        items: [
          { name: "Molten Chocolate Dome", description: "Vanilla bean ice cream", price: 340 },
          { name: "Baked Citrus Tart", description: "Candied orange, mascarpone", price: 320 },
        ],
      },
    ],
    similarKeys: ["aosa-bakehouse-roastery", "lakehouse-social-club", "sun-moon-terrace"],
    bankOffers: [
      { code: "ICICI8", label: "ICICI Bank Dining", description: "Up to 8% off, max ₹200" },
      { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
    ],
  },
  {
    key: "garden-table-house",
    slug: "garden-table-house",
    name: "The Garden Table",
    cuisines: ["Cafe", "Continental", "Pizza"],
    area: "Sajjangarh Road",
    hero: svgCard("The Garden Table", "#073b2a", "#0f766e", "#22c55e"),
    gallery: [
      svgCard("Garden Dining", "#073b2a", "#0f766e", "#22c55e"),
      svgCard("Plant Wall", "#1b4332", "#2d6a4f", "#bef264"),
      svgCard("Courtyard", "#0f172a", "#14532d", "#86efac"),
      svgCard("Family Table", "#1f2937", "#334155", "#fde68a"),
    ],
    rating: 4.5,
    reviewCount: 860,
    distanceKm: 1.8,
    costForTwo: 780,
    timings: "Open till 11:30 PM",
    features: ["Family-friendly", "Outdoor seating", "Cafe", "Breakfast", "Pet-friendly"],
    vibe: "Lunches, family dinners, easy weekend brunches",
    offers: ["Flat 12% off for pre-booking", "Kids-eat-friendly bundles", "10% cashback on bill payment"],
    aiSummary:
      "Great for family groups and relaxed lunches. Reviews mention quick seating, generous portions, and a calm courtyard setup.",
    aiHighlights: ["Outdoor tables suit larger groups", "Families love the tasting platters", "Best value among the premium dining picks"],
    seatingOptions: ["Indoor", "Outdoor", "Garden"],
    reviews: [
      { author: "Pooja", rating: 5, comment: "We came with kids and had plenty of space. Easy booking.", visited: "3 days ago" },
      { author: "Dev", rating: 4, comment: "Fresh food and nice plant-heavy ambience.", visited: "1 week ago" },
      { author: "Ritika", rating: 5, comment: "The garden table felt premium without being too loud.", visited: "2 weeks ago" },
    ],
    menuSections: [
      {
        title: "Small plates",
        items: [
          { name: "Charred Veg Platter", description: "Seasonal vegetables, dips", price: 360 },
          { name: "Corn & Cheese Croquettes", description: "Chili mayo", price: 290, badge: "Family favourite" },
        ],
      },
      {
        title: "House specials",
        items: [
          { name: "Herb Paneer Skillet", description: "Sizzler-style, lemon rice", price: 520, badge: "Popular" },
          { name: "Wood-fired Veg Pizza", description: "Fresh basil, olives, mozzarella", price: 540 },
        ],
      },
      {
        title: "Dessert garden",
        items: [
          { name: "Mango Cheesecake Jar", description: "Seasonal, light", price: 220 },
          { name: "Warm Brownie Bowl", description: "Dark chocolate sauce", price: 240 },
        ],
      },
    ],
    similarKeys: ["miso-mint-cafe", "lakeside-bistro", "aosa-bakehouse-roastery"],
    bankOffers: [
      { code: "AXIS5", label: "Axis Dining Offer", description: "Up to 5% off, max ₹100" },
      { code: "SBI7", label: "SBI Dining Offer", description: "Up to 7% off, max ₹150" },
    ],
  },
  {
    key: "miso-mint-cafe",
    slug: "miso-mint-cafe",
    name: "Miso & Mint Cafe",
    cuisines: ["Cafe", "Asian", "Desserts"],
    area: "Ambamata",
    hero: svgCard("Miso & Mint Cafe", "#1f2937", "#0f766e", "#38bdf8"),
    gallery: [
      svgCard("Cafe Corner", "#1f2937", "#0f766e", "#38bdf8"),
      svgCard("Tea Bar", "#111827", "#334155", "#7dd3fc"),
      svgCard("Dessert Counter", "#3b0764", "#581c87", "#f472b6"),
      svgCard("Window Seat", "#3f2c1f", "#7c4a25", "#fdba74"),
    ],
    rating: 4.7,
    reviewCount: 1490,
    distanceKm: 4.2,
    costForTwo: 620,
    timings: "Open till 12:30 AM",
    features: ["Cafe", "Wi-Fi", "Co-working", "Outdoor seating", "Family-friendly"],
    vibe: "Quiet coffees, laptop-friendly afternoons, dessert runs",
    offers: ["Flat 10% off on pre-booking", "Great for work meetings", "Earn cashback on dining bills"],
    aiSummary:
      "This spot balances a calm cafe atmosphere with strong dessert reviews. The AI recommends it for small groups, meetings, and long work sessions.",
    aiHighlights: ["Wi-Fi and sockets are frequently praised", "Pastry counter sells out late evenings", "Best for low-noise seating"],
    seatingOptions: ["Indoor", "Outdoor", "Window"],
    reviews: [
      { author: "Ananya", rating: 5, comment: "Perfect for a laptop day. The flat white was excellent.", visited: "2 days ago" },
      { author: "Karan", rating: 4, comment: "The mint chocolate tart is worth a detour.", visited: "4 days ago" },
      { author: "Ira", rating: 5, comment: "Booked a corner table and worked here for hours.", visited: "1 week ago" },
    ],
    menuSections: [
      {
        title: "Coffee",
        items: [
          { name: "Flat White", description: "Balanced espresso and milk", price: 190 },
          { name: "Honey Oat Latte", description: "Smooth and lightly sweet", price: 230, badge: "Popular" },
        ],
      },
      {
        title: "Cafe bites",
        items: [
          { name: "Truffle Grilled Sandwich", description: "Mozzarella, basil pesto", price: 320 },
          { name: "Katsu Sando", description: "Crispy chicken, tangy slaw", price: 360, badge: "Chef's pick" },
        ],
      },
      {
        title: "Desserts",
        items: [
          { name: "Mint Chocolate Tart", description: "House favourite", price: 280 },
          { name: "Miso Caramel Basque", description: "Sweet-savoury twist", price: 320 },
        ],
      },
    ],
    similarKeys: ["aosa-bakehouse-roastery", "the-garden-table", "lakehouse-social-club"],
    bankOffers: [
      { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
      { code: "CITI6", label: "Citi Dining Offer", description: "Up to 6% off, max ₹120" },
    ],
  },
  {
    key: "lakehouse-social-club",
    slug: "lakehouse-social-club",
    name: "Lakehouse Social Club",
    cuisines: ["Pub Fare", "Continental", "Bar"],
    area: "Fateh Sagar",
    hero: svgCard("Lakehouse Social Club", "#0f172a", "#1d4ed8", "#38bdf8"),
    gallery: [
      svgCard("Lake View", "#0f172a", "#1d4ed8", "#38bdf8"),
      svgCard("Social Bar", "#1f2937", "#0f766e", "#34d399"),
      svgCard("Sun Deck", "#1e293b", "#7c2d12", "#fb923c"),
      svgCard("Evening Lights", "#111827", "#312e81", "#c084fc"),
    ],
    rating: 4.4,
    reviewCount: 760,
    distanceKm: 5.1,
    costForTwo: 1200,
    timings: "Open till 1:30 AM",
    features: ["Rooftop", "Live music", "Pub", "Outdoor seating", "Late-night"],
    vibe: "High-energy evenings, drinks, and music by the lake",
    offers: ["Entry-linked dining offer", "Late-night happy hour", "DineCash on every bill"],
    aiSummary:
      "The AI describes this as a social, music-first venue with strong appeal for groups and celebrations. It gets busier after 8 PM.",
    aiHighlights: ["Live music nights are the most searched slot", "Groups book the terrace early", "Great for birthdays and reunion plans"],
    seatingOptions: ["Indoor", "Outdoor", "Terrace"],
    reviews: [
      { author: "Tanvi", rating: 5, comment: "Booked for a birthday. The staff and live music made it easy.", visited: "1 day ago" },
      { author: "Arjun", rating: 4, comment: "Great lake view and solid cocktails.", visited: "6 days ago" },
      { author: "Sana", rating: 4, comment: "Worth booking early because terrace fills up fast.", visited: "2 weeks ago" },
    ],
    menuSections: [
      {
        title: "Sharing plates",
        items: [
          { name: "Loaded Nachos", description: "Salsa, cheddar, jalapeños", price: 360 },
          { name: "Crispy Chicken Wings", description: "Smoky glaze", price: 420, badge: "Popular" },
        ],
      },
      {
        title: "Mains",
        items: [
          { name: "Smash Burger", description: "House sauce, fries", price: 590 },
          { name: "BBQ Chicken Platter", description: "Roasted corn, slaw", price: 720 },
        ],
      },
      {
        title: "Bar snacks",
        items: [
          { name: "Masala Peanuts", description: "Crispy and spicy", price: 180 },
          { name: "Cheese Tots", description: "Dip included", price: 260 },
        ],
      },
    ],
    similarKeys: ["ember-rooftop-kitchen", "sun-moon-terrace", "miso-mint-cafe"],
    bankOffers: [
      { code: "AXIS5", label: "Axis Dining Offer", description: "Up to 5% off, max ₹100" },
      { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
    ],
  },
  {
    key: "sun-moon-terrace",
    slug: "sun-moon-terrace",
    name: "Sun & Moon Terrace",
    cuisines: ["North Indian", "Grill", "Continental"],
    area: "Rani Road",
    hero: svgCard("Sun and Moon Terrace", "#1f2937", "#7c2d12", "#f59e0b"),
    gallery: [
      svgCard("Terrace Sunset", "#1f2937", "#7c2d12", "#f59e0b"),
      svgCard("Dining Deck", "#334155", "#0f172a", "#f97316"),
      svgCard("Private Booth", "#4b5563", "#111827", "#facc15"),
      svgCard("Photo Spot", "#3f2c1f", "#8b4513", "#fde68a"),
    ],
    rating: 4.5,
    reviewCount: 930,
    distanceKm: 3.8,
    costForTwo: 1050,
    timings: "Open till 12:00 AM",
    features: ["Rooftop", "Family-friendly", "Outdoor seating", "Fine dining", "Celebrations"],
    vibe: "Sunset dinners, family celebrations, scenic rooftop meals",
    offers: ["Flat 14% off on pre-booking", "Birthday table add-on", "Earn DineCash on bill payment"],
    aiSummary:
      "A balanced rooftop restaurant with a family-friendly rhythm. The AI notes a broad audience: families at lunch, couples at sunset, and groups at night.",
    aiHighlights: ["Best sunset tables book first", "The menu leans to comfort plus premium grills", "Frequently picked for birthdays"],
    seatingOptions: ["Indoor", "Outdoor", "Rooftop"],
    reviews: [
      { author: "Nilesh", rating: 5, comment: "We got a corner table and the view was fantastic.", visited: "4 days ago" },
      { author: "Shreya", rating: 4, comment: "Service is smooth and the menu is wide enough for families.", visited: "1 week ago" },
      { author: "Vivek", rating: 5, comment: "Perfect for a chill sunset dinner before heading to a match.", visited: "3 weeks ago" },
    ],
    menuSections: [
      {
        title: "Starters",
        items: [
          { name: "Peri Peri Paneer Tikka", description: "Charcoal finished", price: 380, badge: "Popular" },
          { name: "Lemon Herb Chicken", description: "Smoky and bright", price: 420 },
        ],
      },
      {
        title: "Grills",
        items: [
          { name: "Moonlight Grill Platter", description: "Veg & chicken assortment", price: 720, badge: "Chef's pick" },
          { name: "Sunset Fish Steak", description: "Herb butter, greens", price: 790 },
        ],
      },
      {
        title: "Sweet finish",
        items: [
          { name: "Caramel Sun Pudding", description: "Warm caramel sauce", price: 260 },
          { name: "Moon Dust Kulfi", description: "Pistachio, saffron", price: 220 },
        ],
      },
    ],
    similarKeys: ["ember-rooftop-kitchen", "lakehouse-social-club", "the-garden-table"],
    bankOffers: [
      { code: "SBI7", label: "SBI Dining Offer", description: "Up to 7% off, max ₹150" },
      { code: "ICICI8", label: "ICICI Bank Dining", description: "Up to 8% off, max ₹200" },
    ],
  },
];

const DEFAULT_META: DiningRestaurantMeta = {
  key: "bookyourvibe-dining",
  slug: "bookyourvibe-dining",
  name: "BookYourVibe Dining",
  cuisines: ["Multi-cuisine"],
  area: "Nearby",
  hero: svgCard("BookYourVibe Dining", "#052e16", "#14532d", "#f59e0b"),
  gallery: [
    svgCard("Dining Room", "#052e16", "#14532d", "#84cc16"),
    svgCard("Courtyard", "#1f2937", "#14532d", "#f59e0b"),
    svgCard("Chef's Table", "#111827", "#374151", "#fb7185"),
    svgCard("Terrace", "#312e81", "#4c1d95", "#c084fc"),
  ],
  rating: 4.5,
  reviewCount: 420,
  distanceKm: 2.7,
  costForTwo: 850,
  timings: "Open till 11:00 PM",
  features: ["Cafe", "Outdoor seating", "Family-friendly"],
  vibe: "Relaxed dine-in with a polished BookYourVibe feel",
  offers: ["Flat 10% off on pre-booking", "Earn cashback when you pay the bill"],
  aiSummary: "A balanced dining spot with a polished ambience and broad appeal.",
  aiHighlights: ["Best for casual plans", "Offers and seating make it ideal for groups", "Reliable for pre-bookings"],
  seatingOptions: ["Indoor", "Outdoor"],
  reviews: [
    { author: "Guest", rating: 5, comment: "Easy table booking and a relaxed atmosphere.", visited: "Recently" },
    { author: "Guest", rating: 4, comment: "Great for a quiet meal after a game.", visited: "Recently" },
  ],
  menuSections: [
    {
      title: "Chef picks",
      items: [
        { name: "Seasonal Platter", description: "Curated for the day", price: 450, badge: "Popular" },
        { name: "House Grill", description: "Balanced and filling", price: 520 },
      ],
    },
  ],
  similarKeys: ["aosa-bakehouse-roastery", "the-garden-table", "sun-moon-terrace"],
  bankOffers: [
    { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
  ],
};

function normalized(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function fallbackGallery(seed: string, index: number) {
  return [
    svgCard(`${seed} ${index + 1}`, "#0f172a", "#14532d", "#f59e0b"),
    svgCard(`${seed} ${index + 2}`, "#1f2937", "#7c2d12", "#38bdf8"),
    svgCard(`${seed} ${index + 3}`, "#312e81", "#0f766e", "#fb7185"),
  ];
}

/**
 * Slugs coming back from the API carry a 6-char id suffix — "marigold-rooftop-kitchen-a1b2c3" —
 * so match the bare slug and then the restaurant name before giving up on the default meta.
 */
function findMeta(slugKey: string, nameKey: string): DiningRestaurantMeta | undefined {
  const candidates = [slugKey, slugKey.replace(/-[0-9a-f]{6}$/, ""), nameKey].filter(Boolean);
  for (const candidate of candidates) {
    const hit = DINING_SPOTS.find((spot) => spot.key === candidate || spot.slug === candidate);
    if (hit) return hit;
  }
  return undefined;
}

export function getDiningMeta(outlet: Partial<FoodOutlet> & { name: string; slug?: string }, index = 0) {
  const key = outlet.slug ? normalized(outlet.slug) : normalized(outlet.name);
  const meta = findMeta(key, normalized(outlet.name)) ?? DEFAULT_META;
  const fallback = {
    ...meta,
    key,
    slug: outlet.slug ?? meta.slug,
    hero: meta.hero,
    gallery: meta.gallery.length > 0 ? meta.gallery : fallbackGallery(outlet.name, index),
    rating: outlet.kind === "dining" ? meta.rating : Math.max(4.1, meta.rating - 0.2),
    reviewCount: meta.reviewCount,
    distanceKm: Math.max(0.4, meta.distanceKm + index * 0.2),
    costForTwo: outlet.dineout?.costForTwo ?? meta.costForTwo,
    timings: meta.timings,
    features: meta.features,
    vibe: meta.vibe,
    offers: meta.offers,
    aiSummary: meta.aiSummary,
    aiHighlights: meta.aiHighlights,
    seatingOptions: meta.seatingOptions,
    reviews: meta.reviews,
    menuSections: meta.menuSections,
    similarKeys: meta.similarKeys,
    bankOffers: meta.bankOffers,
  } satisfies DiningRestaurantMeta;

  return {
    key,
    slug: outlet.slug ?? meta.slug,
    name: outlet.name,
    city: outlet.location?.city ?? "Udaipur",
    area: outlet.location?.area ?? outlet.location?.city ?? meta.area,
    cuisines: outlet.cuisines?.length ? outlet.cuisines : meta.cuisines,
    rating: outlet.kind === "dining" && typeof outlet.dineout?.costForTwo === "number" ? fallback.rating : fallback.rating,
    reviewCount: fallback.reviewCount,
    distanceKm: fallback.distanceKm,
    costForTwo: fallback.costForTwo,
    timings: fallback.timings,
    features: fallback.features,
    vibe: fallback.vibe,
    offers: fallback.offers,
    aiSummary: fallback.aiSummary,
    aiHighlights: fallback.aiHighlights,
    seatingOptions: fallback.seatingOptions,
    reviews: fallback.reviews,
    gallery: outlet.gallery?.length ? outlet.gallery : fallback.gallery,
    hero: outlet.poster || outlet.banner || fallback.hero,
    menuSections: fallback.menuSections,
    similarKeys: fallback.similarKeys,
    bankOffers: fallback.bankOffers,
  } satisfies DiningSpotView;
}

export function mapMenuToSections(menu: MenuItem[]): DiningMenuSection[] {
  if (menu.length === 0) return [];
  const grouped = new Map<string, DiningMenuSection["items"]>();
  for (const item of menu) {
    const bucket = grouped.get(item.category) ?? [];
    bucket.push({
      name: item.name,
      description: item.description,
      price: item.price,
      badge: item.priceVariants.length > 0 ? "Variants" : item.inStock ? undefined : "Sold out",
    });
    grouped.set(item.category, bucket);
  }
  return Array.from(grouped.entries()).map(([title, items]) => ({ title, items }));
}

export function getSimilarDiningSpots(view: DiningSpotView, allOutlets: Array<Partial<FoodOutlet> & { name: string; slug?: string }>) {
  const matches = allOutlets
    .map((outlet, index) => getDiningMeta(outlet, index))
    .filter((candidate) => candidate.slug !== view.slug)
    .filter((candidate) => candidate.city === view.city || candidate.cuisines.some((c) => view.cuisines.includes(c)));
  const fallback = DINING_SPOTS
    .filter((spot) => spot.slug !== view.slug)
    .map((spot) => getDiningMeta({ name: spot.name, slug: spot.slug, cuisines: spot.cuisines }, 0));
  const combined = [...matches, ...fallback];
  return combined.slice(0, 4);
}

