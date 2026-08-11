import { apiRequest } from "./client";

/** One live Last Minute Boost deal — mirrors Backend/src/modules/deals/deals.service.ts. */
export interface LastMinuteDeal {
  id: string;
  listingId: string;
  slug?: string;
  title: string;
  city?: string;
  coverImage?: string;
  sport: string;
  courtId?: string;
  courtName?: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  slotStartsAt: string;
  originalPrice: number;
  discountedPrice: number;
  discountPct: number;
  triggerMins: number;
}

/** Every boosted Sport + Court + Slot combination that is inside its trigger window and
 * still genuinely unbooked, right now. No auth — same as the public venue browse. */
export function getLastMinuteDeals(): Promise<LastMinuteDeal[]> {
  return apiRequest<LastMinuteDeal[]>("/deals/last-minute");
}
