"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, MapPin, Navigation, RotateCcw, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SportsCategoryBar, type SportCategoryItem } from "@/components/sports/SportsCategoryBar";
import { VenuePosterCard, VenuePosterCardSkeleton } from "@/components/venue-poster-card";
import { browseVenues, getVendorProfile, type VendorPublicProfile } from "@/lib/api/venues";
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
  const [loading, setLoading] = useState(Boolean(category || searchQuery));

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
    if (!category && !searchQuery) {
      return;
    }
    browseVenues({ limit: 24, category: category || undefined, search: searchQuery || undefined })
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

  const cards = useMemo<VenueCardData[]>(() => {
    const grouped = new Map<string, Listing[]>();
    const standalone: Listing[] = [];
    venues.forEach((venue) => {
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

  const categoryGrid = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {availableCategories.map((sport) => (
        <button key={sport.id} type="button" onClick={() => router.push(`/venues?category=${encodeURIComponent(sport.id)}`)} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_16px_36px_-18px_rgba(127,29,29,0.4)] sm:p-5">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-rose-100 to-orange-50 transition group-hover:scale-125" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 bg-cover bg-center text-2xl" style={sport.image ? { backgroundImage: `url(${sport.image})` } : undefined}>{sport.image ? null : (sport.emoji || "🏅")}</span>
            <div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900 sm:text-base">{sport.label}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-brand-600">View venues <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></p></div>
          </div>
        </button>
      ))}
    </div>
  );

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
        <section className="rounded-2xl border border-rose-100 bg-gradient-to-r from-white via-rose-50/80 to-orange-50 px-4 py-3 shadow-[0_14px_40px_-28px_rgba(127,29,29,0.45)] sm:rounded-3xl sm:px-7 sm:py-5">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand-600 sm:text-[11px]"><Sparkles className="h-3.5 w-3.5" /> {category ? "Available venues" : "Pick your vibe"}</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{category ? `${selectedLabel} near you` : "Choose a sport. Find your venue."}</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Only categories with live bookable packages are shown.</p>
        </section>

        <section className="mt-5 space-y-4 sm:mt-6">{category || searchQuery ? results : <><div><h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">Available categories</h2><p className="mt-1 text-xs text-slate-500 sm:text-sm">Select a category to see its venues and packages.</p></div>{categoriesLoading ? <div className="h-52 animate-pulse rounded-3xl bg-slate-100" /> : availableCategories.length ? categoryGrid : <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">No bookable sports are available right now.</p>}</>}</section>
      </main>
    </div>
  );
}

export default function VenuesPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50" />}><VenuesPageInner /></Suspense>;
}
