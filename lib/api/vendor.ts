import { apiRequest, buildApiUrl, getAccessToken, uploadRequest, type Paginated } from "./client";
import type {
  Booking,
  BookingStatus,
  Coach,
  CoachSubscription,
  CoachSubscriptionStatus,
  CoachWeeklyDay,
  CategoryPrepTime,
  DiningBill,
  OutletDineout,
  TableBooking,
  TableBookingStatus,
  VendorDineoutDashboard,
  FoodOrder,
  FoodOrderStatus,
  FoodOrderType,
  FoodOutlet,
  OutletFulfilment,
  Listing,
  ListingType,
  Membership,
  MembershipPlanType,
  MenuItem,
  OutletWeeklyDay,
  PriceVariant,
  ModulePermissionKey,
  PermissionsMap,
  SettledPayment,
  Subscription,
  SubscriptionStatus,
  Tournament,
  TournamentRegistration,
  TournamentRegistrationStatus,
  TournamentStatus,
  Vendor,
  VendorCoachesDashboard,
  VendorDashboard,
  VendorEventsDashboard,
  EventBookingSummary,
  VendorFoodDashboard,
  VendorStaff,
  VendorVertical,
} from "./types";

const AUD = "vendor" as const;

export interface AiParsedEventData {
  title: string;
  category: "Party" | "DJ Night" | "Conference" | "Tournament" | "Live Performance" | "Cultural Event" | "Other";
  venue: string;
  price: number;
  capacity: number;
  date: string;
  startTime: string;
  endTime: string;
  tagline: string;
  durationMs?: number;
  source?: string;
}

export function parseEventPromptWithAi(prompt: string) {
  return apiRequest<AiParsedEventData>("/vendor/ai/parse-event-prompt", {
    audience: AUD,
    method: "POST",
    body: { prompt },
  });
}

export function suggestEventNamesWithAi(params: { category?: string; venue?: string; keyword?: string; type?: string }) {
  return apiRequest<string[]>("/vendor/ai/suggest-names", {
    audience: AUD,
    method: "POST",
    body: params,
  });
}

export interface SuggestedAddOnItem {
  label: string;
  price: number;
}

export function suggestAddOnsWithAi(params: { category?: string; eventTitle?: string; venue?: string; type?: string }) {
  return apiRequest<SuggestedAddOnItem[]>("/vendor/ai/suggest-addons", {
    audience: AUD,
    method: "POST",
    body: params,
  });
}

export interface GeneratedLaunchDetails {
  description: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  tags: string[];
  faqs: Array<{ question: string; answer: string }>;
  source?: string;
}

export function generateLaunchDetailsWithAi(params: { eventTitle: string; category?: string; venue?: string; type?: string }) {
  return apiRequest<GeneratedLaunchDetails>("/vendor/ai/generate-launch-details", {
    audience: AUD,
    method: "POST",
    body: params,
  });
}

export interface VendorPackageAiResponse {
  packageName: string;
  description: string;
  duration: number;
  price: number;
  benefits: string[];
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  faqs: Array<{ question: string; answer: string }>;
  source?: string;
}

export function generateVendorPackageWithAi(params: {
  prompt?: string;
  packageName?: string;
  category?: string;
  type?: string;
  price?: number;
  duration?: number;
}) {
  return apiRequest<VendorPackageAiResponse>("/vendor/ai/vendor-package", {
    audience: AUD,
    method: "POST",
    body: params,
  });
}

/* ---- Dashboard ---- */

export function getVendorDashboard() {
  return apiRequest<VendorDashboard>("/vendor/dashboard", { audience: AUD });
}

export function getVendorSettledPayments() {
  return apiRequest<SettledPayment[]>("/vendor/dashboard/settled-payments", { audience: AUD });
}

