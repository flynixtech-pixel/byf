"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgePercent,
  CalendarOff,
  Clock,
  MapPin,
  Navigation,
  Receipt,
  Sparkles,
  Share2,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MobileTopBar } from "@/components/mobile/ui";
import { LoginModal } from "@/components/home/modals/LoginModal";
import { SignupModal } from "@/components/home/modals/SignupModal";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { TableBookingSheet } from "./TableBookingSheet";
import { PayBillSheet } from "./PayBillSheet";
import { DineoutMap } from "./DineoutMap";
import type { FoodOutlet, MenuItem } from "@/lib/api/types";
import type { AuthMode } from "@/components/home/types";
import { DINING_SPOTS, getDiningMeta, mapMenuToSections } from "@/lib/dineout-catalog";

/** True when the restaurant is open right now per weekly hours + holiday calendar. */
function isOpenNow(outlet: FoodOutlet): boolean {
  const now = new Date();
  const todayKey = now.toDateString();
  if ((outlet.leaves ?? []).some((l) => new Date(l.date).toDateString() === todayKey && l.type === "full")) return false;
  const day = (outlet.weeklyAvailability ?? []).find((d) => d.day === now.getDay());
  if (!day) return true;
  if (!day.isOpen) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= day.startTime && hhmm <= day.endTime;
}

/**
 * Dineout restaurant page — the player side for partner cafes and restaurants near a venue.
 *
 * There's no cart here: the menu is reference only. A player books a table while they're
 * still at the turf, then settles the bill through the app for the restaurant's flat discount.
 */
