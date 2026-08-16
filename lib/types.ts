export type ListingType = "Turf" | "Game" | "Event";

export type ListingAccess = "Vendor Owned" | "Claimed from Admin";

export interface ListingImage {
  id: string;
  url: string;
  label: string;
}

export interface ListingFAQ {
  question: string;
  answer: string;
}

export interface ItineraryStop {
  day: number;
  title: string;
  description: string;
}

export interface PriceTier {
  id: string;
  label: string;
  amount: number;
}

export interface AddOn {
  id: string;
  label: string;
  price: number;
  image?: ListingImage;
  /** Sports/games this add-on belongs to. Empty/undefined = available for all games. */
  sports?: string[];
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  sports?: string[];
}

export type BookingType = "Recurring" | "Trips" | "Courses";

export interface TechnicalSpec {
  label: string;
  value: string;
  icon: string;
  color?: string;
}

import type { LastMinuteBoostRule } from "@/lib/lastMinBoost";

/** One bookable unit inside a venue — see `Court` in lib/api/types.ts. */
export interface Court {
  id: string;
  name: string;
  /** Sport labels this court hosts (matches what a booking sends). Empty = all. */
  sports: string[];
  /** Replaces the slot's hourly rate on this court. Undefined/null = inherit. */
  priceOverride?: number | null;
  /** Per-sport hourly rates, for a court hosting several games at different prices. */
  sportPrices?: { sport: string; price: number }[];
  /** Court photo shown at checkout — picked from the listing's own images. */
  image?: string;
  /** Surface/size line under the court name — "Outdoor · Synthetic · Full court". */
  surface?: string;
  active: boolean;
}

export interface Listing {
  id: string;
  slug?: string;
  title: string;
  type: ListingType;
  gameVenue?: "indoor" | "outdoor" | "both";
  categories: string[];
  subCategories: string[];
  alcoholAvailable?: boolean;
  customSports?: { id: string; name: string; venueType: string }[];
  /** Max players allowed per selected sport — Turf/Game listings only, one entry per category. */
  sportCapacities?: { category: string; maxPlayers: number }[];
  /** Bookable units in this venue — court 1, court 2... Empty = the venue is a single unit. */
  courts?: Court[];
  price: number;
  listedOn: string;
  status: "Active" | "Inactive";
  trending?: boolean;
  isPrivate?: boolean;
  access: ListingAccess;
  ownerName?: string;
  sharedWithVendors?: boolean;
  coverImage?: string;
  videoUrl?: string;
  posterImage?: ListingImage;
  bannerImage?: ListingImage;
  universalImages?: ListingImage[];
  images: ListingImage[];
  country?: string;
  city: string;
  state: string;
  cityMode?: "single" | "multiple";
  cities?: string[];
  address: string;
  startingPoint?: string;
  endingPoint?: string;
  reportingStartTime?: string;
  reportingEndTime?: string;
  description: string;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: ItineraryStop[];
  faqs: ListingFAQ[];
  tags: string[];
  priceTiers: PriceTier[];
  capacity?: number;
  addOns?: AddOn[];
  coupons?: Coupon[];
  bookingType: BookingType;
  availableFrom: string;
  availableTill: string;
  slotsPerDay: number;
  slotsList?: TurfSlot[];
  dailyRoutine?: boolean;
  dateOverrides?: DateOverride[];
  /** Last Minute Boost rules — see lib/lastMinBoost.ts. Empty until the vendor configures one. */
  lastMinBoosts?: LastMinuteBoostRule[];
  /** Mandatory partial payment rule configured by venue owner. */
  partialPayment?: {
    enabled: boolean;
    type: "percentage" | "fixed";
    value: number;
  };
  technicalSpecs?: TechnicalSpec[];
}

export interface TurfSlot {
  id?: string;
  startTime: string;
  endTime: string;
  label: string;
  price: number;
  strikePrice?: number;
  blocked?: boolean;
  blockedReason?: string;
  isClubSlot?: boolean;
  clubId?: string;
  slotIds?: string[];
  durationMinutes?: number;
  sport?: string;
  courtId?: string;
}

export interface DateOverride {
  date: string;
  isHoliday: boolean;
  holidayName: string;
  slots: TurfSlot[];
}

export type BookingStatus = "Confirmed" | "Pending" | "Cancelled" | "Completed" | "Part Paid";

export interface Booking {
  orderId: string;
  customer: string;
  phone: string;
  listing: string;
  sport?: string;
  /** Court booked within the venue — absent on bookings taken before courts existed.
   *  With several courts booked together this is the first of `courtIds`. */
  courtId?: string;
  /** Court name as it was at booking time. */
  courtName?: string;
  /** Every court this booking occupies — a player can take 2 of 3 courts for one hour. */
  courtIds?: string[];
  /** Court names as they were at booking time, aligned with `courtIds`. */
  courtNames?: string[];
  numberOfPlayers?: number;
  foodIncluded?: boolean;
  dateTime: string;
  totalAmount: number;
  paidAmount?: number;
  paymentType?: "partial" | "full";
  platformFee: number;
  yourEarning: number;
  payment: "Cashfree (Online)" | "Cash (Offline)" | "UPI";
  status: BookingStatus;
  paymentStatus?: string;
  createdAt?: string;
}

export interface SettledPayment {
  date: string;
  listingName: string;
  orderId: string;
  totalAmount: number;
  platformFee: number;
  yourEarning: number;
}

export type ModulePermissionKey =
  | "dashboard"
  | "bookings"
  | "listings"
  | "earnings"
  | "verification"
  | "settings"
  | "membership"
  | "menu"
  | "foodOrders"
  | "coaches"
  | "tournaments";

export interface RoleModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface VendorRole {
  id: string;
  roleName: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  status: "Active" | "Inactive";
  permissions: Record<ModulePermissionKey, RoleModulePermissions>;
}

/* -------------------------------------------------------------- */
/*  ADMIN PANEL                                                    */
/* -------------------------------------------------------------- */

export interface AdminSubUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
}

export interface AdminVendor {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  state: string;
  status: "approved" | "pending";
  approvedOn?: string;
  notifications: {
    email: boolean;
    whatsapp: boolean;
    offline: boolean;
  };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  content: string;
  status: "Published" | "Draft";
  publishedOn: string;
}

export type AdminBookingStatus = "confirmed" | "pending" | "cancelled";

export interface AdminBooking {
  bookingId: string;
  customer: string;
  email: string;
  listingName: string;
  eventDate: string;
  bookedOn: string;
  collected: number;
  b2bCharge: number;
  taxes: number;
  affiliateAmt: number;
  ownerAmount: number;
  status: AdminBookingStatus;
  payment: "completed" | "pending";
  isAffiliate?: boolean;
}

export interface PayoutCategory {
  id: string;
  name: string;
  letter: string;
  color: string;
  subtitle: string;
}

export interface PayoutVendorEntry {
  id: string;
  categoryId: string;
  vendorId: string;
  vendorName: string;
  type: "Standard" | "Affiliate";
  status: "Pending" | "Processing" | "Paid" | "Failed" | "Cancelled";
  amount: number;
  date: string;
  bookingsCount: number;
}

export interface AppVersionConfig {
  currentVersion: string;
  minRequiredVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
}

