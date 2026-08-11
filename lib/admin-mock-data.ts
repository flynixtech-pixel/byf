import {
  AdminBooking,
  AdminSubUser,
  AdminVendor,
  AppVersionConfig,
  BlogPost,
  Listing,
  PayoutCategory,
  PayoutVendorEntry,
} from "./types";
import { listings as vendorListingsSeed, placeholderImage, vendorProfile } from "./mock-data";

const vendorListings: Listing[] = vendorListingsSeed.map((l) => ({
  ...l,
  ownerName: l.ownerName ?? vendorProfile.businessName,
}));

/* -------------------------------------------------------------- */
/*  ADMIN LISTINGS (platform-wide, across every vendor)             */
/* -------------------------------------------------------------- */

const EXTRA_ADMIN_LISTINGS: Listing[] = [
  {
    id: "byv-a1",
    title: "Padel Court Deck",
    type: "Turf",
    categories: ["Padel"],
    subCategories: ["Padel Court"],
    price: 1400,
    listedOn: "20 Jun 2026",
    status: "Active",
    trending: true,
    ownerName: "Vibe Padel Club",
    access: "Vendor Owned",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Fatehsagar Road, Udaipur, Rajasthan",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#0e7490", "#22d3ee"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#155e75", "#0e7490"), label: "Banner" },
    ],
    description: "Lakeview padel courts with pro coaching and rental gear.",
    highlights: ["Lake view courts", "Pro coaching available", "Rental rackets"],
    inclusions: ["Court access", "Rackets & balls"],
    exclusions: ["Coaching fee"],
    itinerary: [{ day: 1, title: "Match Slot", description: "Check in 10 minutes early." }],
    faqs: [{ question: "Is coaching included?", answer: "Coaching is available at extra cost." }],
    tags: ["padel", "udaipur", "lakeview"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 1400 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-20",
    availableTill: "2026-12-31",
    slotsPerDay: 8,
  },
  {
    id: "byv-a2",
    title: "Rooftop Badminton Courts",
    type: "Turf",
    categories: ["Badminton"],
    subCategories: ["Indoor Badminton"],
    price: 600,
    listedOn: "18 Jun 2026",
    status: "Active",
    ownerName: "Smash Badminton Academy",
    access: "Vendor Owned",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Hiran Magri Sector 4, Udaipur, Rajasthan",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#166534", "#22c55e"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#14532d", "#166534"), label: "Banner" },
    ],
    description: "Wooden-flooring badminton courts with evening floodlights.",
    highlights: ["Wooden flooring", "Floodlit courts", "Shuttle on rent"],
    inclusions: ["Court access", "Net & poles"],
    exclusions: ["Shuttlecocks"],
    itinerary: [{ day: 1, title: "Match Slot", description: "Arrive 10 minutes before your slot." }],
    faqs: [{ question: "Do you rent rackets?", answer: "Yes, rackets are available on rent." }],
    tags: ["badminton", "udaipur", "indoor"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 600 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-18",
    availableTill: "2026-12-31",
    slotsPerDay: 12,
  },
  {
    id: "byv-a3",
    title: "Lakeside Pickleball Courts",
    type: "Turf",
    categories: ["Pickleball"],
    subCategories: ["Outdoor Pickleball"],
    price: 700,
    listedOn: "15 Jun 2026",
    status: "Active",
    trending: true,
    ownerName: "Pickle Perfect",
    access: "Vendor Owned",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Badi Road, Udaipur, Rajasthan",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#a16207", "#facc15"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#854d0e", "#a16207"), label: "Banner" },
    ],
    description: "Freshly-lined outdoor pickleball courts by the lake.",
    highlights: ["Lakeside view", "Beginner-friendly", "Paddles on rent"],
    inclusions: ["Court access", "Paddles & balls"],
    exclusions: ["Coaching"],
    itinerary: [{ day: 1, title: "Match Slot", description: "Check in at the counter." }],
    faqs: [{ question: "Is this beginner friendly?", answer: "Yes, coaches are available for beginners." }],
    tags: ["pickleball", "udaipur", "lakeside"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 700 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-15",
    availableTill: "2026-12-31",
    slotsPerDay: 10,
  },
  {
    id: "byv-a4",
    title: "Table Tennis Arena",
    type: "Turf",
    categories: ["Table Tennis"],
    subCategories: ["Indoor TT"],
    price: 300,
    listedOn: "12 Jun 2026",
    status: "Active",
    ownerName: "TT Champions Club",
    access: "Vendor Owned",
    city: "Jodhpur",
    state: "Rajasthan",
    address: "Ratanada, Jodhpur, Rajasthan",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#7c2d12", "#f97316"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#7c2d12", "#c2410c"), label: "Banner" },
    ],
    description: "Tournament-grade table tennis tables with AC lounge.",
    highlights: ["Tournament tables", "Air-conditioned", "Group discounts"],
    inclusions: ["Table access", "Bats & balls"],
    exclusions: ["Coaching"],
    itinerary: [{ day: 1, title: "Game Slot", description: "Walk in and pick your table." }],
    faqs: [{ question: "Group bookings available?", answer: "Yes, for 4+ players." }],
    tags: ["table tennis", "jodhpur", "indoor"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 300 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-12",
    availableTill: "2026-12-31",
    slotsPerDay: 14,
  },
  {
    id: "byv-a5",
    title: "Ace Tennis Academy Courts",
    type: "Turf",
    categories: ["Tennis"],
    subCategories: ["Clay Court"],
    price: 900,
    listedOn: "10 Jun 2026",
    status: "Active",
    ownerName: "Ace Tennis Academy",
    access: "Vendor Owned",
    city: "Jodhpur",
    state: "Rajasthan",
    address: "Shastri Nagar, Jodhpur, Rajasthan",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#991b1b", "#ef4444"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#7f1d1d", "#991b1b"), label: "Banner" },
    ],
    description: "Clay-court tennis academy with professional coaching slots.",
    highlights: ["Clay courts", "Certified coaches", "Ball machine available"],
    inclusions: ["Court access", "Balls"],
    exclusions: ["Coaching fee", "Racket rental"],
    itinerary: [{ day: 1, title: "Court Slot", description: "Report 15 minutes before your slot." }],
    faqs: [{ question: "Is coaching mandatory?", answer: "No, court-only bookings are available." }],
    tags: ["tennis", "jodhpur", "clay-court"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 900 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-10",
    availableTill: "2026-12-31",
    slotsPerDay: 9,
  },
  {
    id: "byv-a6",
    title: "Night Cricket Nets",
    type: "Turf",
    categories: ["Cricket Nets"],
    subCategories: ["Practice Nets"],
    price: 500,
    listedOn: "08 Jun 2026",
    status: "Active",
    ownerName: "Nets & Vibes",
    access: "Vendor Owned",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Sector 14, Udaipur, Rajasthan",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#1e3a8a", "#3b82f6"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#1e3a8a", "#1d4ed8"), label: "Banner" },
    ],
    description: "Floodlit practice nets with bowling machine slots.",
    highlights: ["Bowling machine", "Floodlit", "Coaching on request"],
    inclusions: ["Net access", "Bat & pads"],
    exclusions: ["Bowling machine (extra charge)"],
    itinerary: [{ day: 1, title: "Practice Slot", description: "Pad up and warm up before your slot." }],
    faqs: [{ question: "Is bowling machine included?", answer: "Available at an extra charge." }],
    tags: ["cricket", "nets", "udaipur"],
    priceTiers: [{ id: "tier-1", label: "Per Hour", amount: 500 }],
    bookingType: "Recurring",
    availableFrom: "2026-06-08",
    availableTill: "2026-12-31",
    slotsPerDay: 10,
  },
  {
    id: "byv-a7",
    title: "Corporate Futsal League",
    type: "Event",
    categories: ["Futsal"],
    subCategories: ["Corporate League"],
    price: 3500,
    listedOn: "05 Jun 2026",
    status: "Active",
    trending: true,
    ownerName: "Futsal Union",
    access: "Vendor Owned",
    city: "Jaipur",
    state: "Rajasthan",
    address: "Vaishali Nagar, Jaipur, Rajasthan",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#134e4a", "#2dd4bf"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#134e4a", "#0d9488"), label: "Banner" },
    ],
    description: "6-week corporate futsal league with referees and trophies.",
    highlights: ["Referees included", "Trophies for winners", "Jersey printing"],
    inclusions: ["League entry", "Referee", "Match balls"],
    exclusions: ["Team jerseys"],
    itinerary: [{ day: 1, title: "Opening Match", description: "Team check-in and opening whistle." }],
    faqs: [{ question: "How many teams per league?", answer: "Up to 12 teams per season." }],
    tags: ["futsal", "corporate", "league"],
    priceTiers: [{ id: "tier-1", label: "Per Team (season)", amount: 3500 }],
    bookingType: "Courses",
    availableFrom: "2026-07-01",
    availableTill: "2026-08-15",
    slotsPerDay: 4,
  },
  {
    id: "byv-a8",
    title: "Weekend DJ Pool Party",
    type: "Event",
    categories: ["Live Music"],
    subCategories: ["Pool Party"],
    price: 899,
    listedOn: "02 Jun 2026",
    status: "Inactive",
    ownerName: "Splash Vibes",
    access: "Vendor Owned",
    city: "Jaipur",
    state: "Rajasthan",
    address: "Amer Road, Jaipur, Rajasthan",
    images: [
      { id: "img-1", url: placeholderImage("Poster", "#701a75", "#d946ef"), label: "Poster" },
      { id: "img-2", url: placeholderImage("Banner", "#581c87", "#701a75"), label: "Banner" },
    ],
    description: "Poolside DJ night with guest artists and food stalls.",
    highlights: ["Poolside DJ sets", "Food stalls", "Guest artist lineup"],
    inclusions: ["Entry ticket", "Pool access"],
    exclusions: ["Food & beverages"],
    itinerary: [{ day: 1, title: "Doors Open", description: "Gates open, DJ warm-up set begins." }],
    faqs: [{ question: "Is this age-restricted?", answer: "Entry is for guests 18 years and above." }],
    tags: ["pool party", "dj", "jaipur"],
    priceTiers: [{ id: "tier-1", label: "Entry Ticket", amount: 899 }],
    bookingType: "Trips",
    availableFrom: "2026-06-27",
    availableTill: "2026-07-25",
    slotsPerDay: 200,
  },
];