export async function exportVendorBookings() {
  const token = getAccessToken("vendor");
  const response = await fetch(buildApiUrl("/vendor/bookings/export"), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to export bookings");
  }

  await downloadBlob(await response.blob(), "bookings_report.xlsx");
}

/* ---- Profile ---- */

export function getVendorProfile() {
  return apiRequest<Vendor>("/vendor/profile", { audience: AUD });
}

export interface UpdateVendorProfileInput {
  ownerName?: string;
  businessName?: string;
  city?: string;
  state?: string;
  notifications?: Partial<{ email: boolean; whatsapp: boolean; offline: boolean }>;
  logo?: string;
  banner?: string;
  poster?: string;
  businessType?: Vendor["businessType"];
  gstNumber?: string;
  categories?: string[];
  sports?: string[];
  address?: Partial<Vendor["address"]>;
  bankDetails?: Partial<Vendor["bankDetails"]>;
}

export function updateVendorProfile(input: UpdateVendorProfileInput) {
  return apiRequest<Vendor>("/vendor/profile", { method: "PATCH", body: input, audience: AUD });
}

/** Switch on another business line (coaching, events, food) on an existing account.
 * Add-only by design — turning one off would strand its listings/bookings. */
export function addVendorVerticals(verticals: VendorVertical[]) {
  return apiRequest<Vendor>("/vendor/profile/verticals", { method: "POST", body: { verticals }, audience: AUD });
}

/* ---- Dashboard ---- */

export interface FinancialPeriodStat {
  bookings: number;
  avgRate: number;
}

export interface VendorDashboardStats {
  listingsCount: number;
  activeListingsCount: number;
  bookingsByStatus: Record<string, number>;
  totalEarnings: number;
  earningsTrend: number;
  settledBookingsCount: number;
  bookingsTrend: number;
  customersCount: number;
  customersTrend: number;
  occupancyRate: number;
  occupancyTrend: number;
  financialReport: {
    today: FinancialPeriodStat;
    weekdays: FinancialPeriodStat;
    weekend: FinancialPeriodStat;
    thisMonth: FinancialPeriodStat;
    totalYtd: FinancialPeriodStat;
  };
  revenueTrend: Array<{ date: string; earnings: number; bookings: number }>;
  courtStatus: Array<{ listingId: string; title: string; bookings: number }>;
  peakHourToday: string | null;
  bookingsToday: number;
}

export function getVendorDashboardStats(params?: { startDate?: string; endDate?: string; compareWith?: string; listingId?: string; sport?: string }) {
  const cleaned = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ""));
  const query = Object.keys(cleaned).length ? "?" + new URLSearchParams(cleaned as Record<string, string>).toString() : "";
  return apiRequest<VendorDashboardStats>(`/vendor/dashboard${query}`, { audience: AUD });
}

/* ---- Staff ---- */

export function listVendorStaff() {
  return apiRequest<VendorStaff[]>("/vendor/staff", { audience: AUD });
}

export interface CreateVendorStaffInput {
  roleName: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  accountType: "staff" | "subadmin";
  password: string;
  permissions: PermissionsMap<ModulePermissionKey>;
}

export function createVendorStaff(input: CreateVendorStaffInput) {
  return apiRequest<VendorStaff>("/vendor/staff", { method: "POST", body: input, audience: AUD });
}

export interface UpdateVendorStaffInput {
  roleName?: string;
  holderName?: string;
  holderPhone?: string;
  accountType?: "staff" | "subadmin";
  status?: "Active" | "Inactive";
  permissions?: PermissionsMap<ModulePermissionKey>;
}

