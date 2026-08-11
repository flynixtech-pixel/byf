import { apiRequest, setAccessToken, restoreSession, type Audience } from "./client";
import type { ModulePermissionKey, PermissionsMap, AdminModuleKey } from "./types";

/* ------------------------------------------------------------------ */
/*  Customer                                                            */
/* ------------------------------------------------------------------ */

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  status?: "active" | "blocked";
}

export interface CustomerAuthResult {
  accessToken: string;
  customer: CustomerProfile;
}

export function customerRegister(input: { name: string; email: string; phone: string; password: string }) {
  return apiRequest<CustomerAuthResult>("/auth/customer/register", { method: "POST", body: input }).then((res) => {
    setAccessToken("customer", res.accessToken);
    return res.customer;
  });
}

export function customerLogin(input: { identifier: string; password: string }) {
  return apiRequest<CustomerAuthResult>("/auth/customer/login", { method: "POST", body: input }).then((res) => {
    setAccessToken("customer", res.accessToken);
    return res.customer;
  });
}

export function customerGoogleAuth(idToken: string) {
  return apiRequest<CustomerAuthResult>("/auth/customer/google", { method: "POST", body: { idToken } }).then((res) => {
    setAccessToken("customer", res.accessToken);
    return res.customer;
  });
}

export function customerRequestLoginOtp(email: string) {
  return apiRequest<null>("/auth/customer/otp/request", { method: "POST", body: { email } });
}

export function customerLoginWithOtp(input: { email: string; otp: string }) {
  return apiRequest<CustomerAuthResult>("/auth/customer/otp/login", { method: "POST", body: input }).then((res) => {
    setAccessToken("customer", res.accessToken);
    return res.customer;
  });
}

export function customerForgotPassword(email: string) {
  return apiRequest<null>("/auth/customer/forgot-password", { method: "POST", body: { email } });
}

export function customerResetPassword(input: { email: string; otp: string; newPassword: string }) {
  return apiRequest<null>("/auth/customer/reset-password", { method: "POST", body: input });
}

export async function customerLogout() {
  try {
    await apiRequest<null>("/auth/customer/logout", { method: "POST" });
  } catch {
    // Ignore network or authentication errors on logout so local session is always wiped
  } finally {
    setAccessToken("customer", null);
  }
}

export function getCurrentCustomer() {
  return apiRequest<CustomerProfile>("/auth/customer/me", { audience: "customer" });
}

export function updateMyCustomerProfile(input: { name?: string; avatarUrl?: string; phone?: string }) {
  return apiRequest<CustomerProfile>("/auth/customer/me", { method: "PATCH", body: input, audience: "customer" });
}

/* ------------------------------------------------------------------ */
/*  Vendor — login/me responses are a union of "owner" vs "staff"       */
/* ------------------------------------------------------------------ */

export interface VendorOwnerProfile {
  id: string;
  ownerName: string;
  businessName: string;
  email: string;
  status: "pending" | "approved" | "suspended";
  role: "vendor";
  verticals: ("turf" | "events" | "food" | "coaches")[];
  sports?: string[];
}

export interface VendorStaffProfile {
  id: string;
  vendorId: string;
  holderName: string;
  roleName: string;
  email: string;
  role: "staff" | "subadmin";
  verticals: ("turf" | "events" | "food" | "coaches")[];
  sports?: string[];
  permissions?: PermissionsMap<ModulePermissionKey>;
}

export type VendorProfile = VendorOwnerProfile | VendorStaffProfile;

export interface VendorAuthResult {
  accessToken: string;
  vendor: VendorProfile;
}

export function isVendorOwner(profile: VendorProfile): profile is VendorOwnerProfile {
  return profile.role === "vendor";
}

export function vendorRegister(input: {
  ownerName: string;
  businessName: string;
  email: string;
  phone: string;
  state: string;
  city?: string;
  password: string;
  verticals: ("turf" | "events" | "food" | "coaches")[];
}) {
  return apiRequest<VendorAuthResult>("/auth/vendor/register", { method: "POST", body: input }).then((res) => {
    setAccessToken("vendor", res.accessToken);
    return res.vendor;
  });
}

