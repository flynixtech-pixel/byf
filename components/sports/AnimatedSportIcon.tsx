"use client";

import { useEffect, useRef, useState } from "react";

export interface AnimatedSportIconProps {
  id: string;
  label: string;
  image: string;
  alt: string;
  bubble?: string;
  index?: number;
  className?: string;
}

export function AnimatedSportIcon({
  id,
  label,
  image,
  alt,
  bubble = "from-amber-200 via-brand-100 to-amber-50",
  index = 0,
  className = "",
}: AnimatedSportIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);
  const [scoreBadge, setScoreBadge] = useState<string | null>(null);
  const [badgeKey, setBadgeKey] = useState(0);

  // Trigger animation action
  const triggerAnimation = () => {
    setAnimating(true);
    setBadgeKey((prev) => prev + 1);

    if (id === "box-cricket") {
      setScoreBadge("SIX! +6 🏏");
    } else if (id === "football") {
      setScoreBadge("GOAL! ⚽");
    } else if (id === "badminton") {
      setScoreBadge("SMASH! 🏸");
    } else if (id === "pickleball") {
      setScoreBadge("DINK! 🏓");
    } else if (id === "cricket-nets") {
      setScoreBadge("140 km/h 🎯");
    } else if (id === "tennis") {
      setScoreBadge("ACE! 🎾");
    } else if (id === "tabletennis") {
      setScoreBadge("RALLY! 🏓");
    } else {
      setScoreBadge("SCORE! ★");
    }

    const timer = setTimeout(() => {
      setAnimating(false);
    }, 1200);

    return () => clearTimeout(timer);
  };

  // Scroll observer: trigger when icon scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Stagger animation slightly based on index
            const delay = (index % 7) * 160 + 200;
            const timer = setTimeout(() => {
              triggerAnimation();
            }, delay);
            return () => clearTimeout(timer);
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [id, index]);

  // Handle page scroll velocity to gently tilt/bounce icons while scrolling
  const [scrollVelocityClass, setScrollVelocityClass] = useState("");
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let timeoutId: NodeJS.Timeout;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const delta = currentY - lastScrollY;
          lastScrollY = currentY;

          if (Math.abs(delta) > 12) {
            setScrollVelocityClass(delta > 0 ? "translate-y-[2px] rotate-[-2deg]" : "translate-y-[-2deg] rotate-[2deg]");
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              setScrollVelocityClass("");
            }, 200);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={triggerAnimation}
      onClick={triggerAnimation}
      className={`relative flex h-16 w-16 sm:h-[110px] sm:w-[110px] items-center justify-center rounded-[1.25rem] sm:rounded-[2rem] bg-slate-50 border border-slate-100 transition-all duration-300 group-hover:-translate-y-2 group-hover:bg-white group-hover:shadow-[0_12px_35px_rgba(0,0,0,0.12)] overflow-visible ${scrollVelocityClass} ${className}`}
    >
      {/* Background Gradient Bubble */}
      <div
        className={`absolute inset-0 rounded-[1.25rem] sm:rounded-[2rem] opacity-20 bg-gradient-to-br ${bubble} transition-all duration-300 group-hover:opacity-40 overflow-hidden`}
      />

      {/* Sport Icon Image with Sport-Specific CSS Animation */}
      <div className="relative z-10 flex items-center justify-center h-full w-full p-2">
        <img
          src={image}
          alt={alt}
          loading={index === 0 ? "eager" : "lazy"}
          className={`h-8 w-8 sm:h-[55px] sm:w-[55px] object-contain transition-transform duration-500 drop-shadow-md select-none ${
            animating ? getSportAnimationClass(id) : "group-hover:scale-115"
          }`}
        />
      </div>

      {/* Floating Animated Score Badge (+6, GOAL, SMASH, etc.) */}
      {scoreBadge && animating && (
        <div
          key={badgeKey}
          className="absolute -top-3.5 z-30 pointer-events-none animate-score-float flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-brand-600 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-black text-white shadow-lg shadow-rose-500/30 whitespace-nowrap border border-white/40"
        >
          <span>{scoreBadge}</span>
        </div>
      )}

      {/* Particle Effect Burst on Contact */}
      {animating && (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-visible">
          <span className="absolute top-1 left-2 h-2 w-2 rounded-full bg-amber-400 animate-ping opacity-75" />
          <span className="absolute bottom-1 right-2 h-2 w-2 rounded-full bg-rose-400 animate-ping opacity-75 delay-100" />
          <span className="absolute top-1/2 right-1 h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping opacity-75 delay-200" />
        </div>
      )}
    </div>
  );
}

// Return tailored animation classes for each sport
function getSportAnimationClass(sportId: string): string {
  switch (sportId) {
    case "box-cricket":
      return "animate-bat-hit";
    case "football":
      return "animate-football-kick";
    case "badminton":
      return "animate-badminton-smash";
    case "pickleball":
      return "animate-pickleball-bounce";
    case "cricket-nets":
      return "animate-net-bowled";
    case "tennis":
      return "animate-tennis-ace";
    case "tabletennis":
      return "animate-tabletennis-rally";
    default:
      return "animate-bounce";
  }
}
