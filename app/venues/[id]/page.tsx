"use client";

/* ------------------------------------------------------------------ */
/*  VENUE DETAIL PAGE  —  /venues/[id]                                 */
/*                                                                     */
/*  Opened when a user taps "Book Now" (or a card) on Trending Venues. */
/*  Its "Book Now" launches the real booking flow (review -> confirm). */
/* ------------------------------------------------------------------ */

import { Suspense, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Zap,
  ShieldCheck,
  Camera,
  LayoutGrid,
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

  // Gallery interactivity
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleDeal = useCallback((ctx: DealContext) => {
    setDealContext(ctx);
    setSelectedSportForBooking(ctx.sport);
    setSelectedSport(ctx.sport);
    setBooking(true);
  }, []);

  useEffect(() => {
    getVenueReviews(id)
      .then((res) => setReviews(res))
      .catch(() => { });
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

  const bannerUrl = venue ? getListingImage(venue, "banner") : "";
  const galleryPhotos = venue ? venue.images.map((img) => img.url).filter(Boolean) : [];
  const allImageUrls = Array.from(new Set([bannerUrl, ...galleryPhotos].filter(Boolean))) as string[];
  const fallbackUrl = venue ? getListingImage(venue, "fallback") : "";
  const galleryImages = allImageUrls.length > 0 ? allImageUrls.slice(0, 10) : (fallbackUrl ? [fallbackUrl] : []);



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
      <SiteHeader />

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

      <main className="mx-auto hidden max-w-[1360px] px-4 py-6 sm:block sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to venues
          </Link>
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
                navigator.clipboard?.writeText(window.location.href).catch(() => { });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600 cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" /> Share Venue
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:gap-8">
          {/* LEFT — details */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
              className="mb-6 group"
            >
              <div className="relative h-[400px] lg:h-[480px] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-sm cursor-pointer">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={currentImageIndex}
                    src={galleryImages[currentImageIndex] || "https://placehold.co/800x400/1e293b/fff?text=No+Image"}
                    alt={venue.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ scale: 1.03, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      scale: { duration: 8, ease: "linear", repeat: Infinity, repeatType: "reverse" },
                      opacity: { duration: 0.8 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, { offset, velocity }) => {
                      if (offset.x < -50) setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
                      if (offset.x > 50) setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
                    }}
                  />
                </AnimatePresence>

                {/* 18+ Photos overlay */}
                <span className="absolute bottom-[92px] right-4 flex items-center gap-1.5 rounded-xl bg-black/65 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md z-20 shadow-md">
                  <Camera className="h-4 w-4" /> {galleryImages.length > 0 ? `${galleryImages.length}+ Photos` : "18+ Photos"}
                </span>

                {/* Left/Right Arrows */}
                <motion.button
                  whileHover={{ scale: 1.1, x: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 z-20 cursor-pointer"
                >
                  <ChevronDown className="h-5 w-5 rotate-90" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, x: 2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 z-20 cursor-pointer"
                >
                  <ChevronDown className="h-5 w-5 -rotate-90" />
                </motion.button>

                {/* Thumbnails overlaying at the bottom */}
                {galleryImages.length > 1 && (
                  <div className="absolute bottom-0 left-0 flex w-full h-20 gap-1 bg-gradient-to-t from-black/80 to-transparent p-1 z-20">
                    {galleryImages.slice(0, 4).map((src, i) => (
                      <div
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
                        className={`relative h-full w-1/4 overflow-hidden rounded-xl cursor-pointer transition-opacity duration-300 ${currentImageIndex === i ? "opacity-100 ring-2 ring-brand-500" : "opacity-60 hover:opacity-100"}`}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

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


          </div>

          {/* RIGHT — sticky booking card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:sticky lg:top-24 lg:self-start min-w-0"
          >
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
              <div className="flex items-start justify-between gap-3">
                <div className="relative">
                  <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                    {venue.title}
                  </h1>
                </div>
                {venue.reviewCount && venue.reviewCount > 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-700">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> {venue.rating?.toFixed(1)} <span className="text-amber-700/80 font-semibold">({venue.reviewCount})</span>
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                    <Star className="h-3 w-3" /> No ratings
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
                {categoryText} • {venue.city}
              </p>

              <p className="mt-5 text-3xl font-black text-slate-900">
                ₹{venue.price.toLocaleString("en-IN")}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Starting price</p>

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
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                  <span>
                    <span className="block font-semibold text-slate-800">{venue.address || `${venue.city}, Rajasthan`}</span>
                    <span className="block text-xs text-slate-400">{venue.city} District</span>
                  </span>
                </p>
              </div>

              <motion.button
                whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.4)" }}
                type="button"
                onClick={() => {
                  const sports = venueSports(venue);
                  if (!isEvent && sports.length > 1) {
                    setSportModalOpen(true);
                  } else {
                    setSelectedSportForBooking(sports.length === 1 ? categoryLabel(sports[0]) : "");
                    setBooking(true);
                  }
                }}
                className="group mt-6 flex w-full items-center justify-between rounded-xl bg-brand-800 px-6 py-4 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-brand-900 shadow-md shadow-brand-900/20 cursor-pointer"
              >
                <span>Book Now</span>
                <ChevronDown className="h-4 w-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>

            {venue.vendorId && (
              <Link
                href={`/venues/vendor/${venue.vendorId}`}
                className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-slate-200 shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Store className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-sm font-bold text-slate-900">View vendor profile</span>
                    <span className="block text-xs font-medium text-slate-500">See all turfs &amp; games from this vendor</span>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 -rotate-90 text-slate-400" />
              </Link>
            )}

            {/* Coaching belongs to a venue, not to an Event — same rule as the Academy tab. */}
            {venue.type !== "Event" && (
              <Link
                href="/coaches"
                className="mt-3 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-slate-200 shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <UserRoundCog className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-sm font-bold text-slate-900">Want a coach here?</span>
                    <span className="block text-xs font-medium text-slate-500">Browse coaches and book a session</span>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 -rotate-90 text-slate-400" />
              </Link>
            )}
          </motion.div>
        </div>

        <div className="mt-4">
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


        </div>

        {/* Bottom Feature Footer Bar */}
        <div className="mt-8 rounded-3xl bg-gradient-to-r from-[#7f1d1d] via-[#991b1b] to-[#7f1d1d] p-6 text-white shadow-xl shadow-red-950/20">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">Instant Booking</p>
                <p className="text-[10px] text-white/80">Quick &amp; hassle-free</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">Verified Venues</p>
                <p className="text-[10px] text-white/80">Trusted &amp; quality assured</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">Secure Payments</p>
                <p className="text-[10px] text-white/80">100% safe &amp; secure</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                <UserRoundCog className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">Customer Support</p>
                <p className="text-[10px] text-white/80">We&apos;re here to help</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Booking Bar */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] pb-safe"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Starting at</p>
            <p className="text-xl font-black text-slate-900 leading-tight">₹{venue.price.toLocaleString("en-IN")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const sports = venueSports(venue);
              if (!isEvent && sports.length > 1) {
                setSportModalOpen(true);
              } else {
                setSelectedSportForBooking(sports.length === 1 ? categoryLabel(sports[0]) : "");
                setBooking(true);
              }
            }}
            className="flex-1 rounded-xl bg-brand-800 px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-brand-900 shadow-md shadow-brand-900/20 text-center"
          >
            Book Now
          </button>
        </div>
      </motion.div>

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
    <div className="mt-3 rounded-2xl bg-gradient-to-br from-[#7f1d1d] to-[#450a0a] p-5 text-white shadow-lg shadow-red-950/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-4xl font-black tracking-tight">{weather.current.temp}°</p>
          <p className="mt-1 text-xs font-bold text-white/80">{weatherLabel(weather.current.code)}</p>
        </div>
        {weatherIcon(weather.current.code, "h-12 w-12 text-white/90")}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/20 pt-4 text-center">
        {weather.days.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">{d.label}</span>
            {weatherIcon(d.code, "h-4 w-4 text-white")}
            <span className="text-xs font-black">{d.tempMax}°</span>
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
  const isLong = text.length > 250;

  return (
    <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-900">About this venue</h2>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 transition"
          >
            {expanded ? "Show Less ↑" : "Show More →"}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
        {isLong && !expanded ? `${text.slice(0, 250).trim()}…` : text}
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
      {/* 1. Status Pills Bar */}
      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-white px-2.5 py-3 sm:px-4 sm:py-3.5 shadow-sm border border-slate-100 min-w-0">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] sm:text-xs font-extrabold text-slate-900 leading-tight">
              Open Today
            </span>
            <span className="block text-[9px] sm:text-[10px] font-medium text-slate-500 truncate mt-0.5">
              {venue.reportingStartTime ?? "06:00 AM"} – {venue.reportingEndTime ?? "11:00 PM"}
            </span>
          </div>
          <span className="shrink-0 rounded-md bg-emerald-50 px-1 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-emerald-600 border border-emerald-100">
            OPEN
          </span>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-white px-2.5 py-3 sm:px-4 sm:py-3.5 shadow-sm border border-slate-100 min-w-0">
          <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] sm:text-xs font-extrabold text-slate-900 leading-tight">
              {activeCourts.length > 0 ? `${activeCourts.length} Court` : "1 Court"}
            </span>
            <span className="block text-[9px] sm:text-[10px] font-medium text-slate-500 truncate mt-0.5">Available</span>
          </div>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-white px-2.5 py-3 sm:px-4 sm:py-3.5 shadow-sm border border-slate-100 min-w-0">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] sm:text-xs font-extrabold text-slate-900 leading-tight">Instant Booking</span>
            <span className="block text-[9px] sm:text-[10px] font-medium text-slate-500 truncate mt-0.5">Quick &amp; easy</span>
          </div>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-white px-2.5 py-3 sm:px-4 sm:py-3.5 shadow-sm border border-slate-100 min-w-0">
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] sm:text-xs font-extrabold text-slate-900 leading-tight">Confirmed</span>
            <span className="block text-[9px] sm:text-[10px] font-medium text-slate-500 truncate mt-0.5">Real-time availability</span>
          </div>
        </motion.div>
      </motion.div>

      {/* 2. Location Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-600 shrink-0" />
              <h2 className="text-sm font-extrabold text-slate-900">Location</h2>
            </div>
            {(venue.address || venue.city) && (
              <p className="mt-0.5 text-xs text-slate-500 truncate">{venue.address || venue.city}</p>
            )}
          </div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(venue.address || venue.city)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition shrink-0"
          >
            Get Directions &rarr;
          </a>
        </div>
        <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <motion.iframe
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            title="Venue Map"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(venue.address || venue.city)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
          />
        </div>
      </motion.div>

      {/* 3. Highlights & Packages 2-Column Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="mt-5 grid gap-5 md:grid-cols-2 items-start"
      >
        {/* Highlights Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900">Highlights</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {highlights.slice(0, 4).map((h) => {
              // Map specific highlight keywords to icons for the new design
              let Icon = CheckCircle2;
              const ht = h.toLowerCase();
              if (ht.includes("net") || ht.includes("campus") || ht.includes("location")) Icon = MapPin;
              else if (ht.includes("floodlit") || ht.includes("light")) Icon = Lightbulb;
              else if (ht.includes("corporate") || ht.includes("professional")) Icon = Building2;
              else if (ht.includes("parking")) Icon = ParkingCircle;

              return (
                <div key={h} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="flex flex-col pt-1.5">
                    <span className="text-xs font-extrabold text-slate-900 leading-tight">{h.split('—')[0]?.trim() || h}</span>
                    {h.includes('—') && <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">{h.split('—')[1]?.trim()}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Packages Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h2 className="text-sm font-extrabold text-slate-900">Packages</h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-700 border border-amber-200/60">
              Same owner-configured booking format
            </span>
          </div>
          <div className="mt-4 flex flex-col border border-slate-100 divide-y divide-slate-100 rounded-xl overflow-hidden">
            {(venue.priceTiers.length > 0 ? venue.priceTiers : [
              { id: "1", label: "Weekday (Day)", time: "06:00 AM – 06:00 PM", amount: venue.price },
              { id: "2", label: "Weekday (Night)", time: "06:00 PM – 11:00 PM", amount: Math.round(venue.price * 1.25) },
              { id: "3", label: "Weekend", time: "All Day", amount: Math.round(venue.price * 1.5) },
            ]).map((tier: any) => (
              <motion.div
                whileHover="hover"
                key={tier.id || tier.label}
                className="group flex items-center justify-between p-3.5 bg-white transition hover:bg-red-50/50 cursor-pointer"
              >
                <div>
                  <p className="text-xs font-extrabold text-slate-900">{tier.label}</p>
                  <p className="text-[10px] font-medium text-slate-500">{tier.time || "06:00 AM - 11:00 PM"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <motion.p
                    variants={{ hover: { scale: 1.04 } }}
                    className="text-sm font-black text-slate-900 origin-right"
                  >
                    ₹{tier.amount.toLocaleString("en-IN")}
                  </motion.p>
                  <motion.div variants={{ hover: { x: 4 } }}>
                    <ChevronDown className="h-4 w-4 -rotate-90 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 4. Amenities Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="mt-5 rounded-3xl bg-white p-5 shadow-sm flex items-center gap-6 overflow-x-auto border border-slate-50"
      >
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 shrink-0">
          <UserRoundCog className="h-4 w-4 text-brand-600" /> Amenities
        </div>
        <div className="h-4 w-px bg-slate-200 shrink-0" />
        <div className="flex items-center gap-8 text-xs font-bold text-slate-700 shrink-0">
          {amenities.slice(0, 5).map(({ label, Icon }) => (
            <motion.span whileHover={{ scale: 1.08, rotate: -3 }} key={label} className="flex items-center gap-2 cursor-pointer">
              <Icon className="h-4 w-4 text-brand-600" /> {label}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* 5. Specs + Weather 2-Column Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="mt-5 grid gap-5 md:grid-cols-2 items-start"
      >
        {/* Specs */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900">Technical Specifications</h2>
          <p className="mt-0.5 text-[10px] text-slate-400">What makes this venue play-ready.</p>
          <div className="mt-4 space-y-3">
            {((venue.technicalSpecs && venue.technicalSpecs.length > 0) ? venue.technicalSpecs : DEFAULT_TECHNICAL_SPECS).map((spec) => {
              const IconComponent = getSpecIcon(spec.icon);
              const theme = getSpecColorTheme(spec.color || "purple");
              return (
                <div key={spec.label} className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${theme.badge}`}>
                    <IconComponent className="h-4 w-4 stroke-[2]" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{spec.label}</h4>
                    <p className="mt-0.5 text-[10px] text-slate-500 leading-snug">{spec.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weather - Hardcoded Red Weather UI to match the Target Design exactly */}
        <div className="rounded-3xl border border-red-900 bg-gradient-to-br from-red-900 via-[#7f1d1d] to-[#450a0a] p-6 text-white shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-white/90">Local Weather</h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="text-4xl font-black"
                >
                  24°
                </motion.p>
                <p className="text-xs font-semibold text-white/80 mt-1">Cloudy</p>
              </div>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Cloud className="h-10 w-10 text-white/90" strokeWidth={1.5} />
              </motion.div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-center">
            <div>
              <p className="text-[10px] font-bold text-white/80">WED</p>
              <CloudRain className="mx-auto h-4 w-4 my-1.5 text-white" strokeWidth={1.5} />
              <p className="text-xs font-extrabold text-white">28°</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/80">THU</p>
              <Cloud className="mx-auto h-4 w-4 my-1.5 text-white" strokeWidth={1.5} />
              <p className="text-xs font-extrabold text-white">28°</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/80">FRI</p>
              <Cloud className="mx-auto h-4 w-4 my-1.5 text-white" strokeWidth={1.5} />
              <p className="text-xs font-extrabold text-white">29°</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 5. Reviews + Write Form + Summary 3-Column Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="mt-5 grid gap-5 lg:grid-cols-3 items-stretch"
      >
        {/* Reviews & Community */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-900">Reviews &amp; Community</h2>
            {reviewProps.reviews.length > 0 && (
              <button className="text-xs font-bold text-brand-600 hover:text-brand-700 transition">View all reviews →</button>
            )}
          </div>

          <div className="flex items-start gap-5">
            <div className="shrink-0">
              <p className="text-3xl font-black text-slate-900 leading-none">{venue.rating?.toFixed(1) || "4.8"}</p>
              <motion.div
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                className="flex items-center gap-0.5 mt-1.5 mb-1"
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <motion.div key={s} variants={{ hidden: { opacity: 0, scale: 0.5 }, show: { opacity: 1, scale: 1 } }}>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </motion.div>
                ))}
              </motion.div>
              <div className="flex text-[10px] font-semibold text-slate-500">
                {reviewProps.reviews.length || venue.reviewCount || 0} Reviews
              </div>
            </div>

            <div className="flex-1">
              {reviewProps.reviews.length > 0 ? (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {reviewProps.reviews.slice(0, 3).map((r, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 uppercase">
                          {r.customerName.charAt(0) || "U"}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-none">{r.customerName}</p>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-2.5 w-2.5 ${s <= (r.rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                  {reviewProps.reviews.length > 3 && (
                    <p className="text-xs font-bold text-brand-600 text-center cursor-pointer">View {reviewProps.reviews.length - 3} more reviews...</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 text-slate-400">
                  <Star className="h-8 w-8 text-slate-200 mb-2" />
                  <p className="text-xs font-semibold">No reviews yet.</p>
                  <p className="text-[10px]">Be the first to share your experience!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Write Review Form */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Be the first to review this venue</h3>
            <p className="mt-1 text-xs text-slate-500">Your experience helps other players choose better.</p>
          </div>

          <form onSubmit={reviewProps.onSubmitReview} className="mt-4 space-y-3" noValidate>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => reviewProps.onRatingChange(star)}
                  className="p-0 cursor-pointer transition hover:scale-110"
                >
                  <Star
                    className={`h-5 w-5 ${star <= reviewProps.reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                  />
                </button>
              ))}
            </div>
            <div>
              <input
                type="text"
                value={reviewProps.reviewName}
                onChange={(e) => reviewProps.onNameChange(e.target.value)}
                placeholder="Your Name (e.g. Aman Sharma)"
                className={`w-full rounded-xl border ${reviewProps.reviewError?.includes('Name') || reviewProps.reviewError?.includes('all fields') ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'} p-2 text-xs text-slate-800 outline-none focus:border-brand-500 focus:bg-white transition-colors`}
              />
            </div>
            <div>
              <textarea
                rows={2}
                value={reviewProps.reviewComment}
                onChange={(e) => reviewProps.onCommentChange(e.target.value)}
                placeholder="Tell us about your experience..."
                className={`w-full rounded-xl border ${reviewProps.reviewError?.includes('comment') || reviewProps.reviewError?.includes('all fields') ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'} p-2 text-xs text-slate-800 outline-none focus:border-brand-500 focus:bg-white resize-none transition-colors`}
              />
            </div>

            {reviewProps.reviewError && (
              <p className="text-[10px] font-bold text-red-500">{reviewProps.reviewError}</p>
            )}
            {reviewProps.reviewSuccess && (
              <p className="text-[10px] font-bold text-emerald-500">Review submitted successfully! Thank you.</p>
            )}

            <button
              type="submit"
              disabled={reviewProps.submittingReview}
              className="w-full rounded-xl bg-brand-800 hover:bg-brand-900 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reviewProps.submittingReview ? "Submitting..." : "Write a Review"}
            </button>
          </form>
        </div>

        {/* About this venue Summary */}
        <div className="h-full">
          <VenueSummaryCard description={venue.description} title={venue.title} />
        </div>
      </motion.div>
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
                className={`flex w-full items-center justify-between rounded-2xl border p-4 transition hover:border-[#0b9c65] cursor-pointer ${isSelected ? "border-[#0b9c65] bg-[#0b9c65]/5" : "border-slate-100 bg-white"
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
      <div className="relative h-72 w-full bg-slate-900 overflow-hidden rounded-b-3xl">
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
              onClick={() => navigator.clipboard?.writeText(window.location.href).catch(() => { })}
              aria-label="Share venue"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-t-[2.25rem] -mt-6 relative z-10 bg-white px-5 pt-6 shadow-[0_-12px_30px_-5px_rgba(0,0,0,0.08)] border-t border-slate-100/60">
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
                className={`rounded-xl py-2 text-[10px] font-bold uppercase tracking-wide transition ${currentTab === tab.id ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
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
                {/* Map Location — shown for event listings */}
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

                {/* Summary — placed at the end for events */}
                <VenueSummaryCard description={venue.description} title={venue.title} />
              </>
            )}

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
