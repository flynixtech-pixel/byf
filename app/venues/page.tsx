"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, MapPin, Navigation, RotateCcw, Sparkles, Settings2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SportsCategoryBar, type SportCategoryItem } from "@/components/sports/SportsCategoryBar";
import { VenuePosterCard, VenuePosterCardSkeleton } from "@/components/venue-poster-card";
import { FiltersModal } from "@/components/home/modals/FiltersModal";
import { useVenueFilters } from "@/components/home/useVenueFilters";
import { browseVenues, getVendorProfile, type VendorPublicProfile } from "@/lib/api/venues";
import { type Venue, listingToVenue } from "@/lib/venues";
import type { Listing } from "@/lib/api/types";
import { SPORT_CATEGORIES } from "@/lib/taxonomy";
import { trackVenueSearch } from "@/lib/analytics";

interface VenueCardData {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  image?: string;
  city?: string;
  price: number;
  badge?: string;
}

const EMOJI_MAP: Record<string, string> = {
  cricket: "🏏", football: "⚽", badminton: "🏸", pickleball: "🏓", tennis: "🎾",
  "table-tennis": "🏓", basketball: "🏀", volleyball: "🏐", swimming: "🏊",
  "snooker-pool": "🎱", skating: "🛼", "indoor-games": "🎮",
};

const VENUE_CATEGORIES: SportCategoryItem[] = SPORT_CATEGORIES.map((item) => ({
  id: item.id,
  label: item.label,
  emoji: EMOJI_MAP[item.id],
  image: item.image,
}));

function VenuesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const searchQuery = searchParams.get("search") ?? "";
  const [venues, setVenues] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Record<string, VendorPublicProfile>>({});
  const [availableCategories, setAvailableCategories] = useState<SportCategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    browseVenues({ limit: 50, page: 1, type: "Turf" })
      .then(async (firstPage) => {
        const remainingPages = await Promise.all(
          Array.from({ length: Math.max(0, firstPage.pages - 1) }, (_, index) =>
            browseVenues({ limit: 50, page: index + 2, type: "Turf" })
          )
        );
        const listings = [firstPage, ...remainingPages].flatMap((page) => page.items);
        const available = new Set<string>();
        listings.forEach((venue) => {
          venue.categories?.forEach((item) => available.add(item.toLowerCase()));
          venue.subCategories?.forEach((item) => available.add(item.toLowerCase()));
        });
        setAvailableCategories(VENUE_CATEGORIES.filter((item) => available.has(item.id.toLowerCase()) || available.has(item.label.toLowerCase())));
      })
      .catch(() => setAvailableCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    browseVenues({ limit: 50, category: category || undefined, search: searchQuery || undefined })
      .then(async (result) => {
        setVenues(result.items);
        trackVenueSearch(category || searchQuery, category || undefined, undefined, result.items.length);
        const ids = Array.from(new Set(result.items.map((item) => item.vendorId).filter((id): id is string => Boolean(id))));
        const found = await Promise.all(ids.map((id) => getVendorProfile(id).then((value) => value.vendor).catch(() => null)));
        const next: Record<string, VendorPublicProfile> = {};
        found.forEach((profile) => { if (profile) next[profile._id] = profile; });
        setProfiles(next);
      })
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, [category, searchQuery]);

  const filters = useVenueFilters(venues.map(listingToVenue), searchQuery, category);

  const filteredListings = useMemo(() => {
    const validIds = new Set(filters.filteredVenues.map(v => v.id));
    return venues.filter(v => validIds.has(v._id));
  }, [venues, filters.filteredVenues]);

  const cards = useMemo<VenueCardData[]>(() => {
    const grouped = new Map<string, Listing[]>();
    const standalone: Listing[] = [];
    filteredListings.forEach((venue) => {
      if (!venue.vendorId) return standalone.push(venue);
      grouped.set(venue.vendorId, [...(grouped.get(venue.vendorId) ?? []), venue]);
    });
    const result: VenueCardData[] = [];
    grouped.forEach((listings, vendorId) => {
      if (listings.length === 1) {
        const item = listings[0];
        result.push({ id: item._id, href: `/venues/${item.slug || item._id}`, title: item.title, subtitle: profiles[vendorId]?.businessName, image: item.coverImage, city: item.city, price: item.price });
      } else {
        const profile = profiles[vendorId];
        result.push({ id: vendorId, href: `/venues/vendor/${vendorId}`, title: profile?.businessName ?? listings[0].title, image: profile?.poster || profile?.banner || listings[0].coverImage, city: profile?.city ?? listings[0].city, price: Math.min(...listings.map((item) => item.price)), badge: `${listings.length} venues` });
      }
    });
    standalone.forEach((item) => result.push({ id: item._id, href: `/venues/${item.slug || item._id}`, title: item.title, image: item.coverImage, city: item.city, price: item.price }));
    return result;
  }, [venues, profiles]);

  const selectedLabel = availableCategories.find((item) => item.id === category)?.label ?? category;
  const skeletons = Array.from({ length: 10 }, (_, index) => <VenuePosterCardSkeleton key={index} />);
  const venueCards = cards.map((card, index) => <VenuePosterCard key={card.id} priority={index < 4} {...card} />);



  const results = (
    <>
      <div className="flex items-center justify-between"><h2 className="text-base font-extrabold text-slate-900 sm:text-lg">Available sports</h2><button type="button" onClick={() => router.push("/venues")} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700"><RotateCcw className="h-3.5 w-3.5" /> All categories</button></div>
      <SportsCategoryBar categories={availableCategories} selectedId={category} variant="card" onSelectCategory={(id) => router.push(id ? `/venues?category=${id}` : "/venues")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{loading ? skeletons : venueCards}{!loading && cards.length === 0 && <p className="col-span-full rounded-3xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">No venues available for this sport yet.</p>}</div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50/60">
      <SiteHeader />
      <div className="border-b border-slate-100 bg-white px-4 py-2.5 sm:hidden"><div className="flex items-center justify-between"><div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800"><MapPin className="h-3.5 w-3.5" /> Udaipur, Rajasthan <ChevronDown className="h-3.5 w-3.5 text-slate-400" /></div><button type="button" aria-label="Current location" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"><Navigation className="h-4 w-4" /></button></div></div>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{category ? `${selectedLabel} near you` : "Turf & Games"}</h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Find and book the best venues near you.</p>
          </div>
          <button type="button" onClick={() => setFiltersOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-brand-600">
            <Settings2 className="h-5 w-5" />
          </button>
        </div>

        {categoriesLoading && <div className="h-1 w-full animate-pulse rounded-full bg-slate-100 mb-6" />}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {loading ? skeletons : venueCards}
          {!loading && cards.length === 0 && <p className="col-span-full rounded-3xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">No venues match your filters.</p>}
        </div>
      </main>
      {filtersOpen && <FiltersModal variant="venue" onClose={() => setFiltersOpen(false)} resultCount={cards.length} filters={filters} />}
    </div>
  );
}

export default function VenuesPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50" />}><VenuesPageInner /></Suspense>;
}