export const adminListingsSeed: Listing[] = [...vendorListings, ...EXTRA_ADMIN_LISTINGS];

const ADMIN_LISTING_OVERRIDES_KEY = "byv-admin-listing-overrides";
const ADMIN_NEW_LISTINGS_KEY = "byv-admin-new-listings";
const ADMIN_DELETED_LISTINGS_KEY = "byv-admin-deleted-listings";

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function saveAdminListingOverride(id: string, patch: Partial<Listing>) {
  const all = loadJson<Record<string, Partial<Listing>>>(ADMIN_LISTING_OVERRIDES_KEY, {});
  all[id] = { ...all[id], ...patch };
  saveJson(ADMIN_LISTING_OVERRIDES_KEY, all);
}

export function addAdminListing(listing: Listing) {
  const all = loadJson<Listing[]>(ADMIN_NEW_LISTINGS_KEY, []);
  all.unshift(listing);
  saveJson(ADMIN_NEW_LISTINGS_KEY, all);
}

export function cloneAdminListing(listing: Listing): Listing {
  const clone: Listing = {
    ...listing,
    id: `byv-clone-${Date.now()}`,
    title: `${listing.title} (Copy)`,
    status: "Inactive",
  };
  addAdminListing(clone);
  return clone;
}

export function deleteAdminListing(id: string) {
  const deleted = loadJson<string[]>(ADMIN_DELETED_LISTINGS_KEY, []);
  if (!deleted.includes(id)) {
    deleted.push(id);
    saveJson(ADMIN_DELETED_LISTINGS_KEY, deleted);
  }
}

