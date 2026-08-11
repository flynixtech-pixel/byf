import { apiRequest, type Paginated } from "./client";
import type { FoodOrder, FoodOrderQuote, FoodOrderType, FoodOutlet, FoodVendor, MenuItem } from "./types";

/* ---- Restaurants (outlets) ---- */

export function getFoodOutlets(
  params: { cuisine?: string; city?: string; kind?: "dining" | "venue"; page?: number; limit?: number } = {}
) {
  return apiRequest<Paginated<FoodOutlet>>("/food/outlets", { query: params });
}

export function getFoodOutletMenu(idOrSlug: string) {
  return apiRequest<{ outlet: FoodOutlet; menu: MenuItem[] }>(`/food/outlets/${idOrSlug}`);
}

/* ---- Legacy vendor-account browse (old links) ---- */

export function getFoodVendors() {
  return apiRequest<FoodVendor[]>("/food/vendors");
}

export function getFoodVendorMenu(vendorId: string) {
  return apiRequest<{ vendor: FoodVendor; items: MenuItem[] }>(`/food/vendors/${vendorId}/menu`);
}

/* ---- Orders ---- */

export interface PlaceFoodOrderInput {
  outletId?: string;
  vendorId?: string;
  items: { menuItemId: string; quantity: number; variantLabel?: string }[];
  /** Pre-order / in-venue / post-match / dine-in. Defaults to post-match server-side. */
  orderType?: Exclude<FoodOrderType, "Counter">;
  /** ISO timestamp — required for pre-orders. */
  scheduledFor?: string;
  /** Dine-in table number, or the court an in-venue order should be brought to. */
  serveTo?: string;
  paymentMethod?: string;
  notes?: string;
}

/** Server-priced bill + prep-time ETA, fetched before the player pays. */
export function getFoodOrderQuote(input: {
  outletId?: string;
  vendorId?: string;
  items: { menuItemId: string; quantity: number; variantLabel?: string }[];
  orderType?: Exclude<FoodOrderType, "Counter">;
}) {
  return apiRequest<FoodOrderQuote>("/food/orders/quote", { method: "POST", body: input });
}

export function placeFoodOrder(input: PlaceFoodOrderInput) {
  return apiRequest<FoodOrder>("/food/orders", { method: "POST", body: input, audience: "customer" });
}

export function getMyFoodOrders(params: { page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<FoodOrder>>("/food/orders/mine", { query: params, audience: "customer" });
}

export function getMyFoodOrderByOrderId(orderId: string) {
  return apiRequest<FoodOrder>(`/food/orders/${orderId}`, { audience: "customer" });
}