export function DineoutRestaurant({ outlet, menu }: { outlet: FoodOutlet; menu: MenuItem[] }) {
  const { status: authStatus } = useCustomerAuth();
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  /** Which sheet to open once the player is signed in. */
  const [pendingAction, setPendingAction] = useState<"book" | "pay" | null>(null);
  const [sheet, setSheet] = useState<"book" | "pay" | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const open = isOpenNow(outlet);
  const dineout = outlet.dineout;
  const meta = useMemo(() => getDiningMeta(outlet), [outlet]);
  const flatPct = dineout?.flatDiscountPct ?? 0;
  const todayHours = outlet.weeklyAvailability?.find((d) => d.day === new Date().getDay());
  const menuSections = useMemo(() => (menu.length > 0 ? mapMenuToSections(menu) : meta.menuSections), [menu, meta.menuSections]);
  const similarRestaurants = useMemo(
    () => DINING_SPOTS.filter((spot) => spot.slug !== meta.slug).slice(0, 4),
    [meta.slug]
  );
  const gallery = outlet.gallery.length > 0 ? outlet.gallery : meta.gallery;

  const mapsHref = useMemo(() => {
    const { lat, lng, address } = outlet.location ?? {};
    if (lat !== undefined && lng !== undefined) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const q = [outlet.name, address, outlet.location?.city].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }, [outlet]);

  /** Both actions need an account — remember which one so the sheet opens after sign-in. */
  function requireAuth(action: "book" | "pay") {
    if (authStatus !== "authenticated") {
      setPendingAction(action);
      setAuthMode("login");
      return;
    }
    setSheet(action);
  }

  function handleAuthed() {
    setAuthMode(null);
    if (pendingAction) {
      setSheet(pendingAction);
      setPendingAction(null);
    }
  }

  function share() {
    const text = `${outlet.name} on Book Your Vibe${flatPct > 0 ? ` — flat ${flatPct}% off your bill` : ""}`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: outlet.name, text, url }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${url}`);
      setToast("Link copied to clipboard");
      setTimeout(() => setToast(null), 2500);
    }
  }

  const canBook = dineout?.tableBooking !== false;
  const canPay = dineout?.payBill !== false;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_45%,_#ffffff_82%)] pb-28">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>
      <div className="px-4 pt-4 sm:hidden">
        <MobileTopBar />
      </div>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[100] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xl">
          {toast}
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Poster */}
        {(meta.hero || outlet.poster || outlet.banner) && (
          <div className="relative mb-6 overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={outlet.poster || outlet.banner || meta.hero}
              alt={`${outlet.name} poster`}
              className="h-48 w-full object-cover sm:h-72"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <span
              className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${
                open ? "bg-emerald-500 text-white" : "bg-slate-900/90 text-white"
              }`}
            >
              {open ? "Open now" : "Closed"}
            </span>
            <button
              onClick={share}
              aria-label="Share restaurant"
              className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
                {meta.vibe}
              </span>
              <span className="rounded-full bg-brand-500 px-3 py-1.5 text-[11px] font-bold text-white">
                {meta.timings}
              </span>
            </div>
          </div>
        )}

        {/* Identity */}
        <div className="flex items-start gap-4">
          {outlet.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={outlet.logo}
              alt={outlet.name}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <UtensilsCrossed className="h-7 w-7" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{outlet.name}</h1>
            {outlet.cuisines.length > 0 && (
              <p className="truncate text-sm font-semibold text-brand-600">{outlet.cuisines.slice(0, 4).join(" · ")}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {(outlet.location?.area || outlet.location?.city) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {[outlet.location.area, outlet.location.city].filter(Boolean).join(", ")}
                </span>
              )}
              {todayHours?.isOpen && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Today {todayHours.startTime}–{todayHours.endTime}
                </span>
              )}
              {meta.distanceKm ? (
                <span className="flex items-center gap-1">
                  <Navigation className="h-3 w-3" /> {meta.distanceKm.toFixed(1)} km away
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" /> ₹{dineout?.costForTwo ?? meta.costForTwo} for two
              </span>
            </div>
          </div>
        </div>

        {outlet.description && <p className="mt-3 text-sm leading-relaxed text-slate-600">{outlet.description}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700">Booking ready</p>
            <p className="mt-1 text-sm font-extrabold text-slate-900">{meta.offers[0]}</p>
            <p className="mt-1 text-xs text-slate-600">Book a table before you arrive and keep the offer attached.</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">AI summary</p>
            <p className="mt-1 text-sm font-extrabold text-slate-900">Powered by BookYourVibe</p>
            <p className="mt-1 text-xs text-slate-600 line-clamp-2">{meta.aiSummary}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">DineCash</p>
            <p className="mt-1 text-sm font-extrabold text-slate-900">Earn cashback on bill payment</p>
            <p className="mt-1 text-xs text-slate-600">Apply coupons, bank offers, and wallet redemption during bill settlement.</p>
          </div>
        </div>

        {/* Offer strip */}
        {(flatPct > 0 || outlet.offer) && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {flatPct > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <BadgePercent className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-emerald-900">Flat {flatPct}% off</p>
                  <p className="text-[11px] font-semibold text-emerald-700">
                    On every bill paid through the app
                  </p>
                </div>
              </div>
            )}
            {outlet.offer && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Receipt className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-amber-900">{outlet.offer}</p>
                  <p className="text-[11px] font-semibold text-amber-700">Show your BYV booking</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upcoming closures */}
        {(outlet.leaves ?? []).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {outlet.leaves.map((l) => (
              <span
                key={l.date}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  l.type === "half" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                }`}
              >
                <CalendarOff className="h-3 w-3" />
                {new Date(l.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                {l.type === "half" ? " · Half-day" : " · Closed"}
              </span>
            ))}
          </div>
        )}

        {/* Menu — view only, no cart or quantity controls */}
        {menuSections.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-extrabold text-slate-900">Digital Menu</h2>
            <p className="text-xs text-slate-500">
              Reference only. Browse categories and item details, then book or pay at the restaurant.
            </p>
            <div className="mt-4 space-y-6">
              {menuSections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-600">
                    {section.title} <span className="font-normal text-slate-400">· {section.items.length}</span>
                  </h3>
                  {section.note && <p className="mt-1 text-[11px] font-semibold text-slate-400">{section.note}</p>}
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {section.items.map((item, i) => (
                      <div
                        key={`${section.title}-${item.name}-${i}`}
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                            {item.description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>}
                          </div>
                          <span className="shrink-0 text-sm font-extrabold text-slate-900">₹{item.price}</span>
                        </div>
                        {item.badge && (
                          <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photos */}
        {gallery.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-extrabold text-slate-900">Photos</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {gallery.slice(0, 6).map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightbox(url)}
                  className={`relative overflow-hidden rounded-2xl transition hover:opacity-90 ${
                    i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Restaurant" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  {i === 5 && gallery.length > 6 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-extrabold text-white">
                      +{gallery.length - 6}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Location */}
        {(outlet.location?.address || outlet.location?.city) && (
          <section className="mt-8">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900">Location</h2>
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get directions"
                className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Navigation className="h-4 w-4" />
                Directions
              </a>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {[outlet.location.address, outlet.location.area, outlet.location.city].filter(Boolean).join(", ")}
            </p>
            <div className="mt-3">
              <DineoutMap
                title={outlet.name}
                address={outlet.location.address}
                area={outlet.location.area}
                city={outlet.location.city}
                lat={outlet.location.lat}
                lng={outlet.location.lng}
                height={224}
              />
            </div>
          </section>
        )}

        {/* AI insights */}
        <section className="mt-8">
          <h2 className="text-lg font-extrabold text-slate-900">Restaurant insights by BookYourVibe AI</h2>
          <p className="mt-1 text-xs text-slate-500">A quick read on the vibe, based on ratings, offers, and guest feedback.</p>
          <div className="mt-3 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900">{meta.aiSummary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {meta.aiHighlights.map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">Customer reviews</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
              {meta.rating.toFixed(1)} ★ · {meta.reviewCount.toLocaleString("en-IN")} ratings
            </span>
          </div>
          <div className="mt-3 grid gap-3">
            {meta.reviews.map((review) => (
              <div key={`${review.author}-${review.visited}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{review.author}</p>
                    <p className="text-[11px] text-slate-400">{review.visited}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    {review.rating.toFixed(1)} ★
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Similar restaurants */}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">Similar restaurants</h2>
            <span className="text-xs font-semibold text-slate-400">Nearby picks with a similar vibe</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {similarRestaurants.map((spot) => (
              <Link key={spot.slug} href={`/food/${spot.slug}`} className="group rounded-2xl border border-slate-100 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={spot.hero} alt={spot.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{spot.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{spot.vibe}</p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                        {spot.rating.toFixed(1)} ★
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-[11px] text-slate-400">
                      {spot.features.slice(0, 3).join(" · ")}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-brand-600">Book Table · Pay Bill</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-16 z-50 border-t border-slate-100 bg-white p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] sm:bottom-0">
        <div className="mx-auto max-w-5xl">
          {flatPct > 0 && (
            <p className="mb-2 rounded-xl bg-emerald-50 py-2 text-center text-[11px] font-bold text-emerald-800">
              Flat {flatPct}% off when you pay your bill through the app
            </p>
          )}
          <div className="flex gap-2">
            {canBook && (
              <button
                onClick={() => requireAuth("book")}
                className={`rounded-2xl border-2 border-brand-500 bg-brand-50 py-3.5 text-sm font-extrabold text-brand-700 transition hover:bg-brand-100 ${
                  canPay ? "flex-1" : "w-full"
                }`}
              >
                Book a table
              </button>
            )}
            {canPay && (
              <button
                onClick={() => requireAuth("pay")}
                className={`rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:scale-[1.01] ${
                  canBook ? "flex-1" : "w-full"
                }`}
              >
                Pay bill now
              </button>
            )}
            {!canBook && !canPay && (
              <p className="w-full rounded-2xl bg-slate-100 py-3.5 text-center text-sm font-semibold text-slate-500">
                This restaurant isn&apos;t taking app bookings right now
              </p>
            )}
          </div>
        </div>
      </div>

      {sheet === "book" && <TableBookingSheet outlet={outlet} onClose={() => setSheet(null)} />}
      {sheet === "pay" && <PayBillSheet outlet={outlet} onClose={() => setSheet(null)} />}

      {lightbox && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Restaurant" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
        </div>
      )}

      {authMode === "login" && (
        <LoginModal
          onClose={() => setAuthMode(null)}
          onLoggedIn={handleAuthed}
          onSwitchToSignup={() => setAuthMode("signup")}
        />
      )}
      {authMode === "signup" && (
        <SignupModal
          onClose={() => setAuthMode(null)}
          onSignedUp={handleAuthed}
          onSwitchToLogin={() => setAuthMode("login")}
        />
      )}
    </div>
  );
}
