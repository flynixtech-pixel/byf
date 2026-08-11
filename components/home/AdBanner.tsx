"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Ticket } from "lucide-react";
import { SectionHeading } from "./ui";
import { getActiveBanners } from "@/lib/api/banners";
import type { AdBanner as AdBannerData } from "@/lib/api/types";
import Image from "next/image";

export function AdBanner({
  className = "mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8",
  compact = false,
}: {
  className?: string;
  /** Slim mode for tight spaces (e.g. vendor dashboard): no heading, shorter strip. */
  compact?: boolean;
}) {
  const [banners, setBanners] = useState<AdBannerData[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Swipe / drag state
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    getActiveBanners()
      .then(setBanners)
      .catch(() => setBanners([]));
  }, []);

  // Auto-slide — pauses on hover/focus
  useEffect(() => {
    if (banners.length < 2 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 4500);
    return () => clearInterval(id);
  }, [banners.length, paused]);

  if (banners.length === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + banners.length) % banners.length);
  const next = () => setIndex((i) => (i + 1) % banners.length);

  // ─── Touch handlers ───────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const diff = dragStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    dragStartX.current = null;
  };

  // ─── Mouse drag handlers (desktop) ────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    isDragging.current = false;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragStartX.current !== null && Math.abs(e.clientX - dragStartX.current) > 5) {
      isDragging.current = true;
    }
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    const diff = dragStartX.current - e.clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    dragStartX.current = null;
  };
  const onMouseLeaveTrack = () => {
    dragStartX.current = null;
  };

  return (
    <section className={className}>
      {!compact && (
        <SectionHeading
          eyebrow="Exclusive"
          title="Hot Offers & Events"
          subtitle="Limited-time deals, tournaments, and offers — handpicked for you."
          icon={Ticket}
        />
      )}

      <div
        className="relative overflow-hidden rounded-3xl shadow-lg shadow-slate-900/10 ring-1 ring-black/5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {/* ── Slide track ── */}
        <div
          className="flex transition-transform duration-700 ease-in-out cursor-grab active:cursor-grabbing select-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeaveTrack}
        >
          {banners.map((banner, index) => {
            const content = (
              <>
                {/* The artwork is ~2:1 but this slot is far wider, so it can never fill
                    edge-to-edge without cropping. A blurred copy of the same image fills the
                    dead space, and the sharp object-contain copy on top shows the banner
                    whole — full width, nothing cropped, nothing stretched. */}
                <Image
                  src={banner.imageUrl}
                  aria-hidden
                  fill
                  sizes="100vw"
                  alt=""
                  className="scale-110 object-cover blur-2xl brightness-90 pointer-events-none"
                  draggable={false}
                />
                <Image
                  src={banner.imageUrl}
                  fill
                  sizes="(max-width: 640px) 100vw, 1280px"
                  priority={index === 0}
                  alt={banner.title ?? "Promotional banner"}
                  className="relative object-contain pointer-events-none"
                  draggable={false}
                />
                {banner.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 pt-10">
                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-brand-500/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                      <Ticket className="h-3 w-3" /> Offer
                    </span>
                    <p className="text-sm font-bold text-white drop-shadow sm:text-base">{banner.title}</p>
                  </div>
                )}
              </>
            );
            const cardClass = compact
              ? "group relative block h-[130px] w-full shrink-0 overflow-hidden"
              : "group relative block h-[210px] w-full shrink-0 overflow-hidden sm:h-[350px]";
            return banner.linkUrl ? (
              <a
                key={banner._id}
                href={banner.linkUrl}
                className={cardClass}
                onClick={(e) => { if (isDragging.current) e.preventDefault(); }}
              >
                {content}
              </a>
            ) : (
              <div key={banner._id} className={cardClass}>
                {content}
              </div>
            );
          })}
        </div>

        {/* ── Prev / Next arrows (only when >1 banner) ── */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* ── Dot indicators — the active one fills up as an autoplay progress bar ── */}
        {banners.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner._id}
                type="button"
                aria-label={`Show banner ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 overflow-hidden rounded-full bg-slate-200 transition-all duration-500 hover:bg-slate-300 ${
                  i === index ? "w-7" : "w-1.5"
                }`}
              >
                {i === index && (
                  <span
                    key={index}
                    className="block h-full rounded-full bg-brand-500 [animation-name:banner-progress] [animation-timing-function:linear] [animation-fill-mode:forwards]"
                    style={{ animationDuration: "4500ms", animationPlayState: paused ? "paused" : "running" }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
