import type { Listing as ApiListing } from "./types";
import type { Listing as MockListing } from "@/lib/types";
import type { AdminListingInput } from "./admin";

/** The admin/vendor panel UI (table, PackageStudio form) was built against `lib/types.ts`'s
 * `Listing` shape (id, listedOn). The real API returns `_id`/`createdAt`. This adapter lets the
 * existing panel UI keep working unchanged while the data underneath is real. */
export function apiListingToMock(listing: ApiListing): MockListing {
  return {
    id: listing._id,
    slug: listing.slug,
    title: listing.title,
    type: listing.type,
    categories: listing.categories,
    subCategories: listing.subCategories,
    sportCapacities: listing.sportCapacities,
    courts: listing.courts,
    price: listing.price,
    listedOn: listing.createdAt,
    status: listing.status,
    trending: listing.trending,
    isPrivate: listing.isPrivate,
    access: listing.access,
    ownerName: listing.ownerName,
    sharedWithVendors: listing.sharedWithVendors,
    coverImage: listing.coverImage,
    posterImage: listing.posterImage,
    bannerImage: listing.bannerImage,
    universalImages: listing.universalImages,
    videoUrl: listing?.videoUrl,
    images: listing.images,
    country: listing.country,
    city: listing.city,
    state: listing.state,
    cityMode: listing.cityMode,
    cities: listing.cities,
    address: listing.address,
    startingPoint: listing.startingPoint,
    endingPoint: listing.endingPoint,
    reportingStartTime: listing.reportingStartTime,
    reportingEndTime: listing.reportingEndTime,
    description: listing.description,
    highlights: listing.highlights,
    inclusions: listing.inclusions,
    exclusions: listing.exclusions,
    itinerary: listing.itinerary,
    faqs: listing.faqs,
    tags: listing.tags,
    priceTiers: listing.priceTiers,
    capacity: listing.capacity,
    addOns: listing.addOns,
    coupons: listing.coupons,
    bookingType: listing.bookingType,
    availableFrom: listing.availableFrom,
    availableTill: listing.availableTill,
    slotsPerDay: listing.slotsPerDay,
    slotsList: listing.slotsList,
    dailyRoutine: listing.dailyRoutine,
    dateOverrides: listing.dateOverrides,
    lastMinBoosts: listing.lastMinBoosts,
    partialPayment: listing.partialPayment,
    technicalSpecs: listing.technicalSpecs,
  };
}

/** Strips the mock-only `id`/`listedOn` fields before sending a create/update request. */
export function mockListingToApiInput(listing: MockListing): AdminListingInput {
  const { id: _id, listedOn: _listedOn, ...rest } = listing;
  void _id;
  void _listedOn;
  // The backend requires `categories` to be a non-empty array. On a pricing /
  // boost / block update the turf may legitimately have no sports set yet, and
  // sending an empty array trips zod ("categories: Array must contain at least
  // 1 element(s)") — so the whole save fails with a raw validation string. Drop
  // the key entirely when empty: a partial update simply leaves categories
  // untouched, while create flows still supply real categories from the form.
  if (!rest.categories || rest.categories.length === 0) {
    delete (rest as Partial<AdminListingInput>).categories;
  }
  if (!rest.city || !rest.city.trim()) {
    rest.city = "Udaipur";
  }
  if (!rest.state || !rest.state.trim()) {
    rest.state = "Rajasthan";
  }
  return rest as AdminListingInput;
}
