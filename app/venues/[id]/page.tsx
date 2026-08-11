"use client";

/* ------------------------------------------------------------------ */
/*  VENUE DETAIL PAGE  —  /venues/[id]                                 */
/*                                                                     */
/*  Opened when a user taps "Book Now" (or a card) on Trending Venues. */
/*  Its "Book Now" launches the real booking flow (review -> confirm). */
/* ------------------------------------------------------------------ */

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  CalendarDays,
  ChevronDown,
  ListChecks,
  HelpCircle,
  Share2,
  ArrowLeft,
  Building2,
  UserRoundCog,
  Store,
  Heart,
  Star,
  Clock,
  ParkingCircle,
  Droplets,
  Wifi,
  Utensils,
  ShowerHead,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  MessageSquareText,
  Ruler,
  Lightbulb,
  Layers,
  Users2,
  GraduationCap,
  Crop,
  ArrowUpDown,
  Grid,
} from "lucide-react";
import { browsePublicCoaches } from "@/lib/api/coaches";
import type { Coach } from "@/lib/api/types";
import { SiteHeader } from "@/components/site-header";
import BookingFlow, { type DealContext } from "@/components/booking-flow";
import { ImageCarousel } from "@/components/ImageCarousel";
import {
  BookedRange,
  browseVenues,
  getVenueAvailability,
  getVenueById,
  VendorPublicProfile,
  getListingImage,
  getVenueReviews,
  createVenueReview,
  type Review,
} from "@/lib/api/venues";
import { ApiError } from "@/lib/api/client";
import { Listing } from "@/lib/api/types";
import { categoryLabel, matchesCourtSport } from "@/lib/taxonomy";
import { trackVenueView } from "@/lib/analytics";

const DEFAULT_HIGHLIGHTS = ["Well-maintained facility", "Floodlit for evening play", "Easy online booking"];
const DEFAULT_INCLUSIONS = ["Venue access", "Drinking water", "Changing room"];
const DEFAULT_EXCLUSIONS = ["Personal gear", "Food & beverages", "Coaching"];

/** Itinerary (day-by-day plan) + FAQs added in the event form. Shared by the desktop and
 * mobile event views so whatever an organizer fills in shows to the customer. */