export function getAdminListingsWithOverrides(): Listing[] {
  const overrides = loadJson<Record<string, Partial<Listing>>>(ADMIN_LISTING_OVERRIDES_KEY, {});
  const created = loadJson<Listing[]>(ADMIN_NEW_LISTINGS_KEY, []);
  const deleted = new Set(loadJson<string[]>(ADMIN_DELETED_LISTINGS_KEY, []));

  const apply = (l: Listing) => (overrides[l.id] ? { ...l, ...overrides[l.id] } : l);

  return [...created, ...adminListingsSeed]
    .filter((l) => !deleted.has(l.id))
    .map(apply);
}

/* -------------------------------------------------------------- */
/*  DASHBOARD                                                       */
/* -------------------------------------------------------------- */

export const dashboardStats = {
  totalListings: 208,
  totalListingsGrowth: 5.27,
  totalBookings: 471,
  totalBookingsGrowth: 5.27,
  newUsers: 466,
  activeUsersLast30Days: 235,
  totalUsers: 359,
  totalDownloads: 258,
  activeRegisteredUsers: 75,
  totalRegisteredUsers: 109,
  activeGuestUsers: 160,
  totalGuestUsers: 250,
  cities: 63,
  states: 20,
};

export const stateBreakdown = [
  { state: "All", count: 63 },
  { state: "Rajasthan", count: 34 },
  { state: "Gujarat", count: 12 },
  { state: "Maharashtra", count: 9 },
  { state: "Delhi", count: 4 },
  { state: "Karnataka", count: 2 },
  { state: "Punjab", count: 1 },
  { state: "Haryana", count: 1 },
];

