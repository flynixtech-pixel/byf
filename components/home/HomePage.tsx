"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Gamepad2,
  MapPin,
  Sparkles,
  Table2,
  Disc2,
  Volleyball,
} from "lucide-react";
import { type Venue, listingToVenue } from "@/lib/venues";
import { browseVenues } from "@/lib/api/venues";
import { Hero } from "./Hero";
import { QuickActionsSection } from "./QuickActionsSection";
import { FoodAndBeverages } from "./FoodAndBeverages";
import { FindYourGames } from "./FindYourGames";
import { TopPlayersRanking } from "./TopPlayersRanking";
import { HowItWorks } from "./HowItWorks";
import { AdBanner } from "./AdBanner";
import { LastMinuteDealsSection } from "./LastMinuteDealsSection";
import { CommunityMatches } from "./CommunityMatches";
import { EventsAndOffers } from "./EventsAndOffers";
import { WhyBookYourVibe } from "./WhyBookYourVibe";
import { AboutUs } from "./AboutUs";
import { Testimonials } from "./Testimonials";
import { AppDownloadCTA } from "./AppDownloadCTA";
import { Footer } from "./Footer";
import { FiltersModal } from "./modals/FiltersModal";
import { SignupModal } from "./modals/SignupModal";
import { MobileHome } from "./mobile/MobileHome";
import { useVenueFilters } from "./useVenueFilters";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { OnboardingFlow } from "./OnboardingFlow";

const SPORTS = [
  { name: "Box Cricket", icon: Gamepad2, tone: "from-fuchsia-500 to-violet-600", category: "cricket" },
  { name: "Football", icon: Volleyball, tone: "from-blue-500 to-cyan-500", category: "football" },
  { name: "Badminton", icon: Table2, tone: "from-violet-500 to-indigo-600", category: "badminton" },
  { name: "Pickleball", icon: Table2, tone: "from-pink-500 to-rose-500", category: "pickleball" },
  { name: "Cricket", icon: Disc2, tone: "from-rose-500 to-orange-500", category: "cricket" },
  { name: "Tennis", icon: Table2, tone: "from-fuchsia-500 to-pink-500", category: "tennis" },
  { name: "Table Tennis", icon: Table2, tone: "from-indigo-500 to-violet-500", category: "table-tennis" },
];

const DEFAULT_TRENDING = [
  { name: "Arena 21", area: "Udaipole", sport: "Box Cricket", price: "₹1,200", accent: "from-fuchsia-500 to-violet-600", slug: "arena-21" },
  { name: "Pulse Court", area: "Fatehpura", sport: "Badminton", price: "₹780", accent: "from-blue-500 to-cyan-500", slug: "pulse-court" },
  { name: "Neon Club", area: "Hiran Magri", sport: "Tennis", price: "₹950", accent: "from-rose-500 to-orange-500", slug: "neon-club" },
];

// Only rendered once the player opens the challenge sheet, and pulls in
// jsPDF/html-to-image — code-split out of the initial home page bundle.
const ChallengeFlow = dynamic(
  () => import("@/components/challenges/ChallengeFlow").then((m) => m.ChallengeFlow),
  { ssr: false }
);

