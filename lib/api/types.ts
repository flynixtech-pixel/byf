export type ListingType = "Turf" | "Game" | "Event";
export type ListingStatus = "Active" | "Inactive";
export type ListingAccess = "Vendor Owned" | "Claimed from Admin";
export type BookingType = "Recurring" | "Trips" | "Courses";

export interface ListingImage {
  id: string;
  url: string;
  label: string;
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
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface TechnicalSpec {
  label: string;
  value: string;
  icon: string;
  color?: string;
}

export interface SportCapacity {
  category: string;
  maxPlayers: number;
}

export interface PartialPaymentConfig {
  enabled: boolean;
  type: "percentage" | "fixed";
  value: number;
}

export type { LastMinuteBoostRule } from "@/lib/lastMinBoost";
import type { LastMinuteBoostRule } from "@/lib/lastMinBoost";

/**
 * One bookable unit inside a venue — "Court 1", "Turf A". A listing with N courts
 * can sell the same time slot N times over.
 */
export interface Court {
  id: string;
  name: string;
  /** Sports this court hosts. Empty = every sport the listing offers. */
  sports: string[];
  /** Replaces the slot's hourly rate on this court. Undefined/null = inherit. */
  priceOverride?: number | null;
  /** Per-sport hourly rates, for a court that hosts several games at different prices. */
  sportPrices?: CourtSportPrice[];
  /** Court photo shown at checkout — picked from the listing's own images. */
  image?: string;
  /** Surface/size line under the court name — "Outdoor · Synthetic · Full court". */
  surface?: string;
  active: boolean;
}

/** One sport's hourly rate on a court hosting several games. */
export interface CourtSportPrice {
  sport: string;
  price: number;
}

export interface Listing {
  _id: string;
  slug?: string;
  title: string;
  type: ListingType;
  categories: string[];
  subCategories: string[];
  /** Max players allowed per selected sport — Turf/Game listings only, one entry per category. */
  sportCapacities?: SportCapacity[];
  /** Bookable units in this venue. Empty/absent = the venue itself is the only unit. */
  courts?: Court[];
  price: number;
  /** Ticket cap for type: "Event" listings — unused for Turf/Game. */
  capacity?: number;
  /** Present on the public detail response for type: "Event" listings with a capacity set. */
  spotsLeft?: number;
  status: ListingStatus;
  trending: boolean;
  isPrivate: boolean;
  access: ListingAccess;
  vendorId?: string | null;
  ownerName?: string;
  sharedWithVendors: boolean;
  coverImage?: string;
  posterImage?: ListingImage;
  bannerImage?: ListingImage;
  universalImages?: ListingImage[];
  images: ListingImage[];
  country?: string;
  city: string;
  state: string;
  cityMode: "single" | "multiple";
  cities: string[];
  address: string;
  startingPoint?: string;
  endingPoint?: string;
  reportingStartTime?: string;
  reportingEndTime?: string;
  description: string;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: ItineraryDay[];
  videoUrl: string;
  faqs: Faq[];
  tags: string[];
  priceTiers: PriceTier[];
  addOns: AddOn[];
  coupons: Coupon[];
  bookingType: BookingType;
  availableFrom: string;
  availableTill: string;
  slotsPerDay: number;
  rating?: number;
  reviewCount?: number;
  slotsList?: TurfSlot[];
  dailyRoutine?: boolean;
  dateOverrides?: DateOverride[];
  /** Last Minute Boost rules — see lib/lastMinBoost.ts. Empty until the vendor configures one. */
  lastMinBoosts?: LastMinuteBoostRule[];
  /** Mandatory partial payment rule configured by venue owner. */
  partialPayment?: PartialPaymentConfig;
  technicalSpecs?: TechnicalSpec[];
  createdAt: string;
  updatedAt: string;
}

export interface TurfSlot {
  id?: string;
  startTime: string;
  endTime: string;
  label: string;
  price: number;
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

export type PaymentMethod = "Cashfree (Online)" | "Cash (Offline)" | "UPI";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type BookingStatus = "Confirmed" | "Pending" | "Cancelled" | "Completed" | "Part Paid";

export interface Booking {
  _id: string;
  orderId: string;
  listingId: string;
  listingTitle?: string;
  vendorId: string;
  customerId?: string | null;
  customerName: string;
  phone: string;
  email?: string;
  sport?: string;
  duration?: string;
  durationMinutes?: number;
  /** Which court was booked. Absent on bookings taken before courts existed.
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
  taxes: number;
  affiliateAmount: number;
  vendorEarning: number;
  /** Set when a Last Minute Boost rule discounted this booking. */
  lastMinuteBoost?: {
    ruleId: string;
    discountPct: number;
    originalAmount: number;
    discountAmount: number;
  };
  payment: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentOrderId?: string;
  status: BookingStatus;
  bookingType?: "regular" | "club_together" | "offline";
  isAffiliate: boolean;
  cancellationReason?: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoachWeeklyDay {
  day: number; // 0 = Sunday … 6 = Saturday
  isOpen: boolean;
  startTime: string; // "HH:mm"
  endTime: string;
}

export interface CoachLeave {
  date: string;
  type: "full" | "half";
  reason?: string;
}

export interface CoachBatch {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: number[];
  capacity: number;
  priceMonthly: number;
  priceYearly: number;
  demoAvailable: boolean;
  active: boolean;
  /** How the vendor quotes this batch's price — informational; enrolment itself
   * is still always demo/monthly/yearly. */
  pricingMode?: "session" | "day" | "month";
  pricePerSession?: number;
  pricePerDay?: number;
  /** Present on the public coach detail response. */
  enrolled?: number;
  spotsLeft?: number;
}

export interface CoachLocation {
  address?: string;
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export interface Coach {
  _id: string;
  vendorId: string;
  /** Set when this academy was added from within a specific turf's "Add Turf" flow. */
  turfListingId?: string | null;
  slug?: string;
  name: string;
  category: string;
  categories: string[];
  subCategory?: string;
  phone?: string;
  email?: string;
  experienceYears?: number;
  fees?: number;
  bio?: string;
  photoUrl?: string;
  gallery: string[];
  status: "Active" | "Inactive";
  location: CoachLocation;
  weeklyAvailability: CoachWeeklyDay[];
  leaves: CoachLeave[];
  batches: CoachBatch[];
  /** Present on nearby (geo) browse responses. */
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export type CoachSubscriptionPlan = "demo" | "monthly" | "yearly";
export type CoachSubscriptionStatus = "Active" | "Cancelled" | "Expired";

export interface CoachSubscription {
  _id: string;
  orderId: string;
  coachId: string;
  vendorId: string;
  batchId: string;
  batchName: string;
  customerId?: string | null;
  customerName: string;
  phone: string;
  email?: string;
  plan: CoachSubscriptionPlan;
  amount: number;
  startDate: string;
  endDate?: string | null;
  payment: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentOrderId?: string;
  status: CoachSubscriptionStatus;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type TournamentStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
export type FixtureStatus = "Scheduled" | "Completed";

export interface TournamentFixture {
  id: string;
  round: string;
  teamAId: string;
  teamBId: string;
  scheduledAt: string;
  teamAScore?: number;
  teamBScore?: number;
  winnerTeamId?: string;
  status: FixtureStatus;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
}

export interface Tournament {
  _id: string;
  vendorId: string;
  title: string;
  category: string;
  subCategory?: string;
  description: string;
  city: string;
  state: string;
  address: string;
  entryFee: number;
  prizeMoney?: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxTeams?: number;
  registeredTeamsCount: number;
  status: TournamentStatus;
  fixtures: TournamentFixture[];
  spotsLeft?: number;
  leaderboard?: LeaderboardEntry[];
  createdAt: string;
  updatedAt: string;
}

export type TournamentRegistrationStatus = "Registered" | "Cancelled" | "Withdrawn";

export interface TournamentPlayer {
  name: string;
  phone?: string;
}

export interface TournamentRegistration {
  _id: string;
  orderId: string;
  tournamentId: string;
  vendorId: string;
  customerId?: string | null;
  teamName: string;
  captainName: string;
  captainPhone: string;
  captainEmail?: string;
  players: TournamentPlayer[];
  amount: number;
  payment: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentOrderId?: string;
  status: TournamentRegistrationStatus;
  cancellationReason?: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceVariant {
  label: string;
  price: number;
}

export interface MenuItem {
  _id: string;
  vendorId: string;
  outletId?: string;
  name: string;
  description?: string;
  /** Flat price, or "starting from" when priceVariants exist. */
  price: number;
  category: string;
  photo?: string;
  inStock: boolean;
  /** Overrides the outlet's per-category default when set. */
  prepTimeMins?: number;
  /** When non-empty, the customer must pick one when ordering. */
  priceVariants: PriceVariant[];
  /** Opt-in stock counting — off means the simple in/out toggle governs availability. */
  trackInventory: boolean;
  stockQty: number;
  lowStockThreshold: number;
  stockUnit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutletWeeklyDay {
  day: number; // 0 = Sunday … 6 = Saturday
  isOpen: boolean;
  startTime: string; // "HH:mm"
  endTime: string;
}

export interface OutletLeave {
  date: string;
  type: "full" | "half";
  reason?: string;
}

/** Owner-set default prep time for a menu category — drives the player's checkout ETA. */
export interface CategoryPrepTime {
  category: string;
  prepTimeMins: number;
}

export interface OutletFulfilment {
  preOrder: boolean;
  inVenue: boolean;
  postMatch: boolean;
  dineIn: boolean;
}

export interface OutletLocation {
  address?: string;
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export type FoodOutletKind = "dining" | "venue";

export interface FoodOutlet {
  _id: string;
  vendorId: string;
  slug?: string;
  name: string;
  kind: FoodOutletKind;
  offer?: string;
  description?: string;
  cuisines: string[];
  logo?: string;
  banner?: string;
  poster?: string;
  gallery: string[];
  location: OutletLocation;
  weeklyAvailability: OutletWeeklyDay[];
  leaves: OutletLeave[];
  /** Per-category prep-time defaults; drives the checkout ETA. */
  categoryPrepTimes: CategoryPrepTime[];
  /** Table booking + pay-bill settings. Used by "dining" outlets. */
  dineout: OutletDineout;
  /** Minutes added when the order is carried to a court or table. */
  serviceBufferMins: number;
  fulfilment: OutletFulfilment;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export type FoodOrderStatus = "Pending" | "Accepted" | "Rejected" | "Preparing" | "Ready" | "Delivered" | "Cancelled";

/** How the player wants the order served — or "Counter" for a walk-in billed on the POS. */
export type FoodOrderType = "PreOrder" | "InVenue" | "PostMatch" | "DineIn" | "Counter";

/** Where the order came from — the player app, or the owner's Billing Slide / POS. */
export type FoodOrderChannel = "app" | "pos";

export interface FoodOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  variantLabel?: string;
}

export interface FoodOrder {
  _id: string;
  orderId: string;
  vendorId: string;
  outletId?: string;
  /** Absent on counter (POS) bills, which have no logged-in player. */
  customerId?: string;
  customerName: string;
  phone: string;
  items: FoodOrderItem[];
  /** Billing breakdown. Optional because orders placed before GST billing shipped don't carry it. */
  subtotal?: number;
  taxAmount?: number;
  gstRate?: number;
  packagingFee?: number;
  totalAmount: number;
  status: FoodOrderStatus;
  orderType?: FoodOrderType;
  channel?: FoodOrderChannel;
  /** Prep + service ETA frozen at checkout, in minutes. */
  etaMins?: number;
  /** Pre-orders: when the player will arrive to collect. */
  scheduledFor?: string | null;
  /** Dine-in table, or the court an in-venue order goes to. */
  serveTo?: string;
  paymentMethod?: string;
  paymentStatus?: "Paid" | "Unpaid";
  billNo?: string;
  notes?: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Server-priced checkout preview: bill breakdown + the ETA shown before paying. */
export interface FoodOrderQuote {
  items: FoodOrderItem[];
  subtotal: number;
  gstRate: number;
  taxAmount: number;
  packagingFee: number;
  totalAmount: number;
  orderType: FoodOrderType;
  etaMins: number;
}

export interface FoodVendor {
  _id: string;
  businessName: string;
  ownerName: string;
  logo?: string;
  banner?: string;
  poster?: string;
  city?: string;
  state: string;
  categories: string[];
}

export interface FoodDashboardChartPoint {
  date: string;
  label: string;
  orders: number;
  revenue: number;
}

export interface FoodOrderSummary {
  orderId: string;
  customerName: string;
  items: FoodOrderItem[];
  totalAmount: number;
  status: FoodOrderStatus;
  orderType?: FoodOrderType;
  channel?: FoodOrderChannel;
  outletId?: string;
  createdAt: string;
}

export interface VendorFoodDashboard {
  period: "day" | "week" | "month" | "year";
  ordersByStatus: Partial<Record<FoodOrderStatus, number>>;
  totalRevenue: number;
  deliveredOrderCount: number;
  allTimeOrderCount: number;
  /** Takings rung up on the Billing Slide / POS, already included in totalRevenue. */
  counterRevenue: number;
  counterOrderCount: number;
  appRevenue: number;
  ordersByType: Partial<Record<FoodOrderType, number>>;
  chart: FoodDashboardChartPoint[];
  recentOrders: FoodOrderSummary[];
}

export interface EventBookingSummary {
  orderId?: string;
  customerName: string;
  listingTitle: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface EventsDashboardChartPoint {
  date: string;
  label: string;
  revenue: number;
  bookings: number;
}

export interface VendorEventsDashboard {
  tournamentsByStatus: Partial<Record<TournamentStatus, number>>;
  upcomingTournamentCount: number;
  upcomingEventCount: number;
  totalRevenue: number;
  bookingCount: number;
  registrationCount: number;
  checkedInCount: number;
  activeEventCount: number;
  chart: EventsDashboardChartPoint[];
  recentBookings: EventBookingSummary[];
}

export interface CoachDashboardChartPoint {
  date: string;
  label: string;
  enrolments: number;
  revenue: number;
}

export interface CoachSubscriptionSummary {
  orderId: string;
  customerName: string;
  batchName: string;
  plan: CoachSubscriptionPlan;
  amount: number;
  paymentStatus: PaymentStatus;
  status: CoachSubscriptionStatus;
  createdAt: string;
}

export interface VendorCoachesDashboard {
  activeCoachCount: number;
  coachCount: number;
  batchCount: number;
  subscriptionsByStatus: Partial<Record<CoachSubscriptionStatus, number>>;
  totalEarnings: number;
  subscriptionCount: number;
  chart: CoachDashboardChartPoint[];
  recentSubscriptions: CoachSubscriptionSummary[];
}

export type VendorStatus = "pending" | "approved" | "suspended";
export type VendorBusinessType = "Company" | "Individual / Proprietor" | "Partnership";
export type VendorBankAccountType = "Savings" | "Current";
/** Which side(s) of the platform this vendor operates — turf owner, events organizer, food & beverages, or coaches. */
export type VendorVertical = "turf" | "events" | "food" | "coaches";

export interface Vendor {
  _id: string;
  ownerName: string;
  businessName: string;
  email: string;
  phone: string;
  state: string;
  city?: string;
  verticals: VendorVertical[];
  status: VendorStatus;
  approvedOn?: string | null;
  notifications: { email: boolean; whatsapp: boolean; offline: boolean };
  logo?: string;
  banner?: string;
  poster?: string;
  businessType?: VendorBusinessType;
  gstNumber?: string;
  categories: string[];
  sports: string[];
  address: { street?: string; pinCode?: string; country?: string };
  bankDetails: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    accountType?: VendorBankAccountType;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VendorPopulated {
  _id: string;
  businessName: string;
  ownerName: string;
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
export type PermissionAction = "view" | "create" | "edit" | "delete";
export type PermissionsMap<K extends string> = Partial<Record<K, Record<PermissionAction, boolean>>>;

export interface VendorStaff {
  id: string;
  roleName: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  accountType: "staff" | "subadmin";
  status: "Active" | "Inactive";
  permissions: PermissionsMap<ModulePermissionKey>;
}

export type AdminModuleKey =
  | "dashboard"
  | "vendors"
  | "listings"
  | "bookings"
  | "payouts"
  | "blog"
  | "banners"
  | "marketing"
  | "categories"
  | "users"
  | "subAdmins"
  | "systemHealth"
  | "appVersion";

export interface AdminSubUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  permissions: PermissionsMap<AdminModuleKey>;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutCategory {
  _id: string;
  name: string;
  letter: string;
  color: string;
  subtitle: string;
  createdAt: string;
  updatedAt: string;
}

export type VendorPayoutStatus = "Pending" | "Processing" | "Paid" | "Failed" | "Cancelled";

export interface VendorPayout {
  _id: string;
  categoryId?: string | null;
  vendorId: VendorPopulated | string;
  type: "Standard" | "Affiliate";
  status: VendorPayoutStatus;
  amount: number;
  bookingsCount: number;
  bookingIds: string[];
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  content: string;
  status: "Published" | "Draft";
  publishedOn?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdBanner {
  _id: string;
  imageUrl: string;
  title?: string;
  linkUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppVersionConfig {
  _id: string;
  platform: "ios" | "android";
  currentVersion: string;
  minRequiredVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
  updatedAt: string;
}

export interface AdminDashboard {
  listingsCount: number;
  listingsGrowthPercent: number;
  bookingsCount: number;
  bookingsGrowthPercent: number;
  newUsers: number;
  usersGrowthPercent: number;
  vendorsByStatus: Partial<Record<VendorStatus, number>>;
  bookingsByStatus: Partial<Record<BookingStatus, number>>;
  revenue: { totalCollected: number; totalPlatformFee: number; totalVendorEarnings: number };
  listingsByState: { state: string; count: number }[];
  topCities: { city: string; state: string; count: number }[];
  recentBookings: {
    orderId: string;
    listingName: string;
    customerName: string;
    status: BookingStatus;
    dateTime: string;
  }[];
}

export interface SystemHealth {
  uptimeSeconds: number;
  memory: { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number };
  database: { state: string; host: string; name: string };
  nodeVersion: string;
  timestamp: string;
}

export interface VendorDashboard {
  listingsCount: number;
  activeListingsCount: number;
  bookingsByStatus: Partial<Record<BookingStatus, number>>;
  totalEarnings: number;
  settledBookingsCount: number;
}

export interface SettledPayment {
  date: string;
  listingName: string;
  orderId: string;
  payment: PaymentMethod;
  totalAmount: number;
  platformFee: number;
  yourEarning: number;
}

export type MembershipPlanType = "duration" | "sessions";

export interface Membership {
  _id: string;
  vendorId: string;
  /** Turf/listing this plan belongs to; unset = applies to all of the vendor's turfs. */
  listingId?: string;
  name: string;
  description?: string;
  planType: MembershipPlanType;
  price: number;
  durationDays?: number;
  sessionsIncluded?: number;
  turfDimensions?: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus = "active" | "expired" | "cancelled";

export interface Subscription {
  _id: string;
  vendorId: string;
  membershipId: { _id: string; name: string; planType: MembershipPlanType } | string;
  customerName: string;
  phone: string;
  amountPaid: number;
  startDate: string;
  endDate?: string | null;
  sessionsRemaining?: number;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export type HostedMatchStatus =
  | "Draft"
  | "Awaiting Host Payment"
  | "Open for Joining"
  | "Full"
  | "Completed"
  | "Cancelled";

export type ParticipantStatus =
  | "Pending Approval"
  | "Payment Pending"
  | "Confirmed"
  | "Rejected"
  | "Cancelled";

export interface HostedMatchParticipant {
  participantId: string;
  customerId?: string | null;
  name: string;
  phone?: string;
  email?: string;
  joinedAt: string;
  status: ParticipantStatus;
  paymentStatus: "pending" | "paid" | "failed";
  paymentOrderId?: string;
  amountPaid: number;
  approvalExpiresAt?: string;
}

export interface HostedMatch {
  _id: string;
  matchId: string;
  listingId: string | Listing;
  vendorId: string;
  hostCustomerId: string;
  hostName: string;
  hostPhone: string;
  hostEmail?: string;
  sport: string;
  date: string;
  dateTime: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  courtId?: string;
  courtName?: string;
  pricingType: "host_pays_all" | "split_cost";
  totalTurfCost: number;
  hostPaidAmount: number;
  entryFeePerPlayer: number;
  maxPlayers: number;
  bookingId?: string | null;
  hostPaymentOrderId?: string;
  hostPaymentStatus: "pending" | "paid" | "failed";
  status: HostedMatchStatus;
  participants: HostedMatchParticipant[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | "join_request"
  | "request_accepted"
  | "request_rejected"
  | "payment_confirmed"
  | "request_expired";

export interface CustomerNotification {
  _id: string;
  recipientCustomerId?: string | null;
  recipientPhone?: string;
  title: string;
  message: string;
  type: NotificationType;
  matchId?: string;
  participantId?: string;
  playerName?: string;
  playerAvatar?: string;
  sport?: string;
  turfName?: string;
  date?: string;
  timeSlot?: string;
  entryFee?: number;
  expiresAt?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ─── Dineout — table booking & pay-at-restaurant ────────────────── */

/** Table-booking and pay-bill settings on a "dining" outlet. */
export interface OutletDineout {
  tableBooking: boolean;
  payBill: boolean;
  /** Flat % off the bill for players paying through the app. */
  flatDiscountPct: number;
  slotMinutes: number;
  tablesPerSlot: number;
  maxPartySize: number;
  advanceDays: number;
  costForTwo?: number;
  autoConfirm: boolean;
  seatingOptions?: string[];
}

export type TableBookingStatus =
  | "Pending"
  | "Confirmed"
  | "Rejected"
  | "Seated"
  | "Completed"
  | "Cancelled"
  | "NoShow";

export interface TableBooking {
  _id: string;
  bookingId: string;
  vendorId: string;
  outletId: string;
  customerId: string;
  customerName: string;
  phone: string;
  /** ISO timestamp at midnight of the reservation day. */
  date: string;
  /** Slot start, "HH:mm". */
  slotTime: string;
  partySize: number;
  seatingPreference?: string;
  selectedOfferCode?: string;
  occasion?: string;
  specialRequests?: string;
  status: TableBookingStatus;
  rejectionReason?: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One bookable time slot for a given day. */
export interface BookingSlot {
  time: string;
  seatsLeft: number;
  available: boolean;
  reason?: string;
}

export interface BookingSlotsResponse {
  date: string;
  slots: BookingSlot[];
  closed: boolean;
  reason?: string;
}

/** Server-priced bill breakdown, shown before the player pays. */
export interface DiningBillQuote {
  outletId: string;
  outletName: string;
  billAmount: number;
  flatDiscountPct: number;
  flatDiscount: number;
  couponCode?: string;
  couponDiscount: number;
  bankOfferCode?: string;
  bankOfferDiscount?: number;
  walletAmount?: number;
  rewardPointsRedeemed?: number;
  cashbackEarned?: number;
  /** Set when a coupon was entered but couldn't be applied. */
  couponError?: string;
  convenienceFee: number;
  gstOnConvenienceFee: number;
  convenienceFeeTotal: number;
  tipAmount: number;
  payableAmount: number;
  totalSavings: number;
  restaurantNet: number;
}

export interface DiningBill {
  _id: string;
  billId: string;
  vendorId: string;
  outletId: string;
  customerId: string;
  customerName: string;
  phone: string;
  bookingId?: string;
  billAmount: number;
  flatDiscountPct: number;
  flatDiscount: number;
  couponCode?: string;
  couponDiscount: number;
  bankOfferCode?: string;
  bankOfferDiscount?: number;
  walletAmount?: number;
  rewardPointsRedeemed?: number;
  cashbackEarned?: number;
  convenienceFee: number;
  gstOnConvenienceFee: number;
  convenienceFeeTotal: number;
  tipAmount: number;
  payableAmount: number;
  restaurantNet: number;
  paymentMethod?: string;
  paymentStatus: "Paid" | "Failed" | "Pending";
  distanceMetres?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiningBillSummary {
  billId: string;
  customerName: string;
  billAmount: number;
  payableAmount: number;
  restaurantNet: number;
  outletId?: string;
  createdAt: string;
}

export interface VendorDineoutDashboard {
  period: "day" | "week" | "month" | "year";
  bookingsByStatus: Partial<Record<TableBookingStatus, number>>;
  todayBookingCount: number;
  /** Guests seated today across confirmed/seated/completed bookings. */
  todayCovers: number;
  /** What the restaurant keeps after the discounts it funded. */
  netRevenue: number;
  grossBilled: number;
  discountGiven: number;
  billCount: number;
  upcomingBookings: TableBooking[];
  recentBills: DiningBillSummary[];
}