export const topCities = [
  { city: "Udaipur", state: "Rajasthan", count: 39 },
  { city: "Jaipur", state: "Rajasthan", count: 21 },
  { city: "Jodhpur", state: "Rajasthan", count: 19 },
  { city: "Ahmedabad", state: "Gujarat", count: 15 },
];

/* -------------------------------------------------------------- */
/*  ADMIN SUB-USERS (Users page)                                    */
/* -------------------------------------------------------------- */

export const superAdminEmail = "superadmin@bookyourvibe.in";

export const adminSubUsersSeed: AdminSubUser[] = [
  { id: "au-1", name: "Rohit", email: "rohit.admin@bookyourvibe.in", role: "SUB_ADMIN", status: "Active" },
  { id: "au-2", name: "Jayesh", email: "jayesh.admin@bookyourvibe.in", role: "SUB_ADMIN", status: "Active" },
  { id: "au-3", name: "Prashant", email: "prashant.admin@bookyourvibe.in", role: "SUB_ADMIN", status: "Active" },
  { id: "au-4", name: "Sumanyu", email: "sumanyu.admin@bookyourvibe.in", role: "SUB_ADMIN", status: "Active" },
  { id: "au-5", name: "Priya IT", email: "it.manager@bookyourvibe.in", role: "IT MANAGER", status: "Active" },
  { id: "au-6", name: "Finance Role", email: "finance.role@bookyourvibe.in", role: "FINANCE ROLE", status: "Active" },
  { id: "au-7", name: "Finance", email: "finance@bookyourvibe.in", role: "FINANCE", status: "Active" },
  { id: "au-8", name: "Sneha Verma", email: "marketing@bookyourvibe.in", role: "MARKETING", status: "Active" },
  { id: "au-9", name: "Sales Admin", email: "sales.team@bookyourvibe.in", role: "SALES", status: "Active" },
  { id: "au-10", name: "Sales Manager", email: "sales@bookyourvibe.in", role: "SALES", status: "Active" },
];

const ADMIN_SUBUSERS_KEY = "byv-admin-subusers";

export function getAdminSubUsers(): AdminSubUser[] {
  return loadJson<AdminSubUser[]>(ADMIN_SUBUSERS_KEY, adminSubUsersSeed);
}

