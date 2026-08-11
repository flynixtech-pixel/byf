"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Award, CalendarOff, Clock, Images, MapPin, UserRoundCog, Users, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { CoachBookingFlow } from "@/components/coach/CoachBookingFlow";
import { getPublicCoachById } from "@/lib/api/coaches";
import { ApiError } from "@/lib/api/client";
import { Coach, CoachBatch } from "@/lib/api/types";

const CoachMap = dynamic(() => import("@/components/coach/CoachMap").then((m) => m.CoachMap), { ssr: false });

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startingPrice(coach: Coach): number | null {
  const monthly = coach.batches.filter((b) => b.active).map((b) => b.priceMonthly).filter((p) => p > 0);
  if (monthly.length) return Math.min(...monthly);
  return coach.fees ?? null;
}

export default function CoachDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<CoachBatch | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    getPublicCoachById(id)
      .catch((err) => {
        if (!(err instanceof ApiError)) throw err;
        return null;
      })
      .then(setCoach)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-slate-400">Loading coach...</div>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <UserRoundCog className="mx-auto h-16 w-16 text-slate-300" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Coach not found</h1>
          <p className="mt-2 text-sm text-slate-500">This coach may no longer be listed.</p>
          <Link
            href="/coaches"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Browse all coaches
          </Link>
        </div>
      </div>
    );
  }

  const price = startingPrice(coach);
  const openDays = coach.weeklyAvailability?.filter((d) => d.isOpen) ?? [];
  const activeBatches = coach.batches.filter((b) => b.active);
  const hasLocation = typeof coach.location?.lat === "number" && typeof coach.location?.lng === "number";

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to coaches
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            {/* Profile */}
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  {coach.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coach.photoUrl} alt={coach.name} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-500">
                      {coach.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">{coach.name}</h1>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-brand-600">
                    {coach.categories?.length ? coach.categories.join(" · ") : coach.category}
                    {coach.subCategory ? ` · ${coach.subCategory}` : ""}
                  </p>
                  {typeof coach.experienceYears === "number" && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <Award className="h-3.5 w-3.5" /> {coach.experienceYears} years of experience
                    </p>
                  )}
                  {(coach.location?.area || coach.location?.city) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> {[coach.location.area, coach.location.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
              {coach.bio && <p className="mt-4 text-sm leading-relaxed text-slate-600">{coach.bio}</p>}
            </section>

            {/* Gallery */}
            {coach.gallery?.length > 0 && (
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  <Images className="h-5 w-5 text-brand-500" /> Gallery
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {coach.gallery.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox(url)}
                      className="aspect-square overflow-hidden rounded-xl border border-slate-100 transition hover:opacity-90"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Coach gallery" className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Batches */}
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <Users className="h-5 w-5 text-brand-500" /> Batches
              </h2>
              {activeBatches.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No batches available right now — check back soon.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {activeBatches.map((b) => {
                    const full = typeof b.spotsLeft === "number" && b.spotsLeft <= 0;
                    return (
                      <div key={b.id} className="rounded-2xl border border-slate-100 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{b.name}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock className="h-3.5 w-3.5" /> {b.startTime}–{b.endTime} · {b.days.map((d) => DAYS_SHORT[d]).join(", ")}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              {b.priceMonthly > 0 && <span className="font-semibold text-slate-700">₹{b.priceMonthly.toLocaleString("en-IN")}/mo</span>}
                              {b.priceYearly > 0 && <span className="font-semibold text-slate-700">₹{b.priceYearly.toLocaleString("en-IN")}/yr</span>}
                              {b.demoAvailable && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600">Demo available</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            {typeof b.spotsLeft === "number" && (
                              <p className={`text-xs font-bold ${full ? "text-rose-500" : b.spotsLeft <= 3 ? "text-amber-500" : "text-emerald-600"}`}>
                                {full ? "Full" : `${b.spotsLeft} left`}
                              </p>
                            )}
                            <button
                              disabled={full}
                              onClick={() => setSelectedBatch(b)}
                              className={`mt-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
                                full ? "cursor-not-allowed bg-slate-300" : "bg-gradient-to-r from-brand-500 to-brand-600 hover:scale-[1.02]"
                              }`}
                            >
                              {full ? "Full" : b.demoAvailable ? "Join / Demo" : "Join Batch"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Weekly hours */}
            {openDays.length > 0 && (
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  <Clock className="h-5 w-5 text-brand-500" /> Weekly Availability
                </h2>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {(coach.weeklyAvailability ?? []).map((d) => (
                    <div key={d.day} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-700">{DAYS[d.day]}</span>
                      <span className={d.isOpen ? "text-slate-500" : "text-rose-400"}>
                        {d.isOpen ? `${d.startTime}–${d.endTime}` : "Holiday"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming holidays */}
            {coach.leaves?.length > 0 && (
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  <CalendarOff className="h-5 w-5 text-rose-500" /> Upcoming Holidays
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {coach.leaves.map((l) => (
                    <span
                      key={l.date}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        l.type === "half" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {new Date(l.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {l.type === "half" ? " · Half-day" : ""}
                      {l.reason ? ` · ${l.reason}` : ""}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Starts from</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {price != null ? `₹${price.toLocaleString("en-IN")}` : "—"}
                {price != null && <span className="text-sm font-semibold text-slate-400"> /month</span>}
              </p>
              <p className="mt-3 text-sm text-slate-500">Pick a batch on the left and choose a demo, monthly or yearly plan.</p>
              <p className="mt-4 text-xs text-slate-400">{activeBatches.length} batch{activeBatches.length === 1 ? "" : "es"} available</p>
            </div>

            {hasLocation && (
              <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="mb-2 flex items-center gap-1.5 px-2 text-sm font-bold text-slate-900">
                  <MapPin className="h-4 w-4 text-brand-500" /> Location
                </p>
                <CoachMap lat={coach.location!.lat!} lng={coach.location!.lng!} />
                {coach.location?.address && <p className="mt-2 px-2 text-xs text-slate-500">{coach.location.address}</p>}
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedBatch && <CoachBookingFlow coach={coach} batch={selectedBatch} onClose={() => setSelectedBatch(null)} />}

      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Coach gallery" className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
    </div>
  );
}
