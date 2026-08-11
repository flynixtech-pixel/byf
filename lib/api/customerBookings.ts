import { apiRequest, type Paginated } from "./client";
import type { Booking, BookingStatus, PaymentMethod } from "./types";

export interface CreateBookingInput {
  listingId: string;
  priceTierId?: string;
  addOnIds?: string[];
  couponCode?: string;
  dateTime: string;
  customerName?: string;
  phone?: string;
  email?: string;
  payment: PaymentMethod;
  paymentType?: "partial" | "full";
  playProtect?: boolean;
  /** Which sport the player is booking (venues can host several). */
  sport?: string;
  /** Court picked on the venue. Omit to let the backend assign the first free one. */
  courtId?: string;
  /** Several courts taken in the same slot. Takes precedence over `courtId`. */
  courtIds?: string[];
  durationMinutes?: number;
}

export function createMyBooking(input: CreateBookingInput) {
  return apiRequest<Booking>("/bookings", { method: "POST", body: input, audience: "customer" });
}

export function getMyBookings(params: { status?: BookingStatus; page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<Booking>>("/bookings", { query: params, audience: "customer" });
}

export function getMyBookingByOrderId(orderId: string) {
  return apiRequest<Booking>(`/bookings/${orderId}`, { audience: "customer" });
}

export function cancelMyBooking(orderId: string, cancellationReason?: string) {
  return apiRequest<Booking>(`/bookings/${orderId}/cancel`, {
    method: "POST",
    body: { cancellationReason },
    audience: "customer",
  });
}

export function confirmMyBookingPayment(orderId: string, paymentId?: string) {
  return apiRequest<Booking>(`/bookings/${orderId}/confirm-payment`, {
    method: "POST",
    body: { paymentId },
    audience: "customer",
  });
}



