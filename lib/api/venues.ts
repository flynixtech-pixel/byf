import { apiRequest, type Paginated } from "./client";
import type { Listing, ListingType } from "./types";

export interface BrowseVenuesParams {
  city?: string;
  category?: string;
  subCategory?: string;
  type?: ListingType;
  vendorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface VendorPublicProfile {
  _id: string;
  businessName: string;
  ownerName: string;
  logo?: string;
  banner?: string;
  poster?: string;
  city?: string;
  state: string;
}

export function getListingImage(
  listing: any,
  type: "poster" | "banner" | "fallback" = "fallback"
): string | undefined {
  if (!listing) return undefined;

  const extractUrl = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
    if (typeof val.url === "string" && val.url.trim().length > 0) return val.url.trim();
    if (typeof val.src === "string" && val.src.trim().length > 0) return val.src.trim();
    return undefined;
  };

  const cover = extractUrl(listing.coverImage);
  const poster = extractUrl(listing.posterImage);
  const banner = extractUrl(listing.bannerImage);
  const firstUniversal = extractUrl(listing.universalImages?.[0]);
  const firstImage = extractUrl(listing.images?.[0]);
  const secondImage = extractUrl(listing.images?.[1]);

  if (type === "poster") {
    return poster || cover || firstUniversal || firstImage;
  }
  if (type === "banner") {
    return banner || cover || firstUniversal || secondImage || firstImage;
  }
  return cover || poster || banner || firstUniversal || firstImage;
}

// The admin/vendor package studio only ever saves uploads into `images`
// (first slot = poster) and never updates `coverImage`, which stays stuck on
// its seeded placeholder — so prefer the real uploaded image when one exists.
function withCoverImage(listing: Listing): Listing {
  return { ...listing, coverImage: getListingImage(listing, "poster") };
}

export async function browseVenues(params: BrowseVenuesParams = {}) {
  const result = await apiRequest<Paginated<Listing>>("/venues", { query: params });
  return { ...result, items: result.items.map(withCoverImage) };
}

export async function getVenueById(id: string) {
  const listing = await apiRequest<Listing>(`/venues/${id}`);
  return withCoverImage(listing);
}

export interface BookedRange {
  startTime: string; // "HH:mm" (24h)
  endTime: string; // "HH:mm" (24h)
  status: "Confirmed" | "Pending" | "Completed";
  /** Which court is taken. Absent only on bookings that predate courts. */
  courtId?: string;
}

/** Already-booked time ranges for a venue on a given date (YYYY-MM-DD). */
export function getVenueAvailability(id: string, date: string) {
  return apiRequest<BookedRange[]>(`/venues/${id}/availability`, { query: { date } });
}

/** One row of the city ranking board — a venue plus the booking volume it ranks on. */
export interface RankedVenue {
  rank: number;
  listingId: string;
  slug?: string;
  title: string;
  city: string;
  area: string;
  address: string;
  image: string;
  price: number;
  categories: string[];
  tags: string[];
  bookings: number;
}

export interface VenueRankings {
  items: RankedVenue[];
  /** Every locality in the city, for the area filter. */
  areas: string[];
  city: string;
}

/** Top venues in a city by booking volume, optionally narrowed to one locality. */
export function getVenueRankings(params: { city: string; area?: string; limit?: number; days?: number }) {
  return apiRequest<VenueRankings>("/venues/rankings", { query: params });
}

export async function getVendorProfile(vendorId: string) {
  const result = await apiRequest<{ vendor: VendorPublicProfile; listings: Listing[] }>(
    `/venues/vendors/${vendorId}`
  );
  return { ...result, listings: result.listings.map(withCoverImage) };
}

export interface Review {
  _id: string;
  listingId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function getVenueReviews(id: string) {
  return apiRequest<Review[]>(`/venues/${id}/reviews`);
}

export function createVenueReview(id: string, data: { customerName: string; rating: number; comment: string }) {
  return apiRequest<Review>(`/venues/${id}/reviews`, { method: "POST", body: data });
}