export function vendorLogin(input: { email: string; password: string }) {
  return apiRequest<VendorAuthResult>("/auth/vendor/login", { method: "POST", body: input }).then((res) => {
    setAccessToken("vendor", res.accessToken);
    return res.vendor;
  });
}

export async function vendorLogout() {
  try {
    await apiRequest<null>("/auth/vendor/logout", { method: "POST" });
  } catch {
    // Ignore network or authentication errors on logout so local session is always wiped
  } finally {
    setAccessToken("vendor", null);
    // Clear the per-session MPIN unlock + active-panel so the next vendor on this device starts fresh.
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("byv_vendor_mpin_ok");
      localStorage.removeItem("byv_vendor_active_vertical");
    }
  }
}

export function getCurrentVendor() {
  return apiRequest<VendorProfile>("/auth/vendor/me", { audience: "vendor" });
}

export function vendorRequestRegisterOtp(email: string) {
  return apiRequest<null>("/auth/vendor/register/otp/request", { method: "POST", body: { email } });
}

export function vendorVerifyRegisterOtp(input: { email: string; otp: string }) {
  return apiRequest<null>("/auth/vendor/register/otp/verify", { method: "POST", body: input });
}

export function vendorForgotPassword(email: string) {
  return apiRequest<null>("/auth/vendor/forgot-password", { method: "POST", body: { email } });
}

export function vendorResetPassword(input: { email: string; otp: string; newPassword: string }) {
  return apiRequest<null>("/auth/vendor/reset-password", { method: "POST", body: input });
}

/* ------------------------------------------------------------------ */
/*  Admin — login/me responses are a union of "super_admin" vs "sub_admin" */
/* ------------------------------------------------------------------ */

export interface SuperAdminProfile {
  id: string;
  name: string;
  email: string;
  role: "super_admin";
}

export interface SubAdminProfile {
  id: string;
  name: string;
  email: string;
  role: "sub_admin";
  roleLabel: string;
  permissions?: PermissionsMap<AdminModuleKey>;
}

export type AdminProfile = SuperAdminProfile | SubAdminProfile;

export interface AdminAuthResult {
  accessToken: string;
  admin: AdminProfile;
}

export function isSuperAdmin(profile: AdminProfile): profile is SuperAdminProfile {
  return profile.role === "super_admin";
}

export function adminLogin(input: { email: string; password: string }) {
  return apiRequest<AdminAuthResult>("/auth/admin/login", { method: "POST", body: input }).then((res) => {
    setAccessToken("admin", res.accessToken);
    return res.admin;
  });
}

export async function adminLogout() {
  try {
    await apiRequest<null>("/auth/admin/logout", { method: "POST" });
  } catch {
    // Ignore network or authentication errors on logout so local session is always wiped
  } finally {
    setAccessToken("admin", null);
  }
}

export function getCurrentAdmin() {
  return apiRequest<AdminProfile>("/auth/admin/me", { audience: "admin" });
}

/* ------------------------------------------------------------------ */
/*  Silent session restore — call once on mount per audience            */
/* ------------------------------------------------------------------ */

export async function restoreCustomerSession(): Promise<CustomerProfile | null> {
  const token = await restoreSession("customer" as Audience);
  if (!token) return null;
  try {
    return await getCurrentCustomer();
  } catch {
    return null;
  }
}

export async function restoreVendorSession(): Promise<VendorProfile | null> {
  const token = await restoreSession("vendor" as Audience);
  if (!token) return null;
  try {
    return await getCurrentVendor();
  } catch {
    return null;
  }
}

export async function restoreAdminSession(): Promise<AdminProfile | null> {
  const token = await restoreSession("admin" as Audience);
  if (!token) return null;
  try {
    return await getCurrentAdmin();
  } catch {
    return null;
  }
}
