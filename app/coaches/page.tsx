"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award } from "lucide-react";
import { SiteHeader } from "../../components/site-header";
import { MobileCard, MobileTopBar } from "@/components/mobile/ui";
import { browsePublicCoaches } from "@/lib/api/coaches";
import { Coach } from "@/lib/api/types";

function startingPrice(coach: Coach): number | null {
  const monthly = coach.batches?.filter((b) => b.active).map((b) => b.priceMonthly).filter((p) => p > 0) ?? [];
  if (monthly.length) return Math.min(...monthly);
  return coach.fees ?? null;
}

function priceLabel(coach: Coach): string {
  const p = startingPrice(coach);
  return p != null ? `₹${p.toLocaleString("en-IN")}/mo` : "View plans";
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    browsePublicCoaches({ limit: 24 })
      .then((result) => setCoaches(result.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_45%,_#ffffff_80%)]">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden">
        <div className="px-4 pt-4">
          <MobileTopBar />
        </div>
        <main className="flex flex-col gap-5 px-4 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Coaches</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Book a coach, not just a slot.</h1>
            <p className="mt-2 text-sm text-slate-500">Pick a coach, see their open slots, book live.</p>
          </div>

          <div className="flex flex-col gap-3">
            {coaches.map((coach) => (
              <Link key={coach._id} href={`/coaches/${coach.slug || coach._id}`}>
                <MobileCard className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-slate-50 to-slate-100">
                    {coach.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coach.photoUrl} alt={coach.name} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-base font-bold text-slate-500">
                        {coach.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-slate-950">{coach.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {coach.category}
                      {coach.subCategory ? ` · ${coach.subCategory}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{priceLabel(coach)}</p>
                  </div>
                </MobileCard>
              </Link>
            ))}
            {!loading && coaches.length === 0 && (
              <p className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500">
                No coaches listed yet. Check back soon.
              </p>
            )}
          </div>
        </main>
      </div>

      <main className="mx-auto hidden max-w-7xl px-4 py-10 sm:block sm:px-6 sm:py-14">
        <section className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Coaches</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Learn from a coach — book a session live.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Every coach here is added and vetted by a venue owner, with real open slots you can book
            straight away — no back-and-forth on WhatsApp.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coaches.map((coach) => (
            <Link
              key={coach._id}
              href={`/coaches/${coach.slug || coach._id}`}
              className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  {coach.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coach.photoUrl} alt={coach.name} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-base font-bold text-slate-500">
                      {coach.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-slate-950">{coach.name}</h2>
                  <p className="text-sm text-slate-500">
                    {coach.category}
                    {coach.subCategory ? ` · ${coach.subCategory}` : ""}
                  </p>
                  {typeof coach.experienceYears === "number" && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-600">
                      <Award className="h-3.5 w-3.5" /> {coach.experienceYears} yrs experience
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-lg font-bold text-slate-950">{priceLabel(coach)}</span>
                <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">View & Book</span>
              </div>
            </Link>
          ))}
          {!loading && coaches.length === 0 && (
            <p className="col-span-full rounded-[1.75rem] border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">
              No coaches listed yet. Check back soon.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