export function updateVendorStaff(id: string, input: UpdateVendorStaffInput) {
  return apiRequest<VendorStaff>(`/vendor/staff/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteVendorStaff(id: string) {
  return apiRequest<null>(`/vendor/staff/${id}`, { method: "DELETE", audience: AUD });
}

/* ---- Listings ---- */

export type ListingInput = Partial<
  Omit<Listing, "_id" | "createdAt" | "updatedAt" | "access" | "vendorId" | "sharedWithVendors">
> & {
  title: string;
  type: ListingType;
  categories: string[];
  price: number;
  city: string;
  state: string;
  address: string;
  description: string;
  availableFrom: string;
  availableTill: string;
  slotsPerDay: number;
};

export function getVendorListings(params: { type?: ListingType; search?: string } = {}) {
  return apiRequest<Listing[]>("/vendor/listings", { query: params, audience: AUD });
}

export function getVendorListingById(id: string) {
  return apiRequest<Listing>(`/vendor/listings/${id}`, { audience: AUD });
}

export function createVendorListing(input: ListingInput) {
  return apiRequest<Listing>("/vendor/listings", { method: "POST", body: input, audience: AUD });
}

export function updateVendorListing(id: string, input: Partial<ListingInput>) {
  return apiRequest<Listing>(`/vendor/listings/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteVendorListing(id: string) {
  return apiRequest<null>(`/vendor/listings/${id}`, { method: "DELETE", audience: AUD });
}

/* ---- Bookings ---- */

export function getVendorBookings(params: { status?: BookingStatus; page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<Booking>>("/vendor/bookings", { query: params, audience: AUD });
}

export interface CreateVendorBookingInput {
  listingId: string;
  customerName?: string;
  phone?: string;
  /** Sport the slot is booked for (manual/walk-in bookings). */
  sport?: string;
  /** Court inside the venue. Omit to let the backend prefer a free one. */
  courtId?: string;
  courtIds?: string[];
  /** How many players are coming (manual/walk-in bookings). */
  numberOfPlayers?: number;
  /** Whether food & beverage is included with the booking. */
  foodIncluded?: boolean;
  dateTime: string;
  /** Slot end as "HH:mm". */
  endTime?: string;
  bookingType?: "regular" | "club_together" | "offline";
  totalAmount: number;
  paidAmount?: number;
  payment?: Booking["payment"];
  status?: BookingStatus;
}

export function createVendorBooking(input: CreateVendorBookingInput) {
  return apiRequest<Booking>("/vendor/bookings", { method: "POST", body: input, audience: AUD });
}

export function getVendorBookingByOrderId(orderId: string) {
  return apiRequest<Booking>(`/vendor/bookings/${orderId}`, { audience: AUD });
}

export function updateVendorBookingStatus(orderId: string, status: BookingStatus, cancellationReason?: string) {
  return apiRequest<Booking>(`/vendor/bookings/${orderId}/status`, {
    method: "PATCH",
    body: { status, cancellationReason },
    audience: AUD,
  });
}

/* ---- Coaches ---- */

export function listVendorCoaches(params: { status?: "Active" | "Inactive"; page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<Coach>>("/vendor/coaches", { query: params, audience: AUD });
}

export function getVendorCoachById(id: string) {
  return apiRequest<Coach>(`/vendor/coaches/${id}`, { audience: AUD });
}

export interface CoachLocationInput {
  address?: string;
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export interface CreateCoachInput {
  name: string;
  category: string;
  categories?: string[];
  subCategory?: string;
  phone?: string;
  email?: string;
  experienceYears?: number;
  fees?: number;
  bio?: string;
  photoUrl?: string;
  gallery?: string[];
  status?: "Active" | "Inactive";
  location?: CoachLocationInput;
  /** Set when this academy is being added from within a turf's "Add Turf" flow. */
  turfListingId?: string;
  /** Slots/batches to create together with the coach in one save. */
  batches?: CoachBatchInput[];
}

export function createCoach(input: CreateCoachInput) {
  return apiRequest<Coach>("/vendor/coaches", { method: "POST", body: input, audience: AUD });
}

/** Add an academy to a specific turf — unlike createCoach, this works for a Turf-only
 * vendor who hasn't separately registered for the Coaches vertical (it grants that
 * vertical automatically), which is what lets "Add Turf" offer this inline. */
export function addAcademyToListing(listingId: string, input: Omit<CreateCoachInput, "turfListingId">) {
  return apiRequest<Coach>(`/vendor/listings/${listingId}/academy`, { method: "POST", body: input, audience: AUD });
}

export function updateCoach(id: string, input: Partial<CreateCoachInput>) {
  return apiRequest<Coach>(`/vendor/coaches/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteCoach(id: string) {
  return apiRequest<null>(`/vendor/coaches/${id}`, { method: "DELETE", audience: AUD });
}

/* Weekly availability */
export function setCoachAvailability(coachId: string, days: CoachWeeklyDay[]) {
  return apiRequest<Coach>(`/vendor/coaches/${coachId}/availability`, { method: "PUT", body: { days }, audience: AUD });
}

/* Batches */
export interface CoachBatchInput {
  name: string;
  startTime: string;
  endTime: string;
  days: number[];
  capacity: number;
  priceMonthly: number;
  priceYearly: number;
  demoAvailable?: boolean;
  active?: boolean;
  pricingMode?: "session" | "day" | "month";
  pricePerSession?: number;
  pricePerDay?: number;
}

export function addCoachBatch(coachId: string, input: CoachBatchInput) {
  return apiRequest<Coach>(`/vendor/coaches/${coachId}/batches`, { method: "POST", body: input, audience: AUD });
}

export function updateCoachBatch(coachId: string, batchId: string, input: Partial<CoachBatchInput>) {
  return apiRequest<Coach>(`/vendor/coaches/${coachId}/batches/${batchId}`, { method: "PUT", body: input, audience: AUD });
}

export function removeCoachBatch(coachId: string, batchId: string) {
  return apiRequest<Coach>(`/vendor/coaches/${coachId}/batches/${batchId}`, { method: "DELETE", audience: AUD });
}

/* Leaves (emergency / one-off holidays) */
export function addCoachLeave(coachId: string, input: { date: string; type?: "full" | "half"; reason?: string }) {
  return apiRequest<Coach>(`/vendor/coaches/${coachId}/leaves`, { method: "POST", body: input, audience: AUD });
}

export function removeCoachLeave(coachId: string, isoDate: string) {
  return apiRequest<Coach>(`/vendor/coaches/${coachId}/leaves/${encodeURIComponent(isoDate)}`, {
    method: "DELETE",
    audience: AUD,
  });
}

/* Subscriptions (enrolled students) */
export function listVendorCoachSubscriptions(
  params: { status?: CoachSubscriptionStatus; coachId?: string; page?: number; limit?: number } = {}
) {
  return apiRequest<Paginated<CoachSubscription>>("/vendor/coaches/subscriptions", { query: params, audience: AUD });
}

/* ---- Tournaments ---- */

export function listVendorTournaments(params: { status?: TournamentStatus; page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<Tournament>>("/vendor/tournaments", { query: params, audience: AUD });
}

export function getVendorTournamentById(id: string) {
  return apiRequest<Tournament>(`/vendor/tournaments/${id}`, { audience: AUD });
}

export interface CreateTournamentInput {
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
  status?: TournamentStatus;
}

export function createTournament(input: CreateTournamentInput) {
  return apiRequest<Tournament>("/vendor/tournaments", { method: "POST", body: input, audience: AUD });
}

export function updateTournament(id: string, input: Partial<CreateTournamentInput>) {
  return apiRequest<Tournament>(`/vendor/tournaments/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function addTournamentFixture(
  tournamentId: string,
  input: { round: string; teamAId: string; teamBId: string; scheduledAt: string }
) {
  return apiRequest<Tournament>(`/vendor/tournaments/${tournamentId}/fixtures`, { method: "POST", body: input, audience: AUD });
}

export function updateFixtureResult(
  tournamentId: string,
  fixtureId: string,
  input: { teamAScore: number; teamBScore: number; winnerTeamId?: string }
) {
  return apiRequest<Tournament>(`/vendor/tournaments/${tournamentId}/fixtures/${fixtureId}`, {
    method: "PATCH",
    body: input,
    audience: AUD,
  });
}

export function listVendorTournamentRegistrations(
  params: { status?: TournamentRegistrationStatus; tournamentId?: string; page?: number; limit?: number } = {}
) {
  return apiRequest<Paginated<TournamentRegistration>>("/vendor/tournaments/registrations", { query: params, audience: AUD });
}

export function checkInVendorTournamentRegistration(orderId: string) {
  return apiRequest<TournamentRegistration>(`/vendor/tournaments/registrations/${orderId}/checkin`, {
    method: "POST",
    audience: AUD,
  });
}

/* ---- Memberships ---- */

export function listMemberships() {
  return apiRequest<Membership[]>("/vendor/memberships", { audience: AUD });
}

export interface CreateMembershipInput {
  /** Turf/listing this plan belongs to; omit to apply to all turfs. */
  listingId?: string;
  name: string;
  description?: string;
  planType: MembershipPlanType;
  price: number;
  durationDays?: number;
  sessionsIncluded?: number;
  turfDimensions?: string;
}

export function createMembership(input: CreateMembershipInput) {
  return apiRequest<Membership>("/vendor/memberships", { method: "POST", body: input, audience: AUD });
}

export function updateMembership(id: string, input: Partial<CreateMembershipInput> & { status?: "Active" | "Inactive" }) {
  return apiRequest<Membership>(`/vendor/memberships/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteMembership(id: string) {
  return apiRequest<null>(`/vendor/memberships/${id}`, { method: "DELETE", audience: AUD });
}

export function listSubscriptions() {
  return apiRequest<Subscription[]>("/vendor/memberships/subscriptions/all", { audience: AUD });
}

export function createSubscription(input: { membershipId: string; customerName: string; phone: string; amountPaid: number }) {
  return apiRequest<Subscription>("/vendor/memberships/subscriptions", { method: "POST", body: input, audience: AUD });
}

export function updateSubscriptionStatus(id: string, status: SubscriptionStatus) {
  return apiRequest<Subscription>(`/vendor/memberships/subscriptions/${id}/status`, {
    method: "PATCH",
    body: { status },
    audience: AUD,
  });
}

/* ---- QR check-in ---- */

export function checkInVendorBooking(orderId: string) {
  return apiRequest<Booking>(`/vendor/bookings/${orderId}/checkin`, { method: "POST", audience: AUD });
}

/** Verifies a scanned Challenge QR belongs to one of this vendor's venues and marks it arrived. */
export function checkInVendorChallenge(code: string) {
  return apiRequest<import("./challenges").Challenge>(`/vendor/challenges/${code}/check-in`, { method: "POST", audience: AUD });
}

/* ---- Food Outlets (Restaurants) ---- */

export interface OutletLocationInput {
  address?: string;
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export interface CreateOutletInput {
  name: string;
  kind?: "dining" | "venue";
  offer?: string;
  description?: string;
  cuisines?: string[];
  logo?: string;
  banner?: string;
  poster?: string;
  gallery?: string[];
  location?: OutletLocationInput;
  status?: "Active" | "Inactive";
}

export function listVendorOutlets() {
  return apiRequest<FoodOutlet[]>("/vendor/food-outlets", { audience: AUD });
}

export function getVendorOutletById(id: string) {
  return apiRequest<FoodOutlet>(`/vendor/food-outlets/${id}`, { audience: AUD });
}

export function createVendorOutlet(input: CreateOutletInput) {
  return apiRequest<FoodOutlet>("/vendor/food-outlets", { method: "POST", body: input, audience: AUD });
}

export function updateVendorOutlet(id: string, input: Partial<CreateOutletInput>) {
  return apiRequest<FoodOutlet>(`/vendor/food-outlets/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteVendorOutlet(id: string) {
  return apiRequest<null>(`/vendor/food-outlets/${id}`, { method: "DELETE", audience: AUD });
}

export function setOutletAvailability(outletId: string, days: OutletWeeklyDay[]) {
  return apiRequest<FoodOutlet>(`/vendor/food-outlets/${outletId}/availability`, {
    method: "PUT",
    body: { days },
    audience: AUD,
  });
}

export function addOutletLeave(outletId: string, input: { date: string; type?: "full" | "half"; reason?: string }) {
  return apiRequest<FoodOutlet>(`/vendor/food-outlets/${outletId}/leaves`, { method: "POST", body: input, audience: AUD });
}

export function removeOutletLeave(outletId: string, isoDate: string) {
  return apiRequest<FoodOutlet>(`/vendor/food-outlets/${outletId}/leaves/${encodeURIComponent(isoDate)}`, {
    method: "DELETE",
    audience: AUD,
  });
}

/** Per-category prep times + accepted fulfilment modes. These drive the player's checkout ETA. */
export function setOutletPrepTimes(
  outletId: string,
  input: {
    categoryPrepTimes?: CategoryPrepTime[];
    serviceBufferMins?: number;
    fulfilment?: Partial<OutletFulfilment>;
  }
) {
  return apiRequest<FoodOutlet>(`/vendor/food-outlets/${outletId}/prep-times`, {
    method: "PUT",
    body: input,
    audience: AUD,
  });
}

/** Table-booking and pay-bill settings for a dining outlet. */
export function setOutletDineout(outletId: string, input: Partial<OutletDineout>) {
  return apiRequest<FoodOutlet>(`/vendor/dineout/outlets/${outletId}/settings`, {
    method: "PUT",
    body: input,
    audience: AUD,
  });
}

/* ---- Dineout: table bookings & settled bills (Food Owner) ---- */

export function getVendorTableBookings(
  params: {
    status?: TableBookingStatus;
    outletId?: string;
    scope?: "upcoming" | "history";
    /** "YYYY-MM-DD" — one day's reservation sheet. */
    date?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  return apiRequest<Paginated<TableBooking>>("/vendor/dineout/bookings", { query: params, audience: AUD });
}

/** Full booking behind a scanned QR — read-only, so the host can check the party first. */
export function getVendorTableBooking(bookingId: string) {
  return apiRequest<TableBooking>(`/vendor/dineout/bookings/${bookingId}`, { audience: AUD });
}

export function updateVendorTableBookingStatus(
  bookingId: string,
  status: Exclude<TableBookingStatus, "Pending">,
  rejectionReason?: string
) {
  return apiRequest<TableBooking>(`/vendor/dineout/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: { status, rejectionReason },
    audience: AUD,
  });
}

/** Scanning the booking QR at the door seats the party. */
export function checkInVendorTableBooking(bookingId: string) {
  return apiRequest<TableBooking>(`/vendor/dineout/bookings/${bookingId}/checkin`, {
    method: "POST",
    audience: AUD,
  });
}

export function getVendorDiningBills(params: { outletId?: string; page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<DiningBill>>("/vendor/dineout/bills", { query: params, audience: AUD });
}

export function getVendorDineoutDashboard(period: "day" | "week" | "month" | "year" = "day") {
  return apiRequest<VendorDineoutDashboard>("/vendor/dineout/dashboard", { query: { period }, audience: AUD });
}

/* ---- Menu (Food Owner) ---- */

export function listVendorMenu(params: { outletId?: string } = {}) {
  return apiRequest<MenuItem[]>("/vendor/menu", { query: params, audience: AUD });
}

export interface MenuItemInput {
  outletId?: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  photo?: string;
  inStock?: boolean;
  prepTimeMins?: number;
  priceVariants?: PriceVariant[];
  trackInventory?: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
  stockUnit?: string;
}

export interface BulkMenuUploadResult {
  created: number;
  errors: { row: number; reason: string }[];
}

export function bulkUploadMenuItems(outletId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return uploadRequest<BulkMenuUploadResult>(`/vendor/menu/bulk-upload/${outletId}`, form, AUD);
}

export function createVendorMenuItem(input: MenuItemInput) {
  return apiRequest<MenuItem>("/vendor/menu", { method: "POST", body: input, audience: AUD });
}

export function updateVendorMenuItem(id: string, input: Partial<MenuItemInput>) {
  return apiRequest<MenuItem>(`/vendor/menu/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteVendorMenuItem(id: string) {
  return apiRequest<null>(`/vendor/menu/${id}`, { method: "DELETE", audience: AUD });
}

export interface MenuStockInput {
  trackInventory?: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
  stockUnit?: string;
  inStock?: boolean;
}

/** Inventory board edit — adjust stock without resending the whole dish. */
export function updateVendorMenuStock(id: string, input: MenuStockInput) {
  return apiRequest<MenuItem>(`/vendor/menu/${id}/stock`, { method: "PATCH", body: input, audience: AUD });
}

/* ---- Food Orders (Food Owner) ---- */

export function getVendorFoodOrders(
  params: {
    status?: FoodOrderStatus;
    /** Omit to pull orders from every turf at once. */
    outletId?: string;
    orderType?: FoodOrderType;
    scope?: "upcoming" | "history";
    page?: number;
    limit?: number;
  } = {}
) {
  return apiRequest<Paginated<FoodOrder>>("/vendor/food-orders", { query: params, audience: AUD });
}

/** Full order behind a scanned QR — read-only, so the counter can verify before handing over. */
export function getVendorFoodOrder(orderId: string) {
  return apiRequest<FoodOrder>(`/vendor/food-orders/${orderId}`, { audience: AUD });
}

export interface CounterOrderInput {
  outletId: string;
  items: { menuItemId: string; quantity: number; variantLabel?: string }[];
  customerName?: string;
  phone?: string;
  paymentMethod?: "Cash" | "UPI" | "Card" | "Other";
  paymentStatus?: "Paid" | "Unpaid";
  notes?: string;
}

/** Billing Slide / POS — ring up a walk-in bill against the live menu. */
export function createVendorCounterOrder(input: CounterOrderInput) {
  return apiRequest<FoodOrder>("/vendor/food-orders/counter", { method: "POST", body: input, audience: AUD });
}

export function updateVendorFoodOrderStatus(orderId: string, status: FoodOrderStatus) {
  return apiRequest<FoodOrder>(`/vendor/food-orders/${orderId}/status`, { method: "PATCH", body: { status }, audience: AUD });
}

export function checkInVendorFoodOrder(orderId: string) {
  return apiRequest<FoodOrder>(`/vendor/food-orders/${orderId}/checkin`, { method: "POST", audience: AUD });
}

export function getVendorFoodDashboard(period: "day" | "week" | "month" | "year" = "day") {
  return apiRequest<VendorFoodDashboard>("/vendor/food-dashboard", { query: { period }, audience: AUD });
}

export function getVendorEventsDashboard() {
  return apiRequest<VendorEventsDashboard>("/vendor/events-dashboard", { audience: AUD });
}

export function getVendorEventBookings(
  params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentStatus?: string;
  } = {}
) {
  return apiRequest<{ items: EventBookingSummary[] }>("/vendor/events-dashboard/bookings", {
    query: params,
    audience: AUD,
  });
}

export interface EventArrival {
  orderId: string;
  customerName: string;
  email?: string;
  phone?: string;
  listingTitle: string;
  totalAmount?: number;
  checkedInAt: string;
}

export function getVendorEventArrivals(params: { limit?: number } = {}) {
  return apiRequest<{ items: EventArrival[] }>("/vendor/events-dashboard/arrivals", {
    query: params,
    audience: AUD,
  });
}

/** Scans a ticket QR (order id) and marks the attendee arrived. Throws on invalid/unknown tickets. */
export function checkInEventBooking(orderId: string) {
  return apiRequest<{
    alreadyCheckedIn: boolean;
    booking: { orderId: string; customerName: string; listingTitle: string; checkedInAt: string };
  }>(`/vendor/events-dashboard/bookings/${encodeURIComponent(orderId)}/checkin`, {
    method: "POST",
    audience: AUD,
  });
}

/** Downloads an .xlsx of event bookings, optionally filtered by a createdAt date range. */
export async function exportVendorEventBookings(params: { startDate?: string; endDate?: string } = {}) {
  const token = getAccessToken("vendor");
  const url = buildApiUrl("/vendor/events-dashboard/bookings/export", {
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to export event bookings");
  }

  await downloadBlob(await response.blob(), "event_bookings_report.xlsx");
}

/** Triggers a browser download for a fetched blob. */
async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getVendorCoachesDashboard() {
  return apiRequest<VendorCoachesDashboard>("/vendor/coaches-dashboard", { audience: AUD });
}

/* ---- MPIN ---- */

export function getMpinStatus() {
  return apiRequest<{ hasPin: boolean }>("/vendor/mpin/status", { audience: AUD });
}

export function setMpin(pin: string) {
  return apiRequest<null>("/vendor/mpin/set", { method: "POST", body: { pin }, audience: AUD });
}

export function verifyMpin(pin: string) {
  return apiRequest<null>("/vendor/mpin/verify", { method: "POST", body: { pin }, audience: AUD });
}

export function requestMpinChange() {
  return apiRequest<null>("/vendor/mpin/change/request", { method: "POST", audience: AUD });
}

export function confirmMpinChange(otp: string, newPin: string) {
  return apiRequest<null>("/vendor/mpin/change/confirm", { method: "POST", body: { otp, newPin }, audience: AUD });
}


/* ─── Expenses ──────────────────────────────────────────────────── */

export type ExpenseCategory = "Maintenance" | "Rent" | "Salary" | "Misc";
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["Maintenance", "Rent", "Salary", "Misc"];

export interface VendorExpense {
  _id: string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
  spentAt: string;
  createdAt: string;
}

export interface ExpenseListResponse {
  items: VendorExpense[];
  total: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  note?: string;
  spentAt?: string;
}

export function getVendorExpenses(params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiRequest<ExpenseListResponse>(`/vendor/expenses${suffix}`, { audience: AUD });
}

export function createVendorExpense(input: CreateExpenseInput) {
  return apiRequest<VendorExpense>("/vendor/expenses", { method: "POST", body: input, audience: AUD });
}

export function deleteVendorExpense(id: string) {
  return apiRequest<null>(`/vendor/expenses/${id}`, { method: "DELETE", audience: AUD });
}

/* ---- Custom Sports ---- */

export interface VendorCustomSport {
  _id: string;
  sportName: string;
  iconUrl: string;
  createdBy: string;
  venue: "both" | "indoor" | "outdoor";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getVendorCustomSports() {
  return apiRequest<VendorCustomSport[]>("/vendor/custom-sports", { audience: AUD });
}

export function createVendorCustomSport(input: { sportName: string; iconUrl: string; venue?: string }) {
  return apiRequest<VendorCustomSport>("/vendor/custom-sports", { method: "POST", body: input, audience: AUD });
}

export function updateVendorCustomSport(id: string, input: { sportName?: string; iconUrl?: string; venue?: string }) {
  return apiRequest<VendorCustomSport>(`/vendor/custom-sports/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteVendorCustomSport(id: string) {
  return apiRequest<{ success: boolean }>(`/vendor/custom-sports/${id}`, { method: "DELETE", audience: AUD });
}

