import {
  Building2,
  Users,
  Zap,
  MapPin,
  Timer,
  Tag,
  GraduationCap,
  CreditCard,
  Trophy,
  Feather,
  Volleyball,
  Search,
  Calendar,
  Smartphone,
  Repeat,
  IdCard,
  Compass,
  CupSoda,
  Star,
  BarChart3,
  BrickWall,
  Footprints,
  Sandwich,
  Handshake,
} from "lucide-react";
import type { FooterLink, Sport } from "./types";

export const HERO_STATS = [
  { id: "venues", label: "Venues Listed", value: "500+", icon: Building2 },
  { id: "players", label: "Active Players", value: "50K+", icon: Users },
  { id: "bookings", label: "Bookings Daily", value: "1.2K+", icon: Zap },
  { id: "cities", label: "Cities Live", value: "15+", icon: MapPin },
];

export const SPORTS_CATALOG: Sport[] = [
  {
    id: "box-cricket",
    label: "Box Cricket",
    image: "/bat.png",
    alt: "Box cricket bat and ball",
    bubble: "from-amber-200 via-brand-100 to-amber-50",
  },
  {
    id: "football",
    label: "Football",
    image: "/football.png",
    alt: "Football",
    bubble: "from-slate-200 via-slate-50 to-white",
  },
  {
    id: "badminton",
    label: "Badminton",
    image: "/badminton.png",
    alt: "Badminton shuttlecock",
    bubble: "from-sky-200 via-blue-100 to-indigo-100",
  },
  {
    id: "pickleball",
    label: "Pickleball",
    image: "/pickball.png",
    alt: "Pickleball ball",
    bubble: "from-amber-200 via-yellow-100 to-amber-50",
  },
  {
    id: "cricket-nets",
    label: "Cricket Nets",
    image: "/nets.png",
    alt: "Cricket ball and net practice",
    bubble: "from-accent-200 via-red-100 to-accent-50",
  },
  {
    id: "tennis",
    label: "Tennis",
    image: "/tennis.png",
    alt: "Tennis racket and ball",
    bubble: "from-violet-200 via-indigo-100 to-blue-100",
  },
  {
    id: "table-tennis",
    label: "Table Tennis",
    image: "/tabletennis.png",
    alt: "Table tennis paddle and ball",
    bubble: "from-pink-200 via-accent-100 to-amber-50",
  },
];

export const HOW_IT_WORKS = [
  {
    id: "discover",
    title: "Find your game",
    desc: "Search by sport, area or venue name. Filter by price, rating and amenities in seconds.",
    icon: Search,
  },
  {
    id: "book",
    title: "Lock your slot",
    desc: "Pick a free slot on the live calendar and confirm — no double-booking, no back-and-forth calls.",
    icon: Calendar,
  },
  {
    id: "play",
    title: "Show up & scan",
    desc: "Flash your QR pass at the gate. You're checked in instantly, every time.",
    icon: Smartphone,
  },
  {
    id: "repeat",
    title: "Rate & repeat",
    desc: "Earn reward points, rate the venue, and rebook your favourites in one tap next time.",
    icon: Repeat,
  },
];

export const WHY_BYV = [
  { id: "realtime", title: "Real slots, real time", desc: "Calendars sync live across the app and the venue front desk — what you see is what's actually free.", icon: Timer },
  { id: "squad", title: "Squad booking", desc: "Invite friends, split the bill automatically, and stop chasing people on WhatsApp for their share.", icon: Users },
  { id: "deals", title: "Flash slot deals", desc: "Get notified when a nearby slot drops in price a few hours before kick-off.", icon: Tag },
  { id: "coach", title: "Book a coach", desc: "Browse verified coaches by sport and experience, and book a session right alongside your court.", icon: GraduationCap },
  { id: "wallet", title: "One wallet, every venue", desc: "Cashback, rewards and refunds land in a single wallet you can use anywhere on the platform.", icon: CreditCard },
  { id: "events", title: "Beyond sports", desc: "Marathons, fitness meets, even corporate offsites — host or join any event, not just a match.", icon: Trophy },
];

export const TESTIMONIALS = [
  {
    id: "t1",
    name: "Aman Sharma",
    role: "Badminton, Shobhagpura",
    quote:
      "Booking a court used to mean five phone calls. Now I lock a slot, invite my group, and we're playing in ten minutes.",
    icon: Feather,
  },
  {
    id: "t2",
    name: "Riya Verma",
    role: "Pickleball, Hiran Magri",
    quote:
      "Found a pickleball venue near me that I genuinely didn't know existed. The flash deal notification got me playing midweek for half price.",
    icon: Volleyball,
  },
  {
    id: "t3",
    name: "CA Yashank R.",
    role: "Venue Owner, Cricket Arena",
    quote:
      "The QR check-in pushing straight into my revenue dashboard means I stopped reconciling cash registers by hand every night.",
    icon: Building2,
  },
];

