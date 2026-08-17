"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Navigation, RotateCcw } from "lucide-react";
import { SiteHeader } from "../../components/site-header";
import { VenuePosterCard, VenuePosterCardSkeleton } from "@/components/venue-poster-card";
import { browseVenues, getVendorProfile, getListingImage, type VendorPublicProfile } from "@/lib/api/venues";
import { Listing } from "@/lib/api/types";
import { EventCategoryFilter, EVENT_CATEGORIES } from "@/components/events/EventCategoryFilter";
import { AllEventsModal } from "@/components/events/AllEventsModal";

function eventBadge(event: Listing): string | undefined {
  if (typeof event.spotsLeft === "number") return `${event.spotsLeft} spots left`;
  return undefined;
}

interface EventCardItem {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  image?: string;
  city?: string;
  price?: number;
  badge?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Listing[]>([]);
  const [vendorProfiles, setVendorProfiles] = useState<Record<string, VendorPublicProfile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allEventsModalOpen, setAllEventsModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    browseVenues({ type: "Event", limit: 24 })
      .then(async (result) => {
        // Ensure only Event type listings are displayed
        const eventItems = result.items.filter((item) => !item.type || item.type === "Event");
        setEvents(eventItems);

        const vendorIds = Array.from(
          new Set(eventItems.map((v) => v.vendorId).filter((id): id is string => Boolean(id)))
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
        console.error("Failed to load events:", err);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === "all") return events;

    const catObj = EVENT_CATEGORIES.find((c) => c.id === selectedCategory);
    if (!catObj) return events;

    const targetLabel = catObj.label.toLowerCase();

    return events.filter((e) => {
      const catsStr = (e.categories || []).join(" ").toLowerCase();
      const subCatsStr = (e.subCategories || []).join(" ").toLowerCase();
      const titleStr = (e.title || "").toLowerCase();
      const descStr = (e.description || "").toLowerCase();

      return (
        catsStr.includes(targetLabel) ||
        catsStr.includes(catObj.id) ||
        subCatsStr.includes(targetLabel) ||
        subCatsStr.includes(catObj.id) ||
        titleStr.includes(targetLabel) ||
        descStr.includes(targetLabel) ||
        (catObj.id === "alcoholic-party" &&
          (titleStr.includes("party") || titleStr.includes("daru") || titleStr.includes("pub") || descStr.includes("alcohol"))) ||
        (catObj.id === "non-alcoholic-party" &&
          (titleStr.includes("sober") || titleStr.includes("mocktail") || descStr.includes("non-alcoholic") || descStr.includes("family"))) ||
        (catObj.id === "business" &&
          (titleStr.includes("business") || titleStr.includes("summit") || titleStr.includes("corporate") || descStr.includes("networking"))) ||
        (catObj.id === "sports" &&
          (titleStr.includes("sports") || titleStr.includes("fitness") || titleStr.includes("marathon") || titleStr.includes("cricket") || descStr.includes("fitness"))) ||
        (catObj.id === "performance" &&
          (titleStr.includes("performance") || titleStr.includes("comedy") || titleStr.includes("show") || titleStr.includes("music") || descStr.includes("comedy")))
      );
    });
  }, [events, selectedCategory]);