export function saveAdminSubUsers(users: AdminSubUser[]) {
  saveJson(ADMIN_SUBUSERS_KEY, users);
}

/* -------------------------------------------------------------- */
/*  VENDOR MANAGEMENT                                                */
/* -------------------------------------------------------------- */

export const adminVendorsSeed: AdminVendor[] = [
  {
    id: "vn-1",
    name: "Aman Gupta",
    businessName: "Arena 11 Sports & Events",
    email: "hello@bookyourvibes.in",
    phone: "9876543210",
    state: "Rajasthan",
    status: "approved",
    approvedOn: "02 Jul 2026",
    notifications: { email: true, whatsapp: true, offline: false },
  },
  {
    id: "vn-2",
    name: "Meera Joshi",
    businessName: "Vibe Padel Club",
    email: "meera@vibepadel.in",
    phone: "9812345670",
    state: "Rajasthan",
    status: "approved",
    approvedOn: "20 Jun 2026",
    notifications: { email: true, whatsapp: true, offline: false },
  },
  {
    id: "vn-3",
    name: "Kabir Shah",
    businessName: "Smash Badminton Academy",
    email: "kabir@smashbadminton.in",
    phone: "9823456781",
    state: "Rajasthan",
    status: "approved",
    approvedOn: "18 Jun 2026",
    notifications: { email: true, whatsapp: false, offline: false },
  },
  {
    id: "vn-4",
    name: "Naina Sharma",
    businessName: "Pickle Perfect",
    email: "naina@pickleperfect.in",
    phone: "9834567892",
    state: "Rajasthan",
    status: "pending",
    notifications: { email: false, whatsapp: false, offline: false },
  },
  {
    id: "vn-5",
    name: "Devansh Rao",
    businessName: "TT Champions Club",
    email: "devansh@ttchampions.in",
    phone: "9845678903",
    state: "Rajasthan",
    status: "approved",
    approvedOn: "12 Jun 2026",
    notifications: { email: true, whatsapp: true, offline: true },
  },
  {
    id: "vn-6",
    name: "Ritika Bansal",
    businessName: "Ace Tennis Academy",
    email: "ritika@acetennis.in",
    phone: "9856789014",
    state: "Rajasthan",
    status: "approved",
    approvedOn: "10 Jun 2026",
    notifications: { email: true, whatsapp: true, offline: false },
  },
  {
    id: "vn-7",
    name: "Yash Malhotra",
    businessName: "Futsal Union",
    email: "yash@futsalunion.in",
    phone: "9867890125",
    state: "Rajasthan",
    status: "approved",
    approvedOn: "05 Jun 2026",
    notifications: { email: true, whatsapp: false, offline: false },
  },
  {
    id: "vn-8",
    name: "Test Vendor",
    businessName: "test",
    email: "test@example.com",
    phone: "9000000000",
    state: "Rajasthan",
    status: "pending",
    notifications: { email: false, whatsapp: false, offline: false },
  },
];

const ADMIN_VENDORS_KEY = "byv-admin-vendors";

export function getAdminVendors(): AdminVendor[] {
  return loadJson<AdminVendor[]>(ADMIN_VENDORS_KEY, adminVendorsSeed);
}

export function saveAdminVendors(vendors: AdminVendor[]) {
  saveJson(ADMIN_VENDORS_KEY, vendors);
}

/* -------------------------------------------------------------- */
/*  ADVENTURE / VIBE BLOG                                            */
/* -------------------------------------------------------------- */

