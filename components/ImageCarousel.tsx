"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Swipeable, auto-advancing image carousel. Scrolling is native (CSS scroll-snap) so
 * touch/trackpad drag works for free; arrows + dots + a timer just drive the same scroll. */
export function ImageCarousel({
  images,
  alt,
  className = "",
  autoPlayMs = 4000,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 800px",
}: {
  images: string[];
  alt: string;
  className?: string;
  autoPlayMs?: number;
  sizes?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const resumeAt = useRef(0);

  function goTo(index: number, isUserInteraction = false) {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    if (isUserInteraction) {
      resumeAt.current = Date.now() + 5000;
    }
  }

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < resumeAt.current) return;
      goTo((active + 1) % images.length);
    }, autoPlayMs);
    return () => clearInterval(id);
  }, [active, images.length, autoPlayMs]);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    setActive((prev) => (prev !== idx ? idx : prev));
  }

  function handleUserScroll() {
    resumeAt.current = Date.now() + 5000;
  }

  if (images.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onTouchStart={handleUserScroll}
        onPointerDown={handleUserScroll}
        onWheel={handleUserScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div key={i} className="relative h-full w-full flex-none snap-center overflow-hidden bg-black/10">
            {/* Blurred Backdrop for non-16:9 images */}
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl scale-125 opacity-70"
              style={{ backgroundImage: `url(${src})` }}
            />
            {/* Main Foreground Image */}
            <Image
              src={src}
              alt={`${alt} ${i + 1}`}
              fill
              draggable={false}
              sizes={sizes}
              priority={i === 0}
              className="object-cover z-10"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo((active - 1 + images.length) % images.length, true)}
        aria-label="Previous image"
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/75 z-10 shadow-md"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => goTo((active + 1) % images.length, true)}
        aria-label="Next image"
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/75 z-10 shadow-md"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
