import { apiRequest, type Paginated } from "./client";
import type { BookingSlotsResponse, DiningBill, DiningBillQuote, TableBooking } from "./types";

/* ---- Table bookings ---- */

/** Bookable slots for one day. Public — no login needed to look. */
export function getBookingSlots(outletIdOrSlug: string, date: string) {
  return apiRequest<BookingSlotsResponse>(`/dineout/outlets/${outletIdOrSlug}/slots`, { query: { date } });
}

export interface BookTableInput {
  outletId: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  slotTime: string;
  partySize: number;
  seatingPreference?: string;
  selectedOfferCode?: string;
  occasion?: string;
  specialRequests?: string;
}

export function bookTable(input: BookTableInput) {
  return apiRequest<TableBooking>("/dineout/bookings", { method: "POST", body: input, audience: "customer" });
}

export function getMyTableBookings(params: { page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<TableBooking>>("/dineout/bookings/mine", { query: params, audience: "customer" });
}

export function getMyTableBooking(bookingId: string) {
  return apiRequest<TableBooking>(`/dineout/bookings/${bookingId}`, { audience: "customer" });
}

export function cancelMyTableBooking(bookingId: string) {
  return apiRequest<TableBooking>(`/dineout/bookings/${bookingId}/cancel`, {
    method: "POST",
    audience: "customer",
  });
}

/* ---- Pay bill at restaurant ---- */

export interface DiningBillInput {
  outletId: string;
  billAmount: number;
  couponCode?: string;
  tipAmount?: number;
  bankOfferCode?: string;
  walletAmount?: number;
  rewardPointsRedeemed?: number;
}

/** Bill breakdown preview — nothing is charged. */
export function getDiningBillQuote(input: DiningBillInput) {
  return apiRequest<DiningBillQuote>("/dineout/bills/quote", { method: "POST", body: input });
}

export interface PayDiningBillInput extends DiningBillInput {
  paymentMethod?: "UPI" | "Card" | "NetBanking" | "Wallet";
  bookingId?: string;
  distanceMetres?: number;
}

export function payDiningBill(input: PayDiningBillInput) {
  return apiRequest<DiningBill>("/dineout/bills", { method: "POST", body: input, audience: "customer" });
}

export function getMyDiningBills(params: { page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<DiningBill>>("/dineout/bills/mine", { query: params, audience: "customer" });
}

export function getMyDiningBill(billId: string) {
  return apiRequest<DiningBill>(`/dineout/bills/${billId}`, { audience: "customer" });
}
