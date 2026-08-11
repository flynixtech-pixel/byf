import { Booking, Listing, SettledPayment, VendorRole } from "./types";

// NOTE: Ye sirf demo/mock data hai. Apne backend API se fetch karke
// yahan se replace kar dena (e.g. app/vendor/dashboard/page.tsx me
// fetch("/api/vendor/dashboard") jaisa call laga sakte ho).

// Offline-safe placeholder "photo" — a gradient SVG data URI so listing
// images render without needing real uploads or network access.
export function placeholderImage(seed: string, from: string, to: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#g)"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="34" fill="rgba(255,255,255,0.85)" text-anchor="middle" dominant-baseline="middle">${seed}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Vendor edits (price, images, description, etc.) have no backend yet, so we
// persist them to localStorage keyed by listing id and merge them on read.
// This keeps edits visible across pages/reloads within the same browser.
const LISTING_OVERRIDES_KEY = "byv-vendor-listing-overrides";

function loadListingOverrides(): Record<string, Partial<Listing>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LISTING_OVERRIDES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveListingOverride(id: string, patch: Partial<Listing>) {
  if (typeof window === "undefined") return;
  const all = loadListingOverrides();
  all[id] = { ...all[id], ...patch };
  window.localStorage.setItem(LISTING_OVERRIDES_KEY, JSON.stringify(all));
}

// New listings created in the Package Studio (there's no backend yet, so
// they live in localStorage alongside the seed listings above).
const NEW_LISTINGS_KEY = "byv-vendor-new-listings";

function loadNewListings(): Listing[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(NEW_LISTINGS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addNewListing(listing: Listing) {
  if (typeof window === "undefined") return;
  const all = loadNewListings();
  all.unshift(listing);
  window.localStorage.setItem(NEW_LISTINGS_KEY, JSON.stringify(all));
}

export function getListingsWithOverrides(): Listing[] {
  const overrides = loadListingOverrides();
  const seeded = listings.map((l) => (overrides[l.id] ? { ...l, ...overrides[l.id] } : l));
  const created = loadNewListings().map((l) => (overrides[l.id] ? { ...l, ...overrides[l.id] } : l));
  return [...created, ...seeded];
}

export const vendorProfile = {
  vendorName: "Aman Gupta",
  businessName: "Arena 11 Sports & Events",
  email: "hello@bookyourvibes.in",
  phone: "9876543210",
  businessCategory: "Turf, Games & Events",
  memberSince: "02 Jul 2026",
  approvedOn: "02 Jul 2026",
  city: "Jaipur",
  state: "Rajasthan",
};

export const listings: Listing[] = [
  {
    id: "byv-t1",
    title: "GreenTurf Box Cricket Arena",
    type: "Turf",
    categories: ["Box Cricket"],
    subCategories: [],
    price: 1200,
    listedOn: "28 Jun 2026",
    status: "Active",
    access: "Vendor Owned",
    city: "Jaipur",
    state: "Rajasthan",
    address: "Plot 14, Vaishali Nagar Sports Complex, Jaipur, Rajasthan 302021",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#4c1d95", "#7c3aed"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#312e81", "#4c1d95"), label: "Banner" },
    ],
    description:
      "A floodlit box cricket arena with premium artificial turf, perfect for evening matches with friends or corporate tournaments.",
    highlights: ["Floodlit turf", "Free parking", "Changing rooms", "Equipment on rent"],
    inclusions: ["Turf access for booked slot", "Basic cricket kit", "Drinking water"],
    exclusions: ["Personal gear", "Food & beverages", "Umpire (on request, extra charge)"],
    itinerary: [
      { day: 1, title: "Match Slot", description: "Arrive 10 minutes early, warm up, and play your booked slot." },
    ],
    faqs: [
      { question: "Is night play available?", answer: "Yes, the turf is floodlit and open till 11 PM." },
      { question: "Can I bring my own bat/ball?", answer: "Yes, you're welcome to bring your own equipment." },
    ],
    tags: ["cricket", "box cricket", "night-play"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 1200 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-28",
    availableTill: "2026-12-31",
    slotsPerDay: 10,
  },
  {
    id: "byv-t2",
    title: "SkyLine Football Turf",
    type: "Turf",
    categories: ["5-a-side Football"],
    subCategories: [],
    price: 1600,
    listedOn: "27 Jun 2026",
    status: "Active",
    access: "Vendor Owned",
    city: "Jaipur",
    state: "Rajasthan",
    address: "Tonk Road, near Mansarovar Metro, Jaipur, Rajasthan 302019",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#0f766e", "#14b8a6"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#134e4a", "#0f766e"), label: "Banner" },
    ],
    description:
      "Premium 5-a-side football turf with FIFA-grade artificial grass, ideal for weekend leagues and casual games.",
    highlights: ["FIFA-grade turf", "Covered seating", "Locker rooms", "On-site cafe"],
    inclusions: ["Turf access for booked slot", "Football (1 per team)", "Bibs/jerseys"],
    exclusions: ["Personal footwear", "Food & beverages"],
    itinerary: [
      { day: 1, title: "Match Slot", description: "Teams check in at the counter and play the booked 1-hour slot." },
    ],
    faqs: [
      { question: "How many players per team?", answer: "Up to 5 players per side, with 2 substitutes." },
      { question: "Do you provide studs on rent?", answer: "No, please bring your own turf shoes." },
    ],
    tags: ["football", "5-a-side", "weekend-league"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 1600 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-27",
    availableTill: "2026-12-31",
    slotsPerDay: 8,
  },
  {
    id: "byv-g1",
    title: "PS5 & Pool Lounge",
    type: "Game",
    categories: ["Indoor Gaming"],
    subCategories: [],
    price: 400,
    listedOn: "25 Jun 2026",
    status: "Active",
    access: "Vendor Owned",
    city: "Jaipur",
    state: "Rajasthan",
    address: "C-Scheme, near Central Park, Jaipur, Rajasthan 302001",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#9d174d", "#db2777"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#831843", "#9d174d"), label: "Banner" },
    ],
    description:
      "Chill indoor lounge with PS5 consoles and a pool table — great for hangouts, birthdays, or a quick gaming break.",
    highlights: ["4K PS5 setups", "Air-conditioned lounge", "Snacks available", "Group discounts"],
    inclusions: ["Console + controller access", "1 pool cue set"],
    exclusions: ["Food & beverages", "Additional controllers (extra charge)"],
    itinerary: [
      { day: 1, title: "Gaming Session", description: "Walk in, pick your console/table, and play your booked hour." },
    ],
    faqs: [
      { question: "Can we book for a group?", answer: "Yes, group bookings get a discount above 4 people." },
      { question: "What games are available?", answer: "FIFA, Call of Duty, GT7 and more — ask at the counter." },
    ],
    tags: ["gaming", "ps5", "pool"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 400 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-25",
    availableTill: "2026-12-31",
    slotsPerDay: 12,
  },
  {
    id: "byv-e1",
    title: "Friday Night Music Vibes",
    type: "Event",
    categories: ["Live Music"],
    subCategories: [],
    price: 499,
    listedOn: "24 Jun 2026",
    status: "Inactive",
    access: "Vendor Owned",
    city: "Jaipur",
    state: "Rajasthan",
    address: "Arena 11 Rooftop, Malviya Nagar, Jaipur, Rajasthan 302017",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#7c2d12", "#c2410c"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#78350f", "#7c2d12"), label: "Banner" },
    ],
    description:
      "A rooftop live music night featuring local bands, good food trucks, and great vibes to close out the week.",
    highlights: ["Live band performances", "Food truck lineup", "Rooftop seating", "Photo booth"],
    inclusions: ["Entry ticket", "Standing/lounge seating"],
    exclusions: ["Food & beverages", "Parking"],
    itinerary: [
      { day: 1, title: "Doors Open", description: "Gates open, DJ warm-up set begins." },
    ],
    faqs: [
      { question: "Is this event age-restricted?", answer: "Entry is for guests 18 years and above." },
      { question: "Is re-entry allowed?", answer: "Yes, with the same ticket wristband." },
    ],
    tags: ["live music", "rooftop", "friday-night"],
    priceTiers: [{ id: "tier-1", label: "Entry Ticket", amount: 499 }],
    bookingType: "Courses",
    availableFrom: "2026-06-27",
    availableTill: "2026-07-25",
    slotsPerDay: 150,
  },
];

export const bookings: Booking[] = [
  {
    orderId: "BYV-0207-9931-XZ",
    customer: "Aarav Mehta",
    phone: "9812345670",
    listing: "GreenTurf Box Cricket Arena",
    dateTime: "02/07/2026 | 07:00 PM",
    totalAmount: 1200,
    platformFee: 36,
    yourEarning: 1164,
    payment: "Cashfree (Online)",
    status: "Confirmed",
  },
  {
    orderId: "BYV-0207-4420-QT",
    customer: "Simran Kaur",
    phone: "9911223344",
    listing: "Friday Night Music Vibes",
    dateTime: "04/07/2026 | 08:30 PM",
    totalAmount: 998,
    platformFee: 30,
    yourEarning: 968,
    payment: "UPI",
    status: "Pending",
  },
  {
    orderId: "BYV-0107-1187-LK",
    customer: "Rohit Sharma",
    phone: "9090909090",
    listing: "PS5 & Pool Lounge",
    dateTime: "01/07/2026 | 05:00 PM",
    totalAmount: 800,
    platformFee: 24,
    yourEarning: 776,
    payment: "Cash (Offline)",
    status: "Completed",
  },
];

export const settledPayments: SettledPayment[] = [
  {
    date: "28/06/2026",
    listingName: "SkyLine Football Turf",
    orderId: "BYV-2806-7712-MN",
    totalAmount: 1600,
    platformFee: 48,
    yourEarning: 1552,
  },
];

export const vendorRoles: VendorRole[] = [
  {
    id: "role-1",
    roleName: "Front Desk Manager",
    holderName: "Kabir Singh",
    holderEmail: "kabir@bookyourvibes.in",
    holderPhone: "9876501234",
    status: "Active",
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      bookings: { view: true, create: true, edit: true, delete: false },
      listings: { view: true, create: false, edit: false, delete: false },
      earnings: { view: false, create: false, edit: false, delete: false },
      verification: { view: true, create: false, edit: true, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      membership: { view: false, create: false, edit: false, delete: false },
      menu: { view: false, create: false, edit: false, delete: false },
      foodOrders: { view: false, create: false, edit: false, delete: false },
      coaches: { view: false, create: false, edit: false, delete: false },
      tournaments: { view: false, create: false, edit: false, delete: false },
    },
  },
];

export const moduleMeta: {
  key: keyof typeof vendorRoles[number]["permissions"];
  label: string;
  description: string;
  toggles: ("view" | "create" | "edit" | "delete")[];
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Overview cards and daily operational summary.",
    toggles: ["view"],
  },
  {
    key: "bookings",
    label: "Bookings",
    description: "Handle upcoming and past bookings.",
    toggles: ["view", "create", "edit", "delete"],
  },
  {
    key: "listings",
    label: "Listings",
    description: "Create and manage turfs, games & events.",
    toggles: ["view", "create", "edit", "delete"],
  },
  {
    key: "earnings",
    label: "Earnings",
    description: "Payouts, reports, and financial snapshots.",
    toggles: ["view"],
  },
  {
    key: "verification",
    label: "Customer Verification",
    description: "Verify check-ins and booking authenticity.",
    toggles: ["view", "edit"],
  },
  {
    key: "settings",
    label: "Settings",
    description: "Business profile and account preferences.",
    toggles: ["view", "edit"],
  },
  {
    key: "membership",
    label: "Membership",
    description: "Membership plans, packages, and subscriber management.",
    toggles: ["view", "create", "edit", "delete"],
  },
  {
    key: "menu",
    label: "Menu",
    description: "Food menu items, pricing, and stock availability.",
    toggles: ["view", "create", "edit", "delete"],
  },
  {
    key: "foodOrders",
    label: "Food Orders",
    description: "Accept, prepare, and deliver incoming food orders.",
    toggles: ["view", "edit"],
  },
  {
    key: "coaches",
    label: "Coaches",
    description: "Add coaches, manage their coaching slots, and check in sessions.",
    toggles: ["view", "create", "edit", "delete"],
  },
  {
    key: "tournaments",
    label: "Tournaments",
    description: "Create tournaments, manage fixtures and results, and check in teams.",
    toggles: ["view", "create", "edit", "delete"],
  },
];