function EventItineraryFaqs({ itinerary, faqs }: Pick<Listing, "itinerary" | "faqs">) {
  if ((itinerary?.length ?? 0) === 0 && (faqs?.length ?? 0) === 0) return null;
  return (
    <>
      {itinerary?.length > 0 && (
        <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 sm:text-lg">
            <ListChecks className="h-5 w-5 text-brand-500" /> Itinerary
          </h2>
          <ol className="mt-4 space-y-4">
            {itinerary.map((d, i) => (
              <li key={i} className="relative border-l-2 border-brand-100 pl-5">
                <span className="absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                  {d.day || i + 1}
                </span>
                <p className="text-sm font-bold text-slate-900">{d.title || `Day ${d.day || i + 1}`}</p>
                {d.description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{d.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {faqs?.length > 0 && (
        <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 sm:text-lg">
            <HelpCircle className="h-5 w-5 text-brand-500" /> FAQs
          </h2>
          <div className="mt-3 divide-y divide-slate-100">
            {faqs.map((f, i) => (
              <details key={i} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                  {f.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Reads the `?deal=1&date=&sport=&courtId=&slot=` query params a Last Minute Deal card
 * deep-links with. Isolated in its own component so only this tiny piece needs the
 * Suspense boundary `useSearchParams` requires, not the whole (already large) page. */
function DealQueryParamsReader({ onDeal }: { onDeal: (ctx: DealContext) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("deal") !== "1") return;
    const date = searchParams.get("date");
    const slot = searchParams.get("slot");
    const sport = searchParams.get("sport");
    if (!date || !slot || !sport) return;
    onDeal({ date, slotStart: slot, sport, courtId: searchParams.get("courtId") ?? undefined });
    // Runs once per navigation — onDeal is a stable useCallback from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  return null;
}

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [venue, setVenue] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedSportForBooking, setSelectedSportForBooking] = useState<string>("");
  const [dealContext, setDealContext] = useState<DealContext | undefined>(undefined);
  // Desktop sport picker (the mobile shell owns its own copy of this state).
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [sportModalOpen, setSportModalOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleDeal = useCallback((ctx: DealContext) => {
    setDealContext(ctx);
    setSelectedSportForBooking(ctx.sport);
    setSelectedSport(ctx.sport);
    setBooking(true);
  }, []);

  useEffect(() => {
    getVenueReviews(id)
      .then((res) => setReviews(res))
      .catch(() => {});
  }, [id]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      setReviewError("Please fill out all fields.");
      return;
    }
    if (reviewComment.trim().length < 5) {
      setReviewError("Review comment must be at least 5 characters.");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const newReview = await createVenueReview(id, {
        customerName: reviewName,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviews((prev) => [newReview, ...prev]);
      setReviewSuccess(true);
      setReviewName("");
      setReviewComment("");
      setReviewRating(5);
      
      // Update local listing rating/count dynamically
      if (venue) {
        const newCount = (venue.reviewCount || 0) + 1;
        const currentSum = (venue.rating || 0) * (venue.reviewCount || 0);
        const newRating = Math.round(((currentSum + reviewRating) / newCount) * 10) / 10;
        setVenue({
          ...venue,
          rating: newRating,
          reviewCount: newCount,
        });
      }
    } catch (err: any) {
      setReviewError(err?.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    getVenueById(id)
      .catch((err) => {
        if (!(err instanceof ApiError)) throw err;
        return null;
      })
      .then((res) => {
        setVenue(res);
        if (res) {
          trackVenueView(res._id, res.title, res.categories?.[0]);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-slate-400">Loading venue...</div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <Building2 className="mx-auto h-16 w-16 text-slate-300" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
            Venue not found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This venue may have been removed or the link is incorrect.
          </p>
          <Link
            href="/venues"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Browse all venues
          </Link>
        </div>
      </div>
    );
  }

  const isEvent = venue.type === "Event";
  const highlights = getVenueHighlights(venue);
  const inclusions = venue.inclusions.length > 0 ? venue.inclusions : DEFAULT_INCLUSIONS;
  const exclusions = venue.exclusions.length > 0 ? venue.exclusions : DEFAULT_EXCLUSIONS;
  const desktopAmenities = inclusions.map((item) => {
    const match = AMENITY_ICON_RULES.find((rule) => rule.keywords.some((k) => item.toLowerCase().includes(k)));
    return { label: item, Icon: match?.icon ?? Layers };
  });
  const categoryText = venue.categories.map(categoryLabel).join(", ") || "General";
  // Cards elsewhere show the poster. The detail-page hero shows a scrollable
  // gallery built from the banner + any extra gallery photos, falling back to
  // the universal/poster image alone when nothing else was uploaded.
  const bannerUrl = getListingImage(venue, "banner");
  const galleryPhotos = venue.images.map((img) => img.url).filter(Boolean);
  const allImageUrls = Array.from(new Set([bannerUrl, ...galleryPhotos].filter(Boolean))) as string[];
  const fallbackUrl = getListingImage(venue, "fallback");
  const galleryImages = allImageUrls.length > 0 ? allImageUrls.slice(0, 10) : (fallbackUrl ? [fallbackUrl] : []);
  console.log("DEBUG VENUE:", venue.title, "images:", venue.images, "allImageUrls:", allImageUrls, "galleryImages:", galleryImages);

  const reviewProps = {
    reviews,
    reviewName,
    reviewRating,
    reviewComment,
    submittingReview,
    reviewSuccess,
    reviewError,
    onNameChange: setReviewName,
    onRatingChange: setReviewRating,
    onCommentChange: setReviewComment,
    onSubmitReview: handleAddReview,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden">
        <MobileVenueDetail
          venue={venue}
          highlights={highlights}
          inclusions={inclusions}
          categoryText={categoryText}
          galleryImages={galleryImages}
          onOpenBooking={(sport) => {
            setSelectedSportForBooking(sport);
            setBooking(true);
          }}
          favorite={favorite}
          onToggleFavorite={() => setFavorite((v) => !v)}
          reviewProps={reviewProps}
        />
      </div>

      <main className="mx-auto hidden max-w-7xl px-4 py-6 sm:block sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to venues
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFavorite((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600 cursor-pointer"
            >
              <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-accent-500 text-accent-500" : "text-slate-400"}`} />
              {favorite ? "Favourited" : "Favourite"}
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600 cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" /> Share Venue
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          {/* LEFT — details */}
          <div>
            {/* Hero gallery */}
            <div className="relative h-[400px] w-full overflow-hidden rounded-3xl bg-slate-100 border border-slate-100 shadow-md mb-6">
              <ImageCarousel images={galleryImages} alt={venue.title} className="h-full w-full" />
            </div>

            {venue.videoUrl && (
              <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  🎥 Event Video
                </h2>
                <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-black border border-slate-100 shadow-sm">
                  {venue.videoUrl.includes("youtube.com") || venue.videoUrl.includes("youtu.be") ? (
                    <iframe
                      src={getYouTubeEmbedUrl(venue.videoUrl)}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : venue.videoUrl.includes("vimeo.com") ? (
                    <iframe
                      src={getVimeoEmbedUrl(venue.videoUrl)}
                      className="h-full w-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <video src={venue.videoUrl} controls className="h-full w-full" />
                  )}
                </div>
              </section>
            )}

            {/* Same info the mobile view shows — specs, weather, sports, amenities, players, reviews. */}
            {!isEvent && (
              <VenueInfoSections
                venue={venue}
                highlights={highlights}
                amenities={desktopAmenities}
                onPickSport={(sport) => {
                  setSelectedSport(sport);
                  setSelectedSportForBooking(sport);
                  setBooking(true);
                }}
                reviewProps={reviewProps}
              />
            )}

            {isEvent && (
              <>
                {/* Highlights */}
                <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                    <CheckCircle2 className="h-5 w-5 text-brand-500" /> Highlights
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {highlights.map((h) => (
                      <div key={h} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500" />
                        {h}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Inclusions / exclusions */}
                <section className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" /> What&apos;s Included
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {inclusions.map((i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                      <XCircle className="h-5 w-5 text-accent-500" /> What&apos;s Not Included
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {exclusions.map((e) => (
                        <li key={e} className="flex items-center gap-2 text-sm text-slate-700">
                          <XCircle className="h-4 w-4 shrink-0 text-accent-400" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Itinerary + FAQs from the event form */}
                <EventItineraryFaqs itinerary={venue.itinerary} faqs={venue.faqs} />
              </>
            )}

            {/* Location / Live Map Section */}
            {venue.address && (
              <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  <MapPin className="h-5 w-5 text-brand-500" /> Location &amp; Directions
                </h2>
                <p className="mt-2 text-sm text-slate-600 font-medium">{venue.address}</p>
                
                <div className="mt-4 w-full h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-50">
                  <iframe
                    title="Venue Location Map"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(venue.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </section>
            )}

            {/* Summary — placed at the end after map */}
            <VenueSummaryCard description={venue.description} title={venue.title} />
          </div>

          {/* RIGHT — sticky booking card */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-extrabold text-slate-900">{venue.title}</h1>
                {venue.reviewCount && venue.reviewCount > 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white animate-in fade-in duration-300">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {venue.rating?.toFixed(1)}
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    No ratings
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                {categoryText} · {venue.city}
              </p>

              <p className="mt-4 text-2xl font-black text-slate-900">
                ₹{venue.price.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Starting price</p>

              <div className="mt-4 space-y-2 border-y border-slate-100 py-4 text-sm text-slate-600">
                {isEvent && venue.availableFrom && (
                  <p className="flex items-center gap-2 font-semibold text-slate-800">
                    <CalendarDays className="h-4 w-4 text-brand-500" />
                    {new Date(venue.availableFrom).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    {(venue.reportingStartTime || venue.reportingEndTime) && (
                      <span className="text-slate-500">
                        · {venue.reportingStartTime ?? "—"}{venue.reportingEndTime ? `–${venue.reportingEndTime}` : ""}
                      </span>
                    )}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  {venue.city} · {venue.address}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Always let the player pick the sport first — even without scrolling
                  // to "Sports Available" they must know what they're booking.
                  const sports = venueSports(venue);
                  if (!isEvent && sports.length > 1) {
                    setSportModalOpen(true);
                  } else {
                    setSelectedSportForBooking(sports.length === 1 ? categoryLabel(sports[0]) : "");
                    setBooking(true);
                  }
                }}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-brand-500/30 transition hover:scale-[1.01]"
              >
                Book Now
              </button>
            </div>

            {venue.vendorId && (
              <Link
                href={`/venues/vendor/${venue.vendorId}`}
                className="mt-4 flex items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                  <Store className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">View vendor profile</span>
                  <span className="block text-xs text-slate-500">See all turfs &amp; games from this vendor</span>
                </span>
              </Link>
            )}

            {/* Coaching belongs to a venue, not to an Event — same rule as the Academy tab. */}
            {venue.type !== "Event" && (
              <Link
                href="/coaches"
                className="mt-4 flex items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                  <UserRoundCog className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">Want a coach here?</span>
                  <span className="block text-xs text-slate-500">Browse coaches and book a session</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Desktop sport picker — mobile renders its own inside MobileVenueDetail. */}
      {sportModalOpen && (
        <SportPickerSheet
          venue={venue}
          selectedSport={selectedSport}
          onSelect={setSelectedSport}
          onClose={() => setSportModalOpen(false)}
          onContinue={(sport) => {
            const chosen = sport || selectedSport;
            setSportModalOpen(false);
            setSelectedSportForBooking(chosen);
            setBooking(true);
          }}
        />
      )}

      {booking && (
        <BookingFlow
          listing={venue}
          onClose={() => setBooking(false)}
          selectedSport={selectedSportForBooking}
          dealContext={dealContext}
        />
      )}

      <Suspense fallback={null}>
        <DealQueryParamsReader onDeal={handleDeal} />
      </Suspense>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SHARED venue sections — rendered on BOTH mobile and desktop         */
/* ------------------------------------------------------------------ */

/** Emoji per sport. Single source for the grid and the picker sheet. */
function sportEmoji(sportName: string): string {
  const l = sportName.toLowerCase();
  if (l.includes("badminton")) return "🏸";
  if (l.includes("cricket")) return "🏏";
  if (l.includes("turf") || l.includes("football")) return "⚽";
  if (l.includes("pickleball")) return "🏓";
  // Before the generic "tennis" test, which would otherwise claim table tennis.
  if (l.includes("table tennis")) return "🏓";
  if (l.includes("tennis")) return "🎾";
  if (l.includes("basketball")) return "🏀";
  if (l.includes("swim")) return "🏊";
  if (l.includes("volleyball")) return "🏐";
  if (l.includes("skating")) return "⛸️";
  if (l.includes("snooker") || l.includes("pool")) return "🎱";
  return "🎯";
}

/** Only the sports this vendor actually added on the listing — no invented defaults. */
function venueSports(venue: Listing): string[] {
  return venue.categories ?? [];
}

/** Self-contained so both layouts can drop it in without duplicating the fetch. */
function LocalWeatherCard({ city }: { city: string }) {
  const weather = useCityWeather(city);
  if (weather.loading) return <div className="mt-3 h-24 animate-pulse rounded-2xl bg-slate-100" />;
  if (weather.error || !weather.current) return null;
  return (
    <div className="mt-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white shadow-lg shadow-brand-500/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-black">{weather.current.temp}°</p>
          <p className="text-xs font-semibold text-white/80">{weatherLabel(weather.current.code)}</p>
        </div>
        {weatherIcon(weather.current.code, "h-10 w-10")}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3">
        {weather.days.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-white/80">{d.label}</span>
            {weatherIcon(d.code, "h-4 w-4")}
            <span className="text-xs font-bold">{d.tempMax}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getVenueHighlights(venue: Listing): string[] {
  if (venue.highlights && venue.highlights.length >= 4) {
    return venue.highlights;
  }
  const sports = venueSports(venue).map(categoryLabel);
  const items: string[] = [...(venue.highlights ?? [])];

  if (sports.length > 0 && !items.some((i) => i.toLowerCase().includes("sport"))) {
    items.push(`${sports.length} sport${sports.length > 1 ? "s" : ""} on one campus — ${sports.slice(0, 7).join(", ")}`);
  }
  const courtsCount = (venue.courts ?? []).filter((c) => c.active !== false).length;
  if (courtsCount > 0 && !items.some((i) => i.toLowerCase().includes("court"))) {
    items.push(`${courtsCount} bookable court${courtsCount > 1 ? "s" : ""} with professional surface and floodlights`);
  }
  if (!items.some((i) => i.toLowerCase().includes("booking"))) {
    items.push("Instant slot reservation & automated QR check-in");
  }
  if (venue.inclusions && venue.inclusions.length > 0) {
    for (const inc of venue.inclusions) {
      if (!items.includes(inc)) items.push(inc);
    }
  }
  if (!items.some((i) => i.toLowerCase().includes("parking"))) {
    items.push("Free parking, clean changing rooms & drinking water");
  }
  return items;
}

function VenueSummaryCard({ description, title }: { description?: string; title?: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = description?.trim() || `Welcome to ${title || "this venue"}. Book court slots live with instant confirmation.`;
  const isLong = text.length > 150;

  return (
    <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-900">Summary</h2>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 transition"
          >
            {expanded ? "Show Less ↑" : "Show More ↓"}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
        {isLong && !expanded ? `${text.slice(0, 150).trim()}…` : text}
      </p>
    </section>
  );
}

function HighlightsSection({ highlights }: { highlights: string[] }) {
  const [showAll, setShowAll] = useState(false);
  if (!highlights || highlights.length === 0) return null;

  const visibleItems = showAll ? highlights : highlights.slice(0, 4);
  const remainingCount = highlights.length - 4;

  return (
    <section className="mt-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-900">Highlights</h2>
        {highlights.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 transition"
          >
            {showAll ? "Show Less ↑" : `Show All (+${remainingCount}) ↓`}
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {visibleItems.map((h) => (
          <div
            key={h}
            className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-700 shadow-sm"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <span className="leading-relaxed">{h}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AmenitiesSection({ amenities }: { amenities: { label: string; Icon: typeof Layers }[] }) {
  const [showAll, setShowAll] = useState(false);
  if (!amenities || amenities.length === 0) return null;

  const visibleItems = showAll ? amenities : amenities.slice(0, 4);
  const remainingCount = amenities.length - 4;

  return (
    <section className="mt-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-900">Amenities</h2>
        {amenities.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 transition"
          >
            {showAll ? "Show Less ↑" : `Show All (+${remainingCount}) ↓`}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleItems.map(({ label, Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm"
          >
            <Icon className="h-3.5 w-3.5 text-brand-500" /> {label}
          </span>
        ))}
      </div>
    </section>
  );
}

/**
 * Every info section of a venue (hours, specs, weather, sports, amenities,
 * players, reviews). Rendered by both the mobile shell and the desktop page so
 * the two views can't drift apart again.
 */
function VenueInfoSections({
  venue,
  highlights,
  amenities,
  onPickSport,
  reviewProps,
}: {
  venue: Listing;
  highlights: string[];
  amenities: { label: string; Icon: typeof Layers }[];
  onPickSport: (sportName: string) => void;
  reviewProps: {
    reviews: Review[];
    reviewName: string;
    reviewRating: number;
    reviewComment: string;
    submittingReview: boolean;
    reviewSuccess: boolean;
    reviewError: string | null;
    onNameChange: (val: string) => void;
    onRatingChange: (val: number) => void;
    onCommentChange: (val: string) => void;
    onSubmitReview: (e: React.FormEvent) => void;
  };
}) {
  const activeCourts = (venue.courts ?? []).filter((c) => c.active !== false);

  return (
    <>
      {(venue.reportingStartTime || venue.reportingEndTime) && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <Clock className="h-4 w-4 text-brand-500" />
          <span className="text-xs font-bold text-slate-700">
            Open Today · {venue.reportingStartTime ?? "—"} - {venue.reportingEndTime ?? "—"}
          </span>
          <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-600">
            Open
          </span>
        </div>
      )}

      {/* Sports available — only what the vendor added on this listing.
          Individual courts deliberately are NOT listed here: a multi-sport venue has a
          dozen of them and a flat dump reads as clutter. The count per sport is the
          useful part; the actual courts come up in the booking sheet once the player
          has picked a sport and an hour, filtered to what can host that game. */}
      {venueSports(venue).length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Sports Available</h2>
            {activeCourts.length > 0 && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-600">
                {activeCourts.length} Courts
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {venueSports(venue).map((catId) => {
              const sportName = categoryLabel(catId);
              const courtCount = activeCourts.filter((c) => matchesCourtSport(c.sports, sportName)).length;
              return (
                <button
                  key={catId}
                  onClick={() => onPickSport(sportName)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-brand-200"
                >
                  <span className="text-3xl">{sportEmoji(sportName)}</span>
                  <div className="mt-1 text-center">
                    <span className="block text-sm font-bold text-slate-800">{sportName}</span>
                    {venue.price > 0 && (
                      <span className="mt-0.5 block text-[10px] font-bold text-brand-600">
                        From Rs.{venue.price.toLocaleString("en-IN")}/hr
                      </span>
                    )}
                    <span className="block text-[10px] font-semibold text-slate-400">
                      {courtCount > 0 ? `${courtCount} ${courtCount === 1 ? "court" : "courts"} � Tap to book` : "Tap to book"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Highlights — 4 points by default + Show All */}
      <HighlightsSection highlights={highlights} />

      {venue.priceTiers.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-extrabold text-slate-900">Packages</h2>
          <div className="mt-3 grid gap-2">
            {venue.priceTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-sm"
              >
                <div>
                  <p className="font-bold text-slate-900">{tier.label}</p>
                  <p className="text-[11px] text-slate-500">Same owner-configured booking format</p>
                </div>
                <p className="font-black text-slate-900">₹{tier.amount.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Amenities — 4 points by default + Show All */}
      <AmenitiesSection amenities={amenities} />

      {/* Technical Specifications */}
      <section className="mt-5">
        <h2 className="text-base font-black tracking-tight text-slate-900">Technical Specifications</h2>
        <p className="mt-0.5 text-xs font-medium text-slate-400">What makes this venue play-ready.</p>
        <div className="mt-3.5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          {((venue.technicalSpecs && venue.technicalSpecs.length > 0) ? venue.technicalSpecs : DEFAULT_TECHNICAL_SPECS).map((spec) => {
            const IconComponent = getSpecIcon(spec.icon);
            const theme = getSpecColorTheme(spec.color || "purple");
            return (
              <div key={spec.label} className="flex items-start gap-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme.badge}`}>
                  <IconComponent className="h-5 w-5 stroke-[2]" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-none mt-0.5">{spec.label}</h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{spec.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Local weather */}
      <section className="mt-5">
        <h2 className="text-sm font-extrabold text-slate-900">Local Weather</h2>
        <LocalWeatherCard city={venue.city} />
      </section>

      {/* Top players */}
      <section className="mt-5">
        <h2 className="text-sm font-extrabold text-slate-900">Top Players</h2>
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
          <Users2 className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-xs font-semibold text-slate-500">No frequent players tracked here yet.</p>
        </div>
      </section>

      {/* Player reviews */}
      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">Player Reviews</h2>
          {reviewProps.reviews.length > 0 && (
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {reviewProps.reviews.length} Review{reviewProps.reviews.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {reviewProps.reviews.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
            <MessageSquareText className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-500">No reviews yet — be the first to play &amp; review!</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {reviewProps.reviews.map((r) => (
              <div key={r._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">{r.customerName}</span>
                  <span className="flex items-center gap-0.5 text-xs text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.rating}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Review Form */}
      <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900">Write a Review</h3>
        <p className="mt-0.5 text-xs text-slate-400">Share your playing experience with other players.</p>

        <form onSubmit={reviewProps.onSubmitReview} className="mt-4 space-y-3">
          {reviewProps.reviewSuccess && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-600 animate-in fade-in duration-300">
              ✓ Review submitted successfully! Thank you.
            </div>
          )}
          {reviewProps.reviewError && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 animate-in fade-in duration-300">
              ✗ {reviewProps.reviewError}
            </div>
          )}

          <div>
            <label htmlFor="reviewer-name" className="block text-xs font-bold text-slate-700">Your Name</label>
            <input
              id="reviewer-name"
              type="text"
              required
              value={reviewProps.reviewName}
              onChange={(e) => reviewProps.onNameChange(e.target.value)}
              placeholder="e.g. Aman Sharma"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-brand-500 focus:bg-white transition duration-200"
            />
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700">Rating</span>
            <div className="mt-1 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => reviewProps.onRatingChange(star)}
                  className="p-1 transition hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <Star
                    className={`h-6 w-6 transition duration-150 ${
                      star <= reviewProps.reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="reviewer-comment" className="block text-xs font-bold text-slate-700">Your Review</label>
            <textarea
              id="reviewer-comment"
              required
              rows={3}
              value={reviewProps.reviewComment}
              onChange={(e) => reviewProps.onCommentChange(e.target.value)}
              placeholder="Tell us about the turf quality, lighting, parking..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-brand-500 focus:bg-white resize-none transition duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={reviewProps.submittingReview}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-brand-500/20 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {reviewProps.submittingReview ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </section>
    </>
  );
}

/** Bottom sheet for choosing which sport to book. Shared by both layouts. */
function SportPickerSheet({
  venue,
  selectedSport,
  onSelect,
  onClose,
  onContinue,
}: {
  venue: Listing;
  selectedSport: string;
  onSelect: (sport: string) => void;
  onClose: () => void;
  onContinue: (sport?: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-full duration-300">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-bold text-slate-900">{venue.title}</h3>
        </div>

        <h2 className="mb-5 text-xl font-extrabold text-slate-900">Which sport do you want to play?</h2>

        <div className="space-y-3">
          {venueSports(venue).map((catId) => {
            const sportName = categoryLabel(catId);
            const isSelected = selectedSport === sportName;
            return (
              <button
                key={catId}
                onClick={() => {
                  onSelect(sportName);
                  onContinue(sportName);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 transition hover:border-[#0b9c65] cursor-pointer ${
                  isSelected ? "border-[#0b9c65] bg-[#0b9c65]/5" : "border-slate-100 bg-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-2xl shadow-sm">
                    {sportEmoji(sportName)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">{sportName}</p>
                    {venue.price > 0 && (
                      <p className="mt-0.5 text-[10px] font-bold text-[#0b9c65]">From Rs.{venue.price.toLocaleString("en-IN")}/hr</p>
                    )}
                  </div>
                </div>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${isSelected ? "border-[#0b9c65]" : "border-slate-300"}`}>
                  {isSelected && <div className="h-3 w-3 rounded-full bg-[#0b9c65]" />}
                </div>
              </button>
            );
          })}
        </div>

        <button
          disabled={!selectedSport}
          onClick={() => onContinue(selectedSport)}
          className="mt-6 w-full rounded-2xl bg-[#0b9c65] py-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-[#0b9c65]/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MOBILE — app-shell style venue detail view                         */
/* ------------------------------------------------------------------ */

interface WeatherDay {
  label: string;
  tempMax: number;
  code: number;
}

interface WeatherState {
  loading: boolean;
  error: boolean;
  current?: { temp: number; code: number };
  days: WeatherDay[];
}

const DEFAULT_TECHNICAL_SPECS = [
  { label: "Ground Dimensions", value: "Massive 12,500 sq.ft arena with plenty of room to pierce the gaps", icon: "crop", color: "purple" },
  { label: "Vertical Clearance", value: "35 ft roof height—perfect for those massive helicopter shots and top edges", icon: "arrow-up-down", color: "blue" },
  { label: "Floodlights", value: "800 Lux LED lighting for day-night matches—no chance of dropping dollies here", icon: "lightbulb", color: "orange" },
  { label: "Pitch Conditions", value: "True bounce artificial turf, a flat track bully's dream with reliable grip for pacers", icon: "layers", color: "green" },
  { label: "Net-to-Net Clearance", value: "6 ft lateral gap between nets to safely execute those wide square cuts", icon: "grid", color: "pink" },
];

function getSpecIcon(iconName: string) {
  switch (iconName) {
    case "crop":
      return Crop;
    case "arrow-up-down":
      return ArrowUpDown;
    case "lightbulb":
      return Lightbulb;
    case "layers":
      return Layers;
    case "grid":
      return Grid;
    default:
      return Crop;
  }
}

function getSpecColorTheme(colorName: string) {
  switch (colorName) {
    case "purple":
      return {
        badge: "bg-violet-50 border-violet-100 text-violet-600",
        ring: "border-violet-100",
      };
    case "blue":
      return {
        badge: "bg-blue-50 border-blue-100 text-blue-600",
        ring: "border-blue-100",
      };
    case "orange":
      return {
        badge: "bg-orange-50 border-orange-100 text-orange-600",
        ring: "border-orange-100",
      };
    case "green":
      return {
        badge: "bg-emerald-50 border-emerald-100 text-emerald-600",
        ring: "border-emerald-100",
      };
    case "pink":
      return {
        badge: "bg-pink-50 border-pink-100 text-pink-500",
        ring: "border-pink-100",
      };
    default:
      return {
        badge: "bg-violet-50 border-violet-100 text-violet-600",
        ring: "border-violet-100",
      };
  }
}

const SPEC_ICONS = [Ruler, Lightbulb, Layers, CheckCircle2];

/** Rotating accent palette so each spec chip gets its own attractive colour. */
const SPEC_ACCENTS = [
  { badge: "from-brand-500 to-brand-600 shadow-brand-500/30", ring: "border-brand-100" },
  { badge: "from-amber-400 to-orange-500 shadow-orange-500/30", ring: "border-orange-100" },
  { badge: "from-emerald-400 to-teal-500 shadow-emerald-500/30", ring: "border-emerald-100" },
  { badge: "from-violet-500 to-indigo-500 shadow-indigo-500/30", ring: "border-indigo-100" },
];

const AMENITY_ICON_RULES: { keywords: string[]; icon: typeof ParkingCircle; label: string }[] = [
  { keywords: ["park"], icon: ParkingCircle, label: "Parking" },
  { keywords: ["restroom", "washroom", "toilet"], icon: ShowerHead, label: "Restrooms" },
  { keywords: ["water"], icon: Droplets, label: "Drinking Water" },
  { keywords: ["shower"], icon: ShowerHead, label: "Showers" },
  { keywords: ["wifi"], icon: Wifi, label: "WiFi" },
  { keywords: ["food", "cafe", "canteen", "snack"], icon: Utensils, label: "Food & Snacks" },
];

function weatherIcon(code: number, className = "h-7 w-7") {
  if (code === 0) return <Sun className={className} />;
  if (code <= 3) return <Cloud className={className} />;
  if (code === 45 || code === 48) return <CloudFog className={className} />;
  if (code >= 95) return <CloudLightning className={className} />;
  if (code >= 71 && code <= 86 && ![80, 81, 82].includes(code)) return <CloudSnow className={className} />;
  return <CloudRain className={className} />;
}

function weatherLabel(code: number) {
  if (code === 0) return "Sunny, Clear";
  if (code <= 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 95) return "Thunderstorm";
  if (code >= 71 && code <= 86 && ![80, 81, 82].includes(code)) return "Snowy";
  return "Rainy";
}

function useCityWeather(city: string) {
  const [weather, setWeather] = useState<WeatherState>(() =>
    city ? { loading: true, error: false, days: [] } : { loading: false, error: true, days: [] }
  );

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    (async () => {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );
        const geo = await geoRes.json();
        const place = geo?.results?.[0];
        if (!place) throw new Error("no geocoding match");

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=4`
        );
        const data = await weatherRes.json();
        if (cancelled) return;
        setWeather({
          loading: false,
          error: false,
          current: { temp: Math.round(data.current.temperature_2m), code: data.current.weather_code },
          days: (data.daily.time as string[]).slice(1, 4).map((iso, i) => ({
            label: new Date(iso).toLocaleDateString("en-US", { weekday: "short" }),
            tempMax: Math.round(data.daily.temperature_2m_max[i + 1]),
            code: data.daily.weather_code[i + 1],
          })),
        });
      } catch {
        if (!cancelled) setWeather({ loading: false, error: true, days: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [city]);

  return weather;
}

function MobileVenueDetail({
  venue,
  highlights,
  inclusions,
  categoryText,
  galleryImages,
  onOpenBooking,
  favorite,
  onToggleFavorite,
  reviewProps,
}: {
  venue: Listing;
  highlights: string[];
  inclusions: string[];
  categoryText: string;
  galleryImages: string[];
  onOpenBooking: (sport: string) => void;
  favorite: boolean;
  onToggleFavorite: () => void;
  reviewProps: any;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"home" | "booking" | "academy">("home");
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [sportModalOpen, setSportModalOpen] = useState(false);

  // An academy belongs to a venue, never to an Event — the vendor form refuses to attach
  // one to an Event listing (see PackageStudio's canOfferAcademy), so the public page must
  // not offer the tab either. Derived rather than stored, so an Event can't be left sitting
  // on the academy tab by stale state.
  const showAcademyTab = venue.type !== "Event";
  const currentTab = showAcademyTab ? activeTab : "home";

  const amenities = inclusions.map((item) => {
    const match = AMENITY_ICON_RULES.find((rule) => rule.keywords.some((k) => item.toLowerCase().includes(k)));
    return { label: item, Icon: match?.icon ?? Layers };
  });

  const mapsQuery = encodeURIComponent(venue.address || venue.city);

  return (
    <div className="pb-24">
      {/* Hero gallery with floating header */}
      <div className="relative h-72 w-full bg-slate-900">
        <ImageCarousel images={galleryImages} alt={venue.title} className="h-full w-full" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label="Toggle favorite"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            >
              <Heart className={`h-4 w-4 ${favorite ? "fill-accent-500 text-accent-500" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(window.location.href).catch(() => {})}
              aria-label="Share venue"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-t-3xl -mt-5 relative bg-slate-50 px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-extrabold text-slate-900">{venue.title}</h1>
          {venue.reviewCount && venue.reviewCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {venue.rating?.toFixed(1)}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              No ratings
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {venue.city}
          {venue.address ? ` · ${venue.address}` : ""}
        </p>

        {/* Price + Book Now — the only price/booking CTA on this page (no separate sticky bar) */}
        <div id="price-block" className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-slate-900">₹{venue.price.toLocaleString("en-IN")}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {venue.type === "Event" ? "Per person" : "Starting price"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (venue.type === "Event") {
                // Events: skip sport picker, go directly to booking
                onOpenBooking("");
              } else {
                // Turf/Game: show sport picker if multiple sports, else go directly
                const sports = venueSports(venue);
                if (sports.length > 1) {
                  setSportModalOpen(true);
                } else {
                  onOpenBooking(sports.length === 1 ? categoryLabel(sports[0]) : "");
                }
              }
            }}
            className={`rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wide transition bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30`}
          >
            Book Now
          </button>
        </div>

        {/* Tabs — a lone "Home" tab is just noise, so Events get no tab bar at all. */}
        {showAcademyTab && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            {([{ id: "home", label: "Home" }, { id: "academy", label: "Academy" }] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl py-2 text-[10px] font-bold uppercase tracking-wide transition ${
                  currentTab === tab.id ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {currentTab === "home" && (
          <>
            {/* ── TURF / GAME — show specs, weather, sports, amenities, players, reviews ── */}
            {venue.type !== "Event" && (
              <VenueInfoSections
                venue={venue}
                highlights={highlights}
                amenities={amenities}
                onPickSport={(sport) => { setSelectedSport(sport); onOpenBooking(sport); }}
                reviewProps={reviewProps}
              />
            )}

            {/* ── EVENT — show event-specific sections ── */}
            {venue.type === "Event" && (
              <>
                {/* Date & time */}
                {venue.availableFrom && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <CalendarDays className="h-4 w-4 text-brand-500" />
                    <span className="text-xs font-bold text-slate-700">
                      {new Date(venue.availableFrom).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {venue.reportingStartTime && ` · ${venue.reportingStartTime}`}
                      {venue.reportingEndTime && `–${venue.reportingEndTime}`}
                    </span>
                  </div>
                )}

                {/* Highlights */}
                {highlights.length > 0 && (
                  <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <CheckCircle2 className="h-4 w-4 text-brand-500" /> Highlights
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {highlights.map((h) => (
                        <li key={h} className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-500" /> {h}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Inclusions / Exclusions */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h3 className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Included
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {inclusions.map((i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" /> {i}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h3 className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                      <XCircle className="h-3.5 w-3.5 text-accent-500" /> Not Included
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {venue.exclusions.map((e) => (
                        <li key={e} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                          <XCircle className="h-3 w-3 shrink-0 text-accent-400" /> {e}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                {/* Amenities (inclusions as tags) */}
                {amenities.length > 0 && (
                  <section className="mt-4">
                    <h2 className="text-xs font-extrabold text-slate-900">Amenities</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {amenities.map(({ label, Icon }) => (
                        <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                          <Icon className="h-3 w-3 text-brand-500" /> {label}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Map Location — shown for all types */}
            {venue.address && (
              <div className="mt-5 space-y-2">
                <p className="flex items-start gap-2 text-sm font-medium text-slate-700">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {venue.address}
                </p>
                <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <iframe
                    title="Venue Location Map"
                    src={`https://maps.google.com/maps?q=${mapsQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold uppercase text-white">
                    Satellite View
                  </span>
                </div>
              </div>
            )}

            {/* Summary — placed at the end after map */}
            <VenueSummaryCard description={venue.description} title={venue.title} />

            {/* Video — shown for all types when videoUrl exists */}

            {/* Video — shown for all types when videoUrl exists */}
            {venue.videoUrl && (
              <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-extrabold text-slate-900">🎥 {venue.type === "Event" ? "Event Video" : "Venue Video"}</h2>
                <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl bg-black border border-slate-100 shadow-sm">
                  {venue.videoUrl.includes("youtube.com") || venue.videoUrl.includes("youtu.be") ? (
                    <iframe
                      src={getYouTubeEmbedUrl(venue.videoUrl)}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : venue.videoUrl.includes("vimeo.com") ? (
                    <iframe
                      src={getVimeoEmbedUrl(venue.videoUrl)}
                      className="h-full w-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <video src={venue.videoUrl} controls className="h-full w-full" />
                  )}
                </div>
              </section>
            )}

            {/* Itinerary + FAQs — only for Events */}
            {venue.type === "Event" && <EventItineraryFaqs itinerary={venue.itinerary} faqs={venue.faqs} />}
          </>
        )}

        {currentTab === "academy" && (
          <section className="mt-5">
            <h2 className="text-sm font-extrabold text-slate-900">Academy &amp; Coaches</h2>
            <AcademyTabContent venue={venue} />
          </section>
        )}
      </div>

      {/* Sport Selection Bottom Sheet */}
      {sportModalOpen && (
        <SportPickerSheet
          venue={venue}
          selectedSport={selectedSport}
          onSelect={setSelectedSport}
          onClose={() => setSportModalOpen(false)}
          onContinue={(sport) => {
            const chosen = sport || selectedSport;
            setSportModalOpen(false);
            onOpenBooking(chosen);
          }}
        />
      )}
    </div>
  );
}

function CoachRow({ coach, badge }: { coach: Coach; badge?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 font-bold text-sm">
          {coach.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-extrabold text-slate-900">
            {coach.name}
            {badge && (
              <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-violet-700">
                {badge}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-slate-500">
            {(coach.categories || []).map(categoryLabel).join(", ") || "Coach"} · {coach.experienceYears ?? 3}+ yrs exp
          </p>
        </div>
      </div>
      <Link
        href={`/coaches/${coach._id}`}
        className="shrink-0 rounded-xl bg-brand-50 border border-brand-200 px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-600 hover:text-white transition"
      >
        Book Session
      </Link>
    </div>
  );
}

function AcademyTabContent({ venue }: { venue: Listing }) {
  // Two tiers: an academy actually added AT this turf (via "Add Turf" → Add Academy)
  // shows first and is badged; everything else is just a same-sport suggestion.
  const [venueAcademies, setVenueAcademies] = useState<Coach[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      browsePublicCoaches({ turfListingId: venue._id, limit: 10 }),
      browsePublicCoaches({ limit: 20 }),
    ])
      .then(([atVenue, all]) => {
        if (cancelled) return;
        setVenueAcademies(atVenue.items);
        const venueCatSet = new Set((venue.categories || []).map((c) => c.toLowerCase()));
        const atVenueIds = new Set(atVenue.items.map((c) => c._id));
        const matching = all.items.filter(
          (coach) => !atVenueIds.has(coach._id) && (coach.categories || []).some((cat) => venueCatSet.has(cat.toLowerCase()))
        );
        setCoaches(matching.length > 0 ? matching : all.items.filter((c) => !atVenueIds.has(c._id)).slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) {
          setVenueAcademies([]);
          setCoaches([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venue]);

  if (loading) {
    return <div className="mt-3 py-6 text-center text-xs font-semibold text-slate-400">Finding matching coaches for {venue.title}...</div>;
  }

  if (venueAcademies.length === 0 && coaches.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
        <GraduationCap className="mx-auto h-6 w-6 text-slate-300" />
        <p className="mt-2 text-xs font-semibold text-slate-500">
          No matching academy programs listed at this venue yet.
        </p>
        <Link href="/coaches" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
          Browse all coaches instead
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {venueAcademies.length > 0 && (
        <>
          <p className="text-xs font-semibold text-slate-500">Academy at {venue.title}:</p>
          {venueAcademies.map((coach) => (
            <CoachRow key={coach._id} coach={coach} badge="At this venue" />
          ))}
        </>
      )}
      {coaches.length > 0 && (
        <>
          <p className="text-xs font-semibold text-slate-500">
            {venueAcademies.length > 0 ? "Other coaches & programs nearby:" : "Coaches & Programs matching this venue's games:"}
          </p>
          {coaches.map((coach) => (
            <CoachRow key={coach._id} coach={coach} />
          ))}
        </>
      )}
    </div>
  );
}

function getYouTubeEmbedUrl(url: string): string {
  try {
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split(/[?#]/)[0];
    } else if (url.includes("youtube.com/watch")) {
      const match = url.match(/[?&]v=([^&#]+)/);
      videoId = match ? match[1] : "";
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("youtube.com/embed/")[1].split(/[?#]/)[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  } catch {
    return url;
  }
}

function getVimeoEmbedUrl(url: string): string {
  try {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  } catch {
    return url;
  }
}