  const cards = useMemo<EventCardItem[]>(() => {
    const byVendor = new Map<string, Listing[]>();
    const standalone: Listing[] = [];

    for (const e of filteredEvents) {
      if (e.vendorId) {
        const arr = byVendor.get(e.vendorId) ?? [];
        arr.push(e);
        byVendor.set(e.vendorId, arr);
      } else {
        standalone.push(e);
      }
    }

    const result: EventCardItem[] = [];
    for (const [vendorId, listings] of byVendor) {
      if (listings.length === 1) {
        const l = listings[0];
        result.push({
          id: l._id,
          href: `/venues/${l.slug || l._id}`,
          title: l.title,
          subtitle: vendorProfiles[vendorId]?.businessName,
          image: getListingImage(l, "poster") || vendorProfiles[vendorId]?.poster || vendorProfiles[vendorId]?.banner,
          city: l.city,
          price: l.price > 0 ? l.price : undefined,
          badge: eventBadge(l),
        });
        continue;
      }
      const profile = vendorProfiles[vendorId];
      const validPrices = listings.map((l) => l.price).filter((p) => p > 0);
      result.push({
        id: vendorId,
        href: `/venues/vendor/${vendorId}`,
        title: profile?.businessName ?? listings[0].title,
        image: profile?.poster || profile?.banner || getListingImage(listings[0], "poster"),
        city: profile?.city ?? listings[0].city,
        price: validPrices.length > 0 ? Math.min(...validPrices) : undefined,
        badge: `${listings.length} events`,
      });
    }

    for (const l of standalone) {
      result.push({
        id: l._id,
        href: `/venues/${l.slug || l._id}`,
        title: l.title,
        image: getListingImage(l, "poster"),
        city: l.city,
        price: l.price > 0 ? l.price : undefined,
        badge: eventBadge(l),
      });
    }

    return result;
  }, [filteredEvents, vendorProfiles]);

  const cardElements = cards.map((card, idx) => (
    <VenuePosterCard key={card.id} priority={idx < 4} {...card} />
  ));

  const skeletonElements = useMemo(
    () => Array.from({ length: 10 }).map((_, i) => <VenuePosterCardSkeleton key={i} />),
    []
  );

  return (
    <div className="min-h-screen bg-slate-50/60">
      <SiteHeader />

      <div className="sm:hidden">
        {/* Top Location Selector Pill */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-slate-100">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs cursor-pointer hover:bg-slate-100 transition">
            <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Udaipur, Rajasthan</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </div>
          <button
            type="button"
            aria-label="Current location"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs shrink-0"
          >
            <Navigation className="h-4 w-4 text-slate-700" />
          </button>
        </div>

        <main className="flex flex-col gap-4 px-4 pt-3 pb-5">
          {/* Header */}
          <div>
            <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-brand-600 border border-brand-100/80">
              THE VIBE RADAR
            </span>
            <h1 className="font-display mt-1 text-xl font-bold text-slate-900 tracking-tight leading-tight">
              The scene. The squad. The vibe.
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              From high-energy mix-ups to underground parties—RSVP in seconds and skip the line.
            </p>
          </div>

          {/* Categories Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Categories</h2>
                {selectedCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-rose-100 hover:text-rose-600 transition cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Filter
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAllEventsModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline cursor-pointer"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <EventCategoryFilter
              selectedCategoryId={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Events Grid Header & Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Events near you</h2>
                {selectedCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-rose-100 hover:text-rose-600 transition cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Filter
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {loading ? skeletonElements : cardElements}
              {!loading && cards.length === 0 && (
                <div className="col-span-full rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-2xs space-y-3">
                  <p className="font-semibold text-slate-600">No events found in this category right now.</p>
                  {selectedCategory !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("all")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-brand-700 transition active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <main className="mx-auto hidden max-w-7xl px-4 py-10 sm:block sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">The Vibe Radar</p>
          <h1 className="font-display mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            The scene. The squad. The vibe.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
            From high-energy mix-ups to underground parties—RSVP in seconds and skip the line.
          </p>
        </div>

        {/* Desktop Category Filter */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-slate-900">Categories</h2>
            <button
              type="button"
              onClick={() => setAllEventsModalOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline cursor-pointer"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <EventCategoryFilter
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Events near you</h2>
          {selectedCategory !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-rose-100 hover:text-rose-600 transition cursor-pointer active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
            </button>
          )}
        </div>

        <section className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 transition-all duration-300">
          {loading ? skeletonElements : cardElements}
          {!loading && cards.length === 0 && (
            <div className="col-span-full rounded-[1.75rem] border border-slate-100 bg-white p-10 text-center text-sm text-slate-500 space-y-3">
              <p className="font-semibold text-slate-600">No events found in this category right now.</p>
              {selectedCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-brand-700 transition active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <AllEventsModal
        isOpen={allEventsModalOpen}
        onClose={() => setAllEventsModalOpen(false)}
        selectedId={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
    </div>
  );
}

