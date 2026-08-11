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
  { label: "Sports", href: "#games" },
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

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:pb-20 lg:pt-8">
          {/* Glass Capsule Navbar */}
          <header className="flex items-center justify-between gap-3 rounded-[1.75rem] border border-purple-500/20 bg-slate-950/60 px-4 py-3.5 sm:px-6 sm:py-4 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
            <BrandLogo 
              className="group shrink-0" 
              titleClassName="text-white" 
              subtitleClassName="text-white/70" 
              boxClassName="border-white/10 bg-white shadow-[0_4px_20px_rgba(236,72,153,0.3)] transition duration-300 group-hover:scale-105" 
              logoBoxClassName="h-11 w-11 sm:h-12 sm:w-12 rounded-[1rem] sm:rounded-[1.25rem]" 
              imageClassName="p-1 sm:p-1.5 object-contain" 
              priority
            />

            {/* Navigation Links with Active Pink Line */}
            <nav className="hidden items-center gap-5 xl:gap-7 lg:flex">
              {NAV_ITEMS.map((item) => {
                const isActive = item.label === "Home";
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="relative py-1 text-sm font-bold text-white/90 transition hover:text-white"
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute left-0 bottom-0 h-0.5 w-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 shadow-[0_0_8px_#ec4899]" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right Header Action Buttons + Theme Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Dark/Light Theme Toggle */}
              <button
                type="button"
                onClick={toggleDarkLight}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-amber-300 backdrop-blur-md transition hover:scale-105 hover:bg-white/20 sm:h-11 sm:w-11"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-indigo-300" />}
              </button>

              <Link
                href="/vendor/register"
                className="hidden items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/12 md:inline-flex"
              >
                <FileText className="h-4 w-4" />
                List Your Games
              </Link>
              {status === "loading" ? (
                <div className="hidden h-11 w-11 animate-pulse rounded-2xl bg-white/10 sm:inline-flex" />
              ) : status === "authenticated" ? (
                <Link
                  href="/profile"
                  aria-label="My Profile"
                  title="My Profile"
                  className="hidden items-center justify-center h-10 w-10 sm:h-11 sm:w-11 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:scale-105 sm:inline-flex"
                >
                  {customer?.avatarUrl && !imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={customer.avatarUrl}
                      alt={customer?.name ?? ""}
                      className="h-full w-full object-cover"
                      onError={() => setImgError(true)}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    getInitials()
                  )}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthView("login")}
                  className="hidden items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition hover:scale-105 sm:inline-flex"
                >
                  Login / Sign Up
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md lg:hidden sm:h-11 sm:w-11"
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </header>

          {mobileOpen && (
            <div className="mt-4 rounded-3xl border border-purple-500/20 bg-slate-950/95 p-5 backdrop-blur-2xl lg:hidden shadow-2xl">
              <div className="grid grid-cols-2 gap-2.5">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/90 hover:bg-white/15"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    toggleDarkLight();
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 py-3 text-sm font-bold text-amber-300"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
                </button>
                <Link
                  href="/vendor/register"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3 text-sm font-bold text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  <FileText className="h-4 w-4" /> List Your Games
                </Link>
                {status === "loading" ? (
                  <div className="flex justify-center py-3">
                    <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/10" />
                  </div>
                ) : status === "authenticated" ? (
                  <div className="flex gap-2">
                    <Link
                      href="/profile"
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-bold text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        logout();
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-bold text-white"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      setAuthView("login");
                    }}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 py-3 text-sm font-bold text-white"
                  >
                    Login / Sign Up
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-w-2xl mt-8 sm:mt-12">
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