export const blogPostsSeed: BlogPost[] = [
  {
    id: "bp-1",
    title: "5 Turfs in Udaipur You Need to Book This Weekend",
    slug: "5-turfs-in-udaipur-you-need-to-book-this-weekend",
    thumbnail: placeholderImage("Turf Guide", "#ea580c", "#f97316"),
    content: "Udaipur's turf scene has exploded this year. Here are five box-cricket and football arenas worth booking this weekend...",
    status: "Published",
    publishedOn: "28 Jun 2026",
  },
  {
    id: "bp-2",
    title: "How to Host a Corporate Futsal League",
    slug: "how-to-host-a-corporate-futsal-league",
    thumbnail: placeholderImage("Futsal League", "#0f766e", "#2dd4bf"),
    content: "Planning an inter-team futsal league for your office? Here's a step-by-step guide to booking venues, referees and trophies...",
    status: "Published",
    publishedOn: "20 Jun 2026",
  },
  {
    id: "bp-3",
    title: "Padel 101: Everything First-Timers Should Know",
    slug: "padel-101-everything-first-timers-should-know",
    thumbnail: placeholderImage("Padel 101", "#0e7490", "#22d3ee"),
    content: "New to padel? We break down the rules, gear, and best courts in Rajasthan to try the sport for the first time...",
    status: "Published",
    publishedOn: "15 Jun 2026",
  },
];

const ADMIN_BLOG_KEY = "byv-admin-blog-posts";

export function getBlogPosts(): BlogPost[] {
  return loadJson<BlogPost[]>(ADMIN_BLOG_KEY, blogPostsSeed);
}

export function saveBlogPosts(posts: BlogPost[]) {
  saveJson(ADMIN_BLOG_KEY, posts);
}

/* -------------------------------------------------------------- */
/*  BOOKINGS MANAGEMENT                                             */
/* -------------------------------------------------------------- */

export const adminBookingsSeed: AdminBooking[] = [
  {
    bookingId: "BYV-0207-1848-A89A",
    customer: "Priyansh",
    email: "senpriyansh414@gmail.com",
    listingName: "Corporate Futsal League",
    eventDate: "19/07/2026",
    bookedOn: "03/07/2026",
    collected: 1.03,
    b2bCharge: 0,
    taxes: 0.03,
    affiliateAmt: 0,
    ownerAmount: 1,
    status: "confirmed",
    payment: "completed",
  },
  {
    bookingId: "BYV-0207-1751-DA92",
    customer: "Deepak Khandelwal",
    email: "khandelwaldeepak001@gmail.com",
    listingName: "Night Cricket Nets",
    eventDate: "05/07/2026",
    bookedOn: "02/07/2026",
    collected: 256.47,
    b2bCharge: 0,
    taxes: 7.47,
    affiliateAmt: 0,
    ownerAmount: 249,
    status: "confirmed",
    payment: "completed",
  },
  {
    bookingId: "BYV-0207-1539-1474",
    customer: "Bhavya Mishra",
    email: "mbhavya512@gmail.com",
    listingName: "Night Cricket Nets",
    eventDate: "05/07/2026",
    bookedOn: "02/07/2026",
    collected: 512.94,
    b2bCharge: 0,
    taxes: 14.94,
    affiliateAmt: 0,
    ownerAmount: 498,
    status: "confirmed",
    payment: "completed",
  },
  {
    bookingId: "BYV-0207-1348-A4A1",
    customer: "Sumanyu",
    email: "sumanyusinghr@gmail.com",
    listingName: "PS5 & Pool Lounge",
    eventDate: "03/07/2026",
    bookedOn: "02/07/2026",
    collected: 2.06,
    b2bCharge: 0,
    taxes: 0.06,
    affiliateAmt: 0,
    ownerAmount: 2,
    status: "confirmed",
    payment: "completed",
  },
  {
    bookingId: "BYV-0207-1014-29A4",
    customer: "Jayesh",
    email: "jaymalviya120@gmail.com",
    listingName: "Padel Court Deck",
    eventDate: "02/07/2026",
    bookedOn: "02/07/2026",
    collected: 2.06,
    b2bCharge: 0,
    taxes: 0.06,
    affiliateAmt: 0,
    ownerAmount: 2,
    status: "confirmed",
    payment: "completed",
  },
  {
    bookingId: "BYV-0207-1532-3EBB",
    customer: "Jayesh",
    email: "jaymalviya120@gmail.com",
    listingName: "Padel Court Deck",
    eventDate: "02/07/2026",
    bookedOn: "02/07/2026",
    collected: 2.06,
    b2bCharge: 0,
    taxes: 0.06,
    affiliateAmt: 0.2,
    ownerAmount: 1.8,
    status: "confirmed",
    payment: "completed",
    isAffiliate: true,
  },
  {
    bookingId: "BYV-0207-1514-F4AF",
    customer: "Jayesh",
    email: "jaymalviya120@gmail.com",
    listingName: "Padel Court Deck",
    eventDate: "02/07/2026",
    bookedOn: "02/07/2026",
    collected: 2.06,
    b2bCharge: 0,
    taxes: 0.06,
    affiliateAmt: 0.2,
    ownerAmount: 1.8,
    status: "pending",
    payment: "pending",
    isAffiliate: true,
  },
  {
    bookingId: "BYV-0207-1218-3515",
    customer: "Jayesh",
    email: "jayeshmalviya47@gmail.com",
    listingName: "Rooftop Badminton Courts",
    eventDate: "02/07/2026",
    bookedOn: "02/07/2026",
    collected: 16688.06,
    b2bCharge: 2700,
    taxes: 486.06,
    affiliateAmt: 1350.2,
    ownerAmount: 12151.8,
    status: "pending",
    payment: "pending",
    isAffiliate: true,
  },
];

