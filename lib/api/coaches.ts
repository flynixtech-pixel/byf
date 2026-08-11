import { apiRequest, type Paginated } from "./client";
import type {
  Coach,
  CoachSubscription,
  CoachSubscriptionPlan,
  CoachSubscriptionStatus,
  PaymentMethod,
} from "./types";

export interface BrowseCoachesParams {
  category?: string;
  vendorId?: string;
  turfListingId?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export function browsePublicCoaches(params: BrowseCoachesParams = {}) {
  return apiRequest<Paginated<Coach>>("/coaches", { query: params });
}

export function getPublicCoachById(id: string) {
  return apiRequest<Coach>(`/coaches/${id}`);
}

export interface EnrollCoachInput {
  coachId: string;
  batchId: string;
  plan: CoachSubscriptionPlan;
  customerName?: string;
  phone?: string;
  email?: string;
  payment: PaymentMethod;
}

export function enrollInCoachBatch(input: EnrollCoachInput) {
  return apiRequest<CoachSubscription>("/coach-subscriptions", {
    method: "POST",
    body: input,
    audience: "customer",
  });
}

export function getMyCoachSubscriptions(
  params: { status?: CoachSubscriptionStatus; page?: number; limit?: number } = {}
) {
  return apiRequest<Paginated<CoachSubscription>>("/coach-subscriptions", { query: params, audience: "customer" });
}

export function getMyCoachSubscriptionByOrderId(orderId: string) {
  return apiRequest<CoachSubscription>(`/coach-subscriptions/${orderId}`, { audience: "customer" });
}

export function cancelMyCoachSubscription(orderId: string, cancellationReason?: string) {
  return apiRequest<CoachSubscription>(`/coach-subscriptions/${orderId}/cancel`, {
    method: "POST",
    body: { cancellationReason },
    audience: "customer",
  });
}