export default function HomePage() {
  const router = useRouter();
  const { status } = useCustomerAuth();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [joinInviteOpen, setJoinInviteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const filters = useVenueFilters(venues, search);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      setShowOnboarding(false);
      return;
    }

    if (typeof window === "undefined") return;
    try {
      const seen = sessionStorage.getItem("onboarding_seen");
      if (!seen) {
        sessionStorage.setItem("onboarding_seen", "true");
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } catch {
      setShowOnboarding(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "guest" && new URLSearchParams(window.location.search).get("join") === "player") {
      setJoinInviteOpen(true);
    }
  }, [status]);

  useEffect(() => {
    browseVenues({ limit: 30, type: "Turf" })
      .then((result) => {
        setVenues(result.items.map(listingToVenue));
      })
      .catch(() => {
        setVenues([]);
      });
  }, []);

  const openVenue = useCallback(
    (v: Venue) => router.push(`/venues/${v.slug || v.id}`),
    [router]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleQuickAction = useCallback(
    (taskId: string, gameId: string) => {
      const routes: Record<string, string> = {
        coaches: "/coaches",
        "challenge-a-friend": "/challenges",
        tournaments: "/tournaments",
        "near-me": "/venues",
        community: "/community",
        "book-now": "/venues",
        "find-players": "/community",
        offers: "/deals",
        venue: `/venues?category=${gameId}`,
        food: "/food",
        challenge: "/challenges",
      };
      router.push(routes[taskId] ?? "/venues");
    },
    [router]
  );

  const filteredVenuesNote = useMemo(() => {
    if (!search && filters.activeFilterCount === 0) return null;
    return filters.filteredVenues.length;
  }, [search, filters.activeFilterCount, filters.filteredVenues]);

  const handleOnboardingComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("onboarding_seen", "true");
      } catch {
        // Storage unavailable
      }
    }
    setShowOnboarding(false);
  }, []);

  if (showOnboarding === null) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  return (
    <div className="min-h-screen bg-[#f3f4fb] font-sans text-slate-950">
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      
      <Hero
        searchValue={search}
        onSearchChange={setSearch}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={filters.activeFilterCount}
      />

        {filteredVenuesNote !== null && (
          <p className="mx-auto mt-4 max-w-7xl px-4 text-sm text-slate-500 sm:px-6 lg:px-8">
            {filteredVenuesNote} venue(s) match &ldquo;{search}&rdquo;
          </p>
        )}

        {/* Find A Venue - Sports Section */}
        <section className="-mt-6 px-4 pb-8 sm:-mt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-white/70 bg-white/80 p-3.5 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/25 sm:h-11 sm:w-11 sm:rounded-2xl">
                <MapPin className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">Find A Venue</h2>
                <p className="text-xs text-slate-600 sm:text-sm">Discover top venues for every game and vibe.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-1.5 sm:mt-6 sm:gap-4 md:grid-cols-4 xl:grid-cols-7">
              {SPORTS.map((sport) => {
                const Icon = sport.icon;
                return (
                  <Link
                    key={sport.name}
                    href={`/venues?category=${sport.category}`}
                    className="group flex flex-col items-center text-center min-w-0 w-full overflow-hidden px-0.5"
                  >
                    <div
                      className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${sport.tone} text-white shadow-md transition group-hover:scale-105 sm:h-20 sm:w-20`}
                    >
                      <Icon className="h-5 w-5 sm:h-9 sm:w-9" />
                    </div>
                    <span className="mt-1.5 text-[10px] font-bold leading-tight text-slate-800 sm:mt-2.5 sm:text-xs sm:font-semibold text-center line-clamp-2 max-w-full break-words">
                      {sport.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quick Actions Shortcuts */}
        <QuickActionsSection
          onQuickAction={handleQuickAction}
          onViewAllQuickActions={() => router.push("/games")}
        />

        {/* Trending Venues Section */}
        <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-500 shadow-sm">
                  <span className="text-lg">🔥</span> HOT RIGHT NOW
                </span>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#3b1720] sm:text-5xl">
                  Trending <span className="text-[#d61f45]">Venues</span>
                </h2>
                <div className="mt-3 h-1 w-20 rounded-full bg-gradient-to-r from-[#ff5f7d] to-[#d61f45]" />
              </div>

              <p className="max-w-md text-base leading-7 text-slate-600">
                Popular spots loved by players like you. Book fast before slots fill up.
              </p>

              <Link href="/venues" className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                View All <span className="text-[#d61f45]">Venues</span>
                <ArrowRight className="h-5 w-5 text-[#d61f45]" />
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(venues.length > 0 ? venues.slice(0, 3) : DEFAULT_TRENDING).map((venue, idx) => {
                const isReal = "id" in venue;
                const name = isReal ? (venue as Venue).name : venue.name;
                const area = isReal ? (venue as Venue).area : (venue as any).area;
                const sport = isReal ? (venue as Venue).sport : (venue as any).sport;
                const price = isReal ? `₹${(venue as Venue).pricePerHour}` : (venue as any).price;
                const accent =
                  idx === 0
                    ? "from-fuchsia-500 to-violet-600"
                    : idx === 1
                    ? "from-blue-500 to-cyan-500"
                    : "from-rose-500 to-orange-500";
                const targetUrl = isReal ? `/venues/${(venue as Venue).slug || (venue as Venue).id}` : "/venues";

                return (
                  <article
                    key={name}
                    className="overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.25)] transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className={`h-44 bg-gradient-to-br ${accent} p-5 text-white`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">{sport}</p>
                          <h3 className="mt-2 text-2xl font-black">{name}</h3>
                        </div>
                        <div className="rounded-full border border-white/20 bg-white/10 p-2">
                          <Sparkles className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-10 flex items-center gap-2 text-sm text-white/90">
                        <MapPin className="h-4 w-4" />
                        {area}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Starting from</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">
                          {price}
                          <span className="text-sm font-medium text-slate-500"> / hour</span>
                        </p>
                      </div>
                      <Link
                        href={targetUrl}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Book Now
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <AdBanner />
        <LastMinuteDealsSection />

        <FindYourGames onSelectSport={() => router.push("/venues")} />

        <CommunityMatches
          onJoin={() => showToast("Joining Badminton Doubles match…")}
          onHost={() => router.push("/community")}
          onBookCoach={() => router.push("/coaches")}
          onViewAll={() => router.push("/community")}
          onLaunchChallenge={() => setChallengeOpen(true)}
        />

        <EventsAndOffers
          onViewAllEvents={() => router.push("/tournaments")}
        />

        <TopPlayersRanking />

        <FoodAndBeverages />

        <HowItWorks />

        <WhyBookYourVibe />

        <AboutUs />

        <Testimonials />

        <AppDownloadCTA />

      <Footer />

      {filtersOpen && (
        <FiltersModal
          onClose={() => setFiltersOpen(false)}
          resultCount={filters.filteredVenues.length}
          filters={filters}
        />
      )}
      {challengeOpen && <ChallengeFlow onClose={() => setChallengeOpen(false)} />}
      {joinInviteOpen && (
        <SignupModal
          onClose={() => setJoinInviteOpen(false)}
          onSignedUp={() => setJoinInviteOpen(false)}
          onSwitchToLogin={() => setJoinInviteOpen(false)}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}


