"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { MobileCard, MobileTopBar } from "@/components/mobile/ui";
import { browsePublicTournaments } from "@/lib/api/tournaments";
import { Tournament } from "@/lib/api/types";
import { EventCategoryFilter, EVENT_CATEGORIES } from "@/components/events/EventCategoryFilter";

function statusLabel(t: Tournament) {
  if (t.status === "Completed") return "Completed";
  if (t.status === "Ongoing") return "Ongoing";
  if (t.maxTeams && t.spotsLeft === 0) return "Full";
  if (t.maxTeams && t.spotsLeft !== undefined && t.spotsLeft <= 2) return "Filling Fast";
  return "Registration Open";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    _id: "tour-1",
    vendorId: "v-1",
    title: "Championship Badminton Cup 2026",
    category: "Sports",
    description: "Battle it out in the premier Badminton championship of Udaipur. Open to singles and doubles teams.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "One Arena, Shobhagpura",
    entryFee: 500,
    prizeMoney: 15000,
    startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    maxTeams: 32,
    registeredTeamsCount: 18,
    status: "Upcoming",
    fixtures: [],
    spotsLeft: 14,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tour-2",
    vendorId: "v-2",
    title: "Sunset VIP Cocktail Night & DJ Bash",
    category: "Alcoholic Party",
    description: "Exclusive rooftop sunset party with signature cocktails, live DJ sets, and craft drinks.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Skyline Rooftop Lounge",
    entryFee: 1500,
    prizeMoney: 0,
    startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    maxTeams: 100,
    registeredTeamsCount: 65,
    status: "Upcoming",
    fixtures: [],
    spotsLeft: 35,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tour-3",
    vendorId: "v-3",
    title: "Sober Social & Artisan Mocktail Jam",
    category: "Non-Alcoholic Party",
    description: "A high-vibe, zero-alcohol social evening with gourmet mocktails, live acoustic music, and board games.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "The Garden Cafe & Studio",
    entryFee: 499,
    prizeMoney: 0,
    startDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 4).toISOString(),
    maxTeams: 50,
    registeredTeamsCount: 38,
    status: "Upcoming",
    fixtures: [],
    spotsLeft: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tour-4",
    vendorId: "v-4",
    title: "Udaipur Founders & Investors Summit 2026",
    category: "Business",
    description: "Premier networking meet for startup founders, tech builders, and angel investors with panel discussions.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Taj Fateh Prakash Palace Convention Center",
    entryFee: 2499,
    prizeMoney: 50000,
    startDate: new Date(Date.now() + 86400000 * 12).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 13).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 9).toISOString(),
    maxTeams: 200,
    registeredTeamsCount: 140,
    status: "Upcoming",
    fixtures: [],
    spotsLeft: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tour-5",
    vendorId: "v-5",
    title: "Live Indie Music & Standup Comedy Showcase",
    category: "Performance",
    description: "An intimate night of live original indie music followed by top standup comedy acts.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Amphitheatre Cultural Club",
    entryFee: 799,
    prizeMoney: 0,
    startDate: new Date(Date.now() + 86400000 * 8).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 8).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    maxTeams: 120,
    registeredTeamsCount: 110,
    status: "Upcoming",
    fixtures: [],
    spotsLeft: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    browsePublicTournaments({ limit: 24 })
      .then((result) => {
        if (result.items && result.items.length > 0) {
          setTournaments(result.items);
        } else {
          setTournaments(MOCK_TOURNAMENTS);
        }
      })
      .catch(() => {
        setTournaments(MOCK_TOURNAMENTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTournaments = useMemo(() => {
    if (selectedCategory === "all") return tournaments;

    const catObj = EVENT_CATEGORIES.find((c) => c.id === selectedCategory);
    if (!catObj) return tournaments;

    const targetLabel = catObj.label.toLowerCase();

    return tournaments.filter((t) => {
      const tCat = (t.category || "").toLowerCase();
      const tTitle = (t.title || "").toLowerCase();
      const tDesc = (t.description || "").toLowerCase();

      return (
        tCat.includes(targetLabel) ||
        tCat.includes(catObj.id) ||
        targetLabel.includes(tCat) ||
        tTitle.includes(targetLabel) ||
        tDesc.includes(targetLabel)
      );
    });
  }, [tournaments, selectedCategory]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_42%,_#ffffff_78%)]">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden">
        <div className="px-4 pt-4">
          <MobileTopBar />
        </div>
        <main className="flex flex-col gap-5 px-4 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Events &amp; Experiences</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              Discover &amp; book events in seconds.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Parties, corporate summits, tournaments &amp; live performances near you.
            </p>
          </div>

          {/* Premium Category Filter Section */}
          <EventCategoryFilter
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <div className="flex flex-col gap-3 transition-all duration-300">
            {filteredTournaments.map((t) => (
              <MobileCard key={t._id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">
                      {t.category}
                    </p>
                    <h2 className="mt-1 text-base font-extrabold text-slate-950">{t.title}</h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                    {statusLabel(t)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-brand-50 px-3 py-1.5 font-semibold text-brand-700">
                    {formatDate(t.startDate)}
                  </span>
                  {!!t.prizeMoney && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                      Prize ₹{t.prizeMoney.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <Link
                  href={`/tournaments/${t._id}`}
                  className="rounded-full bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white transition active:scale-95"
                >
                  View &amp; Register
                </Link>
              </MobileCard>
            ))}
            {!loading && filteredTournaments.length === 0 && (
              <p className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500">
                No events found in this category right now.
              </p>
            )}
          </div>
        </main>
      </div>

      <main className="mx-auto hidden max-w-7xl px-4 py-10 sm:block sm:px-6 sm:py-14">
        <section className="rounded-[2rem] bg-gradient-to-br from-brand-500 via-accent-500 to-fuchsia-600 p-6 text-white shadow-[0_30px_90px_rgba(249,115,22,0.22)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/75">
            Events &amp; Tournaments
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Unforgettable experiences &amp; events.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
            Discover curated parties, corporate summits, tournaments, and live performances.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              Multi-category roster
            </span>
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              Instant RSVP
            </span>
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              Verified Hosts
            </span>
          </div>
        </section>

        {/* Desktop Premium Category Filter */}
        <div className="mt-8">
          <EventCategoryFilter
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-2 transition-all duration-300">
          {filteredTournaments.map((t) => (
            <article
              key={t._id}
              className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">
                    {t.category}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{t.title}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {statusLabel(t)}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-brand-50 px-4 py-2 font-semibold text-brand-700">
                  {formatDate(t.startDate)}
                </span>
                {!!t.prizeMoney && (
                  <span className="rounded-full bg-emerald-50 px-4 py-2 font-semibold text-emerald-700">
                    Prize ₹{t.prizeMoney.toLocaleString("en-IN")}
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-700">
                  {t.city}
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {t.maxTeams ? `${t.registeredTeamsCount}/${t.maxTeams} spots registered` : "Best suited for groups & squads."}
                </p>
                <Link
                  href={`/tournaments/${t._id}`}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                >
                  View &amp; Register
                </Link>
              </div>
            </article>
          ))}
          {!loading && filteredTournaments.length === 0 && (
            <p className="col-span-full rounded-[1.75rem] border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">
              No events found in this category right now.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