export const bookingsStats = {
  total: 471,
  confirmed: 298,
  revenue: 120538.57,
  pending: 114,
};

/* -------------------------------------------------------------- */
/*  VENDOR PAYOUTS                                                   */
/* -------------------------------------------------------------- */

export const payoutCategoriesSeed: PayoutCategory[] = [
  { id: "pc-1", name: "Turf & Grounds", letter: "T", color: "bg-emerald-600", subtitle: "Box Cricket, Football, Futsal" },
  { id: "pc-2", name: "Racket Sports", letter: "R", color: "bg-sky-600", subtitle: "Badminton, Tennis, Table Tennis" },
  { id: "pc-3", name: "Padel & Pickleball", letter: "P", color: "bg-cyan-600", subtitle: "Padel, Pickleball" },
  { id: "pc-4", name: "Indoor Gaming", letter: "I", color: "bg-fuchsia-600", subtitle: "PS5, Pool, Arcade" },
  { id: "pc-5", name: "Events", letter: "E", color: "bg-purple-600", subtitle: "Live Music, Pool Parties" },
  { id: "pc-6", name: "Corporate Leagues", letter: "C", color: "bg-teal-600", subtitle: "Futsal, Cricket Leagues" },
  { id: "pc-7", name: "Kids & Parties", letter: "K", color: "bg-amber-600", subtitle: "Birthday Turf Parties" },
];

export const payoutVendorEntriesSeed: PayoutVendorEntry[] = [
  { id: "pv-1", categoryId: "pc-1", vendorId: "vn-1", vendorName: "Arena 11 Sports & Events", type: "Standard", status: "Paid", amount: 8528.13, date: "29 Jun 2026, 10:13 am", bookingsCount: 17 },
  { id: "pv-2", categoryId: "pc-1", vendorId: "vn-7", vendorName: "Futsal Union", type: "Standard", status: "Paid", amount: 21951.56, date: "29 Jun 2026, 10:12 am", bookingsCount: 33 },
  { id: "pv-3", categoryId: "pc-2", vendorId: "vn-3", vendorName: "Smash Badminton Academy", type: "Standard", status: "Paid", amount: 6893.23, date: "22 Jun 2026, 10:46 am", bookingsCount: 24 },
  { id: "pv-4", categoryId: "pc-2", vendorId: "vn-6", vendorName: "Ace Tennis Academy", type: "Standard", status: "Pending", amount: 770.89, date: "15 Jun 2026, 11:31 am", bookingsCount: 8 },
  { id: "pv-5", categoryId: "pc-3", vendorId: "vn-2", vendorName: "Vibe Padel Club", type: "Affiliate", status: "Paid", amount: 29100, date: "13 Jun 2026, 12:34 pm", bookingsCount: 88 },
  { id: "pv-6", categoryId: "pc-3", vendorId: "vn-4", vendorName: "Pickle Perfect", type: "Standard", status: "Processing", amount: 7223.13, date: "08 Jun 2026, 12:29 pm", bookingsCount: 24 },
  { id: "pv-7", categoryId: "pc-4", vendorId: "vn-1", vendorName: "Arena 11 Sports & Events", type: "Standard", status: "Paid", amount: 2790.58, date: "02 Jun 2026, 08:15 am", bookingsCount: 14 },
  { id: "pv-8", categoryId: "pc-5", vendorId: "vn-1", vendorName: "Arena 11 Sports & Events", type: "Affiliate", status: "Paid", amount: 1197, date: "01 Jun 2026, 11:53 am", bookingsCount: 2 },
];