export const PLATFORM_SYSTEMS = [
  {
    id: "identity",
    title: "Identity & Access",
    icon: IdCard,
    desc: "Login, signup, OTP, role routing, and admin entry in one flow.",
  },
  {
    id: "discovery",
    title: "Venue & Discovery",
    icon: Compass,
    desc: "Search, filters, trending venues, sports catalog, and quick actions.",
  },
  {
    id: "booking",
    title: "Booking System",
    icon: Calendar,
    desc: "Live slot selection, venue detail drawer, favorites, and booking CTA.",
  },
  {
    id: "community",
    title: "Community & Coaching",
    icon: Users,
    desc: "Open matches, team building, and coach-ready placement hooks.",
  },
  {
    id: "fuel",
    title: "Food & Beverage",
    icon: CupSoda,
    desc: "Food ordering, counters, menu cards, and venue-side order handling.",
  },
  {
    id: "reputation",
    title: "Engagement & Reputation",
    icon: Star,
    desc: "Ratings, rewards, testimonials, milestones, and loyalty surfaces.",
  },
  {
    id: "insight",
    title: "Insight & Finance",
    icon: BarChart3,
    desc: "Wallet balance, activity snapshot, revenue cues, and admin visibility.",
  },
  {
    id: "data",
    title: "Shared Architecture",
    icon: BrickWall,
    desc: "Cross-cutting data, one source of truth, and role-aware UI patterns.",
  },
];

export const COMMERCE_PLANS = [
  {
    name: "Starter",
    price: "Free",
    note: "For players",
    bullets: ["Book and pay per slot", "Wallet + rewards", "Basic notifications"],
    accent: "from-slate-900 to-slate-700",
  },
  {
    name: "Venue Pro",
    price: "Custom",
    note: "For owners",
    bullets: ["Dynamic pricing", "Walk-in POS", "Revenue and booking analytics"],
    accent: "from-brand-500 to-accent-500",
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "For BYV operations",
    bullets: ["Multi-role admin", "Banner CMS", "Audit logs and cross-city rollouts"],
    accent: "from-emerald-600 to-teal-500",
  },
];

export const POS_TABS = [
  { id: "walkin", label: "Walk-ins", icon: Footprints },
  { id: "food", label: "Food Orders", icon: Sandwich },
  { id: "booking", label: "Booked Slots", icon: Calendar },
];

export const POS_ITEMS = [
  { name: "Cricket Net - 60 min", qty: 1, price: 600 },
  { name: "Bat Rental", qty: 2, price: 100 },
  { name: "Energy Drink", qty: 3, price: 90 },
];

export const BUILD_COST_NOTES = [
  "Frontend-only screens are complete in this single-file build.",
  "Backend integrations remain stubbed behind TODOs and toasts.",
  "Role-based UI is represented with modal flows and console previews.",
];

export const EXTENSION_CARDS = [
  { title: "Coach marketplace", desc: "Verified coaches, packages, and training slots." },
  { title: "Dynamic pricing", desc: "Peak-hour multipliers and flash-slot discounts." },
  { title: "Rewards engine", desc: "Loyalty points, referral bonuses, and wallet credits." },
  { title: "Venue kiosk", desc: "Self-service check-in and walk-in ticketing." },
];

// Step 1 of Quick Actions: user picks a game first.
export const QUICK_ACTION_GAMES = [
  { id: "box-cricket", label: "Cricket", image: "/bat.png" },
  { id: "football", label: "Football", image: "/football.png" },
  { id: "badminton", label: "Badminton", image: "/badminton.png" },
  { id: "pickleball", label: "Pickleball", image: "/pickball.png" },
  { id: "tennis", label: "Tennis", image: "/tennis.png" },
  { id: "running", label: "Running", icon: Footprints },
];

// Step 2 of Quick Actions: action to take for the chosen game.
export const QUICK_ACTION_TASKS = [
  { id: "venue", label: "Book a Venue", icon: Compass },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "challenge", label: "Challenge a Player", icon: Users },
  { id: "community", label: "Community", icon: Handshake },
  { id: "coaches", label: "Coaches", icon: GraduationCap },
];

export const HERO_IMAGES = ["/hero1.png", "/hero2.png", "/hero3.png", "/hero1.png", "/hero2.png"];
export const HERO_SLIDE_DURATION_MS = 3500;

export const FOOTER_COLUMNS: { title: string; items: FooterLink[] }[] = [
  {
    title: "Experiences",
    items: [
      { label: "Box Cricket", href: "/games" },
      { label: "Badminton", href: "/games" },
      { label: "Tournaments", href: "/tournaments" },
      { label: "Community", href: "/community" },
      { label: "Offers", href: "/offers" },
    ],
  },
  {
    title: "Destinations",
    items: [
      { label: "Udaipur", href: "/venues" },
      { label: "Games", href: "/games" },
      { label: "Venues", href: "/venues" },
      { label: "How It Works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Latest Blogs",
    items: [
      { label: "Why Book Slots", href: "/offers" },
      { label: "Play With Friends", href: "/community" },
      { label: "Venue Tips", href: "/venues" },
      { label: "Event Updates", href: "/tournaments" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/about-us" },
      { label: "Contact Us", href: "/contact-us" },
      { label: "Vendor Login", href: "/vendor/login" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-conditions" },
      { label: "Refund Policy", href: "/refund-policy" },
    ],
  },
];
