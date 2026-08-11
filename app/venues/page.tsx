"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "../../components/site-header";
import { MobileTopBar } from "@/components/mobile/ui";
import { VenuePosterCard } from "@/components/venue-poster-card";
import { browseVenues, getVendorProfile, type VendorPublicProfile } from "@/lib/api/venues";
import { Listing } from "@/lib/api/types";
import { categoryLabel } from "@/lib/taxonomy";
import { trackVenueSearch } from "@/lib/analytics";

/** One card on the browsing grid — either a single venue, or a business with
 * several venues (tap it to see all of them, à la a vendor's own storefront). */
interface VenueCard {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  image?: string;
  city?: string;
  price: number;
  badge?: string;
}

import { useRouter } from "next/navigation";
import { SPORT_CATEGORIES } from "@/lib/taxonomy";
import { SportsCategoryBar, SportCategoryItem } from "@/components/sports/SportsCategoryBar";

const EMOJI_MAP: Record<string, string> = {
  cricket: "🏏",
  football: "⚽",
  badminton: "🏸",
  pickleball: "🏓",
  tennis: "🎾",
  "table-tennis": "🏓",
  basketball: "🏀",
  volleyball: "🏐",
  swimming: "🏊",
  "snooker-pool": "🎱",
  skating: "🛼",
  "indoor-games": "🎮",
};

const VENUE_CATEGORIES: SportCategoryItem[] = SPORT_CATEGORIES.map((cat) => ({
  id: cat.id,
  label: cat.label,
  emoji: EMOJI_MAP[cat.id],
  image: cat.image,
}));

function VenuesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const [venues, setVenues] = useState<Listing[]>([]);
  const [vendorProfiles, setVendorProfiles] = useState<Record<string, VendorPublicProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Venues page shows only Turf & Game listings — Events have their own /events page
    browseVenues({ limit: 24, category: category || undefined, type: category ? undefined : "Turf" })
      .then(async (result) => {
        setVenues(result.items);
        trackVenueSearch(category || "All", category || undefined, undefined, result.items.length);
        // One business can list several turfs — fetch each distinct vendor's public
        // profile (business name + poster) so they can be grouped into one card.
        const vendorIds = Array.from(
          new Set(result.items.map((v) => v.vendorId).filter((id): id is string => Boolean(id)))
        );
        const profiles = await Promise.all(
          vendorIds.map((id) => getVendorProfile(id).then((r) => r.vendor).catch(() => null))
        );
        const map: Record<string, VendorPublicProfile> = {};
        profiles.forEach((p) => {
          if (p) map[p._id] = p;
        });
        setVendorProfiles(map);
      })
      .catch((err) => {
        console.error("Failed to load venues:", err);
      })
      .finally(() => setLoading(false));
  }, [category]);

  /** Group listings by vendor — a single-listing vendor opens straight to booking,
   * a multi-listing vendor opens its business profile (which lists all its venues). */
  const cards = useMemo<VenueCard[]>(() => {
    const byVendor = new Map<string, Listing[]>();
    const standalone: Listing[] = [];
    for (const v of venues) {
      if (v.vendorId) {
        const arr = byVendor.get(v.vendorId) ?? [];
        arr.push(v);
        byVendor.set(v.vendorId, arr);
      } else {
        standalone.push(v);
      }
    }

    const result: VenueCard[] = [];
    for (const [vendorId, listings] of byVendor) {
      if (listings.length === 1) {
        const l = listings[0];
        result.push({
          id: l._id,
          href: `/venues/${l.slug || l._id}`,
          title: l.title,
          subtitle: vendorProfiles[vendorId]?.businessName,
          image: l.coverImage,
          city: l.city,
          price: l.price,
        });
        continue;
      }
      const profile = vendorProfiles[vendorId];
      result.push({
        id: vendorId,
        href: `/venues/vendor/${vendorId}`,
        title: profile?.businessName ?? listings[0].title,
        image: profile?.poster || profile?.banner || listings[0].coverImage,
        city: profile?.city ?? listings[0].city,
        price: Math.min(...listings.map((l) => l.price)),
        badge: `${listings.length} venues`,
      });
    }
    for (const l of standalone) {
      result.push({
        id: l._id,
        href: `/venues/${l.slug || l._id}`,
        title: l.title,
        image: l.coverImage,
        city: l.city,
        price: l.price,
      });
    }
    return result;
  }, [venues, vendorProfiles]);

  const cardElements = cards.map((card) => <VenuePosterCard key={card.id} {...card} />);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_45%,_#ffffff_82%)]">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden">
        <div className="px-4 pt-4">
          <MobileTopBar />
        </div>
        <main className="flex flex-col gap-5 px-4 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Sports</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              Venues and events, all in one place.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Location, sport, and price — at a glance.
            </p>
          </div>

          <SportsCategoryBar
            categories={VENUE_CATEGORIES}
            selectedId={category}
            variant="card"
            onSelectCategory={(id) => {
              router.push(id ? `/venues?category=${id}` : "/venues");
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            {cardElements}
            {!loading && cards.length === 0 && (
              <p className="col-span-2 rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500">
                No venues available yet. Check back soon.
              </p>
            )}
          </div>
        </main>
      </div>

      <main className="mx-auto hidden max-w-7xl px-4 py-10 sm:block sm:px-6 sm:py-14">
        <section className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Sports</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Venues and events, all in one place.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Each card is built to surface the details people actually care about: location,
                sport type and price.
              </p>
            </div>
            <Link
              href="/games"
              className="inline-flex h-fit items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
            >
              Explore sports first
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {cardElements}
          {!loading && cards.length === 0 && (
            <p className="col-span-full rounded-[1.75rem] border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">
              No venues available yet. Check back soon.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">
                Booking flow
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Fewer taps, clearer info, faster confirmation.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
                Real-time booking
              </span>
              <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                Price at a glance
              </span>
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                Friendly UX
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function VenuesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <VenuesPageInner />
    </Suspense>
  );
}