export const payoutBookingsByVendor: Record<string, AdminBooking[]> = {
  "vn-1": adminBookingsSeed.filter((b) => b.listingName === "Night Cricket Nets" || b.listingName === "PS5 & Pool Lounge"),
  "vn-2": adminBookingsSeed.filter((b) => b.listingName === "Padel Court Deck"),
  "vn-7": adminBookingsSeed.filter((b) => b.listingName === "Corporate Futsal League"),
};

/* -------------------------------------------------------------- */
/*  APP VERSION                                                      */
/* -------------------------------------------------------------- */

export const appVersionSeed: { ios: AppVersionConfig; android: AppVersionConfig } = {
  ios: {
    currentVersion: "1.0.1",
    minRequiredVersion: "1.0.1",
    downloadUrl: "https://apps.apple.com/app/bookyourvibe",
    releaseNotes: "Bug fixes and performance improvements\n- Fixed crash on login\n- Improved image loading speed",
    forceUpdate: false,
  },
  android: {
    currentVersion: "1.0.24",
    minRequiredVersion: "1.0.21",
    downloadUrl: "https://play.google.com/store/apps/details?id=com.bookyourvibe",
    releaseNotes: "Bug fixes and performance improvements\n- Fixed crash on login\n- Improved image loading speed",
    forceUpdate: false,
  },
};

const APP_VERSION_KEY = "byv-admin-app-version";

export function getAppVersionConfig(): { ios: AppVersionConfig; android: AppVersionConfig } {
  return loadJson(APP_VERSION_KEY, appVersionSeed);
}

export function saveAppVersionConfig(config: { ios: AppVersionConfig; android: AppVersionConfig }) {
  saveJson(APP_VERSION_KEY, config);
}

/* -------------------------------------------------------------- */
/*  SYSTEM HEALTH (static mock snapshot)                             */
/* -------------------------------------------------------------- */

export const systemHealthSnapshot = {
  serviceName: "bookyourvibe-services",
  baseUrl: "https://bookyourvibe-services.vercel.app",
  timestamp: new Date().toLocaleString("en-GB"),
  status: "OK" as const,
  avgResponseTime: 692,
  fastestEndpoint: { name: "Version Info", ms: 629 },
  slowestEndpoint: { name: "Health Check", ms: 755 },
  slowApisOver1000ms: 0,
  endpoints: [
    {
      name: "Health Check",
      url: "https://bookyourvibe-services.vercel.app/health",
      statusCode: 200,
      ms: 755,
      response: {
        status: "healthy",
        server: { activeRequests: 1, avgResponseTime: "7ms", totalRequests: 1, errorCount: 0, memoryUsage: "41MB" },
        queue: { pending: 0, active: 0, maxConcurrent: 15 },
      },
    },
    {
      name: "Version Info",
      url: "https://bookyourvibe-services.vercel.app/api/version/latest?platform=android",
      statusCode: 200,
      ms: 629,
      response: {
        success: true,
        data: { currentVersion: appVersionSeed.android.currentVersion },
      },
    },
  ],
};
