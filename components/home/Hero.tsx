"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Settings, Star, Menu, Moon, Sun, X, FileText } from "lucide-react";
import { HERO_IMAGES, HERO_SLIDE_DURATION_MS } from "./data";
import { PrimaryButton } from "./ui";
import { useTheme } from "@/components/theme/ThemeProvider";
import { BrandLogo } from "@/components/brand-logo";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { LoginModal } from "./modals/LoginModal";
import { SignupModal } from "./modals/SignupModal";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Sports", href: "/games" },
  { label: "Dineout", href: "/food" },
  { label: "Events", href: "#tournaments" },
  { label: "Coaches", href: "#coaches" },
  { label: "Community", href: "#community" },
  { label: "Tournaments", href: "#tournaments" },
  { label: "Blog", href: "/blogs" },
];


export function Hero({
  searchValue,
  onSearchChange,
  onOpenFilters,
  activeFilterCount = 0,
}: {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onOpenFilters: () => void;
  activeFilterCount?: number;
}) {
  const [heroSlide, setHeroSlide] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "midnight-stadium" || theme === "royal-purple";

  const { customer, status, logout } = useCustomerAuth();
  const [authView, setAuthView] = useState<"login" | "signup" | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [customer?.avatarUrl]);

  const getInitials = () => {
    if (customer?.name) {
      const parts = customer.name.trim().split(/\s+/);
      const firstInitial = parts[0]?.charAt(0) || "";
      const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : "";
      const initials = (firstInitial + lastInitial).toUpperCase();
      if (initials) return initials;
    }
    if (customer?.email) {
      return customer.email.charAt(0).toUpperCase();
    }
    return "?";
  };

  const toggleDarkLight = () => {
    if (isDark) {
      setTheme("vibe-orange");
    } else {
      setTheme("midnight-stadium");
    }
  };

  useEffect(() => {
    const id = setInterval(() => {
      setHeroSlide((i) => (i + 1) % HERO_IMAGES.length);
    }, HERO_SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="home" className="relative overflow-hidden">
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(135deg, #15101f 0%, #211731 35%, #2b1f3d 60%, #3a2a1a 100%)",
        }}
      >
        {/* rotating background slideshow */}
        <div className="absolute inset-0" aria-hidden>
          {HERO_IMAGES.map((src, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === heroSlide ? "opacity-100" : "opacity-0"
                }`}
            >
              <Image
                src={src}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className={`object-cover ${i === heroSlide ? "animate-[hero-kenburns_3.8s_ease-out_forwards]" : ""
                  }`}
              />
            </div>
          ))}
          {/* gradient wash so text keeps its contrast over the photos */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(21,16,31,0.88) 0%, rgba(33,23,49,0.82) 35%, rgba(43,31,61,0.78) 60%, rgba(58,42,26,0.72) 100%)",
            }}
          />
        </div>

        {/* ambient glow accents */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-10 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-20 lg:pt-20">
          <div className="max-w-2xl mt-4 sm:mt-6">
            <h1
              className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif", lineHeight: 1.1 }}
            >
              Play. Book. <span className="text-brand-400">Vibe.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
              Book courts and turfs, find players for tonight&rsquo;s match, discover nearby
              restaurants, and never argue about who owes what - all from one app.
            </p>

            {/* Search bar */}
            <div className="mt-7 flex flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-2xl shadow-black/30 sm:flex-row sm:items-center sm:rounded-full sm:p-1.5 sm:pl-5">
              <span aria-hidden className="hidden text-slate-400 sm:block">
                <Search className="h-4 w-4" />
              </span>
              <input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Let's find your vibe"
                className="w-full flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:bg-transparent sm:px-0 sm:py-2"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Filters"
                  onClick={onOpenFilters}
                  className="relative hidden h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 sm:flex"
                >
                  <Settings className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white ring-2 ring-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <PrimaryButton className="w-full !px-6 !py-3 sm:w-auto">Search</PrimaryButton>
              </div>
            </div>

            {/* trust row */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="flex items-center gap-0.5 text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-current" /> 4.8
                </span>{" "}
                rated by 12,000+ players
              </span>
              <span className="hidden h-3 w-px bg-white/15 sm:block" />
              <span>Zero booking commission for your first 3 matches</span>
            </div>
          </div>

          {/* slideshow dots */}
          <div className="mt-10 flex items-center justify-center gap-2 lg:justify-start">
            {HERO_IMAGES.map((src, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show hero image ${i + 1}`}
                onClick={() => setHeroSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === heroSlide ? "w-7 bg-brand-400" : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
              />
            ))}
          </div>
        </div>

      </div>
      {authView === "login" && (
        <LoginModal
          onClose={() => setAuthView(null)}
          onLoggedIn={() => setAuthView(null)}
          onSwitchToSignup={() => setAuthView("signup")}
        />
      )}
      {authView === "signup" && (
        <SignupModal
          onClose={() => setAuthView(null)}
          onSignedUp={() => setAuthView(null)}
          onSwitchToLogin={() => setAuthView("login")}
        />
      )}
    </section>
  );
}
