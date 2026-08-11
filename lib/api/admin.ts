import { apiRequest, type Paginated } from "./client";
import type {
  AdBanner,
  AdminDashboard,
  AdminModuleKey,
  AdminSubUser,
  AppVersionConfig,
  BlogPost,
  Booking,
  BookingStatus,
  Listing,
  ListingType,
  PermissionsMap,
  PayoutCategory,
  SystemHealth,
  Vendor,
  VendorPayout,
  VendorPayoutStatus,
  VendorStatus,
} from "./types";

const AUD = "admin" as const;

/* ---- Dashboard ---- */
export function getAdminDashboard() {
  return apiRequest<AdminDashboard>("/admin/dashboard", { audience: AUD });
}

export function getSystemHealth() {
  return apiRequest<SystemHealth>("/admin/dashboard/system-health", { audience: AUD });
}

/* ---- Vendors ---- */
export function listVendors(params: { status?: VendorStatus; page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<Vendor>>("/admin/vendors", { query: params, audience: AUD });
}

export function getVendorById(id: string) {
  return apiRequest<Vendor>(`/admin/vendors/${id}`, { audience: AUD });
}

export function updateVendorStatus(id: string, status: VendorStatus) {
  return apiRequest<Vendor>(`/admin/vendors/${id}/status`, { method: "PATCH", body: { status }, audience: AUD });
}

export interface CreateVendorInput {
  ownerName: string;
  businessName: string;
  email: string;
  phone: string;
  state: string;
  city?: string;
  password: string;
  status?: VendorStatus;
}

export function createVendor(input: CreateVendorInput) {
  return apiRequest<Vendor>("/admin/vendors", { method: "POST", body: input, audience: AUD });
}

export interface UpdateVendorInput {
  ownerName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  state?: string;
  city?: string;
  notifications?: Partial<{ email: boolean; whatsapp: boolean; offline: boolean }>;
}

export function updateVendor(id: string, input: UpdateVendorInput) {
  return apiRequest<Vendor>(`/admin/vendors/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteVendor(id: string) {
  return apiRequest<null>(`/admin/vendors/${id}`, { method: "DELETE", audience: AUD });
}

/* ---- Sub-admins (super_admin only) ---- */

export function listAdminSubUsers() {
  return apiRequest<AdminSubUser[]>("/admin/sub-admins", { audience: AUD });
}

export interface CreateAdminSubUserInput {
  name: string;
  email: string;
  role: string;
  password: string;
  permissions: PermissionsMap<AdminModuleKey>;
}

export function createAdminSubUser(input: CreateAdminSubUserInput) {
  return apiRequest<AdminSubUser>("/admin/sub-admins", { method: "POST", body: input, audience: AUD });
}

export interface UpdateAdminSubUserInput {
  name?: string;
  role?: string;
  status?: "Active" | "Inactive";
  permissions?: PermissionsMap<AdminModuleKey>;
}

export function updateAdminSubUser(id: string, input: UpdateAdminSubUserInput) {
  return apiRequest<AdminSubUser>(`/admin/sub-admins/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteAdminSubUser(id: string) {
  return apiRequest<null>(`/admin/sub-admins/${id}`, { method: "DELETE", audience: AUD });
}

/* ---- Listings ---- */

export type AdminListingInput = Partial<Omit<Listing, "_id" | "createdAt" | "updatedAt">> & {
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

export function getAdminListings(params: { city?: string; type?: ListingType; search?: string } = {}) {
  return apiRequest<Listing[]>("/admin/listings", { query: params, audience: AUD });
}

export function getAdminListingById(id: string) {
  return apiRequest<Listing>(`/admin/listings/${id}`, { audience: AUD });
}

export function createAdminListing(input: AdminListingInput) {
  return apiRequest<Listing>("/admin/listings", { method: "POST", body: input, audience: AUD });
}

export function updateAdminListing(id: string, input: Partial<AdminListingInput>) {
  return apiRequest<Listing>(`/admin/listings/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteAdminListing(id: string) {
  return apiRequest<null>(`/admin/listings/${id}`, { method: "DELETE", audience: AUD });
}

/* ---- Bookings ---- */

export function getAdminBookings(params: { status?: BookingStatus; page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<Booking>>("/admin/bookings", { query: params, audience: AUD });
}

export function getAdminBookingByOrderId(orderId: string) {
  return apiRequest<Booking>(`/admin/bookings/${orderId}`, { audience: AUD });
}

export function updateAdminBookingStatus(orderId: string, status: BookingStatus, cancellationReason?: string) {
  return apiRequest<Booking>(`/admin/bookings/${orderId}/status`, {
    method: "PATCH",
    body: { status, cancellationReason },
    audience: AUD,
  });
}

/* ---- Payouts ---- */

export function listPayoutCategories() {
  return apiRequest<PayoutCategory[]>("/admin/payouts/categories", { audience: AUD });
}

export function createPayoutCategory(input: { name: string; letter: string; color: string; subtitle?: string }) {
  return apiRequest<PayoutCategory>("/admin/payouts/categories", { method: "POST", body: input, audience: AUD });
}

export function deletePayoutCategory(id: string) {
  return apiRequest<null>(`/admin/payouts/categories/${id}`, { method: "DELETE", audience: AUD });
}

export function listVendorPayouts(
  params: { status?: VendorPayoutStatus; vendorId?: string; categoryId?: string; page?: number; limit?: number } = {}
) {
  return apiRequest<Paginated<VendorPayout>>("/admin/payouts", { query: params, audience: AUD });
}

export function createVendorPayout(input: {
  categoryId?: string;
  vendorId: string;
  type?: "Standard" | "Affiliate";
  amount: number;
  bookingsCount?: number;
  bookingIds?: string[];
}) {
  return apiRequest<VendorPayout>("/admin/payouts", { method: "POST", body: input, audience: AUD });
}

export function updateVendorPayoutStatus(id: string, status: VendorPayoutStatus) {
  return apiRequest<VendorPayout>(`/admin/payouts/${id}/status`, { method: "PATCH", body: { status }, audience: AUD });
}

export interface PayoutBookingBreakdown {
  orderId: string;
  customerName: string;
  listingTitle: string;
  vendorEarning: number;
}

export function getVendorPayoutBookings(payoutId: string) {
  return apiRequest<PayoutBookingBreakdown[]>(`/admin/payouts/${payoutId}/bookings`, { audience: AUD });
}

/* ---- Blog ---- */

export function listBlogPosts() {
  return apiRequest<BlogPost[]>("/admin/blog", { audience: AUD });
}

export function createBlogPost(input: { title: string; slug: string; thumbnail?: string; content: string; status?: "Published" | "Draft" }) {
  return apiRequest<BlogPost>("/admin/blog", { method: "POST", body: input, audience: AUD });
}

export function updateBlogPost(id: string, input: Partial<{ title: string; slug: string; thumbnail?: string; content: string; status: "Published" | "Draft" }>) {
  return apiRequest<BlogPost>(`/admin/blog/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteBlogPost(id: string) {
  return apiRequest<null>(`/admin/blog/${id}`, { method: "DELETE", audience: AUD });
}

/* ---- Ad banners ---- */

export function listBanners() {
  return apiRequest<AdBanner[]>("/admin/banners", { audience: AUD });
}

export function createBanner(input: { imageUrl: string; title?: string; linkUrl?: string; order?: number; isActive?: boolean }) {
  return apiRequest<AdBanner>("/admin/banners", { method: "POST", body: input, audience: AUD });
}

export function updateBanner(id: string, input: Partial<{ imageUrl: string; title?: string; linkUrl?: string; order: number; isActive: boolean }>) {
  return apiRequest<AdBanner>(`/admin/banners/${id}`, { method: "PUT", body: input, audience: AUD });
}

export function deleteBanner(id: string) {
  return apiRequest<null>(`/admin/banners/${id}`, { method: "DELETE", audience: AUD });
}

/* ---- App version ---- */

export function listAppVersions() {
  return apiRequest<AppVersionConfig[]>("/admin/app-version", { audience: AUD });
}

export function upsertAppVersion(input: {
  platform: "ios" | "android";
  currentVersion: string;
  minRequiredVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
  forceUpdate?: boolean;
}) {
  return apiRequest<AppVersionConfig>("/admin/app-version", { method: "PUT", body: input, audience: AUD });
}

/* ---- Site appearance ---- */

interface SiteAppearanceResponse {
  theme: string;
  customBrand?: string;
  customAccent?: string;
}

export function getAdminSiteAppearance() {
  return apiRequest<SiteAppearanceResponse>("/admin/appearance", { audience: AUD });
}

export function updateSiteAppearance(input: { theme: string; customBrand?: string; customAccent?: string }) {
  return apiRequest<SiteAppearanceResponse>("/admin/appearance", { method: "PUT", body: input, audience: AUD });
}
