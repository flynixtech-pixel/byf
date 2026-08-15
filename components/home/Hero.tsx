"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Settings, Star, Menu, Moon, Sun, X, FileText } from "lucide-react";
import { HERO_IMAGES, HERO_SLIDE_DURATION_MS } from "./data";
import { PrimaryButton } from "./ui";
import { SearchSuggestions } from "./SearchSuggestions";
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
  onSearchSubmit,
  onOpenFilters,
  activeFilterCount = 0,
  venues = [],
}: {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit?: () => void;
  onOpenFilters: () => void;
  activeFilterCount?: number;
  venues?: any[];
}) {
  const router = useRouter();
  const [heroSlide, setHeroSlide] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "midnight-stadium" || theme === "royal-purple";

  const { customer, status, logout } = useCustomerAuth();
  const [authView, setAuthView] = useState<"login" | "signup" | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [customer?.avatarUrl]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestionsOpen(false);
    onSearchSubmit?.();
  };

  return (
    <section id="home" className="relative z-50">
      <div
        className="relative sm:bg-[linear-gradient(135deg,#15101f_0%,#211731_35%,#2b1f3d_60%,#3a2a1a_100%)] bg-transparent"
      >
        {/* rotating background slideshow - hidden on mobile */}
        <div className="absolute inset-0 overflow-hidden hidden sm:block" aria-hidden>
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
                loading={i === 0 ? "eager" : undefined}
                sizes="(max-width: 639px) 1px, 100vw"
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

        {/* ambient glow accents - hidden on mobile */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-500/20 blur-3xl hidden sm:block" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl hidden sm:block" />
        <div className="pointer-events-none absolute right-1/4 top-10 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl hidden sm:block" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-2 pt-2 sm:px-6 sm:pt-12 sm:pb-4 lg:pt-14">
          <div className="max-w-2xl mt-0 sm:mt-4">
            <h1
              className="hidden sm:block mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif", lineHeight: 1.1 }}
            >
              Play. Book. <span className="text-brand-400">Vibe.</span>
            </h1>

            <p className="hidden sm:block mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
              Book courts and turfs, find players for tonight&rsquo;s match, discover nearby
              restaurants, and never argue about who owes what - all from one app.
            </p>

            {/* Search bar & Instant Recommendations */}
            <div ref={searchContainerRef} className="relative mt-2 sm:mt-6">
              <form onSubmit={handleSubmit} className="flex flex-row items-center gap-2 rounded-full bg-white p-1.5 pl-3 sm:pl-5 shadow-sm border border-slate-200 sm:shadow-2xl sm:shadow-black/30 sm:border-none">
                <span aria-hidden className="text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  value={searchValue}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="Let's find your vibe"
                  className="w-full flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:px-0"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Filters"
                    onClick={onOpenFilters}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                  >
                    <Settings className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white ring-2 ring-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <PrimaryButton type="submit" className="hidden sm:inline-flex w-auto !px-6 !py-3">Search</PrimaryButton>
                </div>
              </form>

              <SearchSuggestions
                query={searchValue}
                venues={venues}
                isOpen={suggestionsOpen}
                onClose={() => setSuggestionsOpen(false)}
                onSelectSuggestion={(href) => {
                  router.push(href);
                }}
              />
            </div>

            {/* trust row */}
            <div className="hidden sm:flex mt-4 items-center gap-x-5 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="flex items-center gap-0.5 text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-current" /> 4.8
                </span>{" "}
                rated by 12,000+ players
              </span>
            </div>
          </div>

          {/* slideshow dots */}
          <div className="hidden sm:flex mt-4 pb-1 items-center justify-center gap-2 lg:justify-start">
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
