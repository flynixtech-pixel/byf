"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Settings, Star, Menu, Moon, Sun, X, FileText, Home, Gamepad2, Calendar, Users, UtensilsCrossed, GraduationCap, Trophy, BookOpen } from "lucide-react";
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
  { label: "Games", href: "/games" },
  { label: "Dineout", href: "/food" },
  { label: "Events", href: "#tournaments" },
  { label: "Community", href: "#community" },
  { label: "Tournaments", href: "#tournaments" },
  { label: "Blog", href: "/blogs" },
];

const MOBILE_ICON_NAV = [
  { label: "Your Vibe", href: "/", icon: Home },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Community", href: "/community", icon: Users },
  { label: "Tournaments", href: "/tournaments", icon: Trophy },
  { label: "Dineout", href: "#", icon: UtensilsCrossed, isComingSoon: true },
  { label: "Blog", href: "/blogs", icon: BookOpen },
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
  const pathname = usePathname();
  const [heroSlide, setHeroSlide] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "midnight-stadium" || theme === "royal-purple";

  const { customer, status, logout } = useCustomerAuth();
  const [authView, setAuthView] = useState<"login" | "signup" | null>(null);
  const [imgError, setImgError] = useState(false);
  const [compactMobileNav, setCompactMobileNav] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setCompactMobileNav(window.scrollY > 250);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <section id="home" className="relative z-30">
      <div
        className={`fixed inset-x-0 top-[48px] z-40 border-b border-slate-200/70 bg-white/92 px-3 py-1.5 shadow-[0_8px_26px_rgba(15,23,42,0.09)] backdrop-blur-xl transition-all duration-300 sm:hidden ${
          compactMobileNav ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
        }`}
      >
        <nav className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Quick navigation">
          <div className="flex w-max min-w-full items-center gap-1">
            {MOBILE_ICON_NAV.map(({ label, href, icon: Icon, isComingSoon }) => {
              const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 font-display text-[13px] font-black transition ${isComingSoon ? "opacity-70" : "active:scale-95"} ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{label}</span>
                  {isComingSoon && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-[1px] text-[7px] font-black uppercase text-white shadow-sm">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
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

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-4 pt-4 sm:px-6 sm:pt-12 sm:pb-4 lg:pt-14">
          <div className="max-w-2xl mt-2 sm:mt-4">
            <h1
              className="hidden sm:block mt-4 text-4xl font-display font-black tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]"
            >
              Play. Book. <span className="text-brand-400">Vibe.</span>
            </h1>

            <p className="hidden sm:block mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
              Book courts and turfs, find players for tonight&rsquo;s match, discover nearby
              restaurants, and never argue about who owes what - all from one app.
            </p>

            <div ref={searchContainerRef} className="relative mt-2 sm:mt-6">
              <form onSubmit={handleSubmit} className="flex w-full items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200 transition-shadow focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10 sm:rounded-[28px] sm:p-2.5 sm:shadow-2xl sm:shadow-black/30 sm:border-none">
                <div className="flex flex-1 items-center gap-2 pl-2 sm:gap-3 sm:pl-4">
                  <Search className="h-5 w-5 shrink-0 text-slate-400 sm:h-6 sm:w-6" />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      setSuggestionsOpen(true);
                    }}
                    onFocus={() => setSuggestionsOpen(true)}
                    placeholder="Let's find your vibe"
                    className="w-full bg-transparent py-2 text-[15px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 sm:text-base sm:py-1.5"
                  />
                </div>
                <div className="flex shrink-0 items-center pr-1 sm:pr-0 gap-2">
                  <button
                    type="button"
                    aria-label="Filters"
                    onClick={() => {
                      setSuggestionsOpen(false);
                      onOpenFilters();
                    }}
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 sm:h-12 sm:w-12 sm:rounded-2xl sm:bg-slate-100/80 sm:border-none"
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-[10px] font-bold text-white shadow-sm">
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

            <nav
              aria-label="Explore Book Your Vibe"
              className="-mx-4 mt-3 overflow-x-auto px-4 sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex w-max min-w-full gap-2 pb-2">
                {MOBILE_ICON_NAV.map(({ label, href, icon: Icon, isComingSoon }, index) => {
                  const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
                      className={`group relative flex min-w-[70px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-2.5 py-2.5 transition ${isComingSoon ? "opacity-70" : "active:scale-95"} ${
                        isActive
                          ? "border-brand-300 bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-[0_8px_22px_rgba(220,38,38,0.22)]"
                          : "border-slate-200/80 bg-white text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.07)]"
                      }`}
                    >
                      <span className={`relative grid h-8 w-8 place-items-center rounded-xl ${isActive ? "bg-white/20" : "bg-slate-50 group-hover:bg-brand-50"}`}>
                        <Icon className={`h-[18px] w-[18px] ${isActive ? "text-white" : "text-slate-600 group-hover:text-brand-600"}`} strokeWidth={2.2} />
                        {isComingSoon && (
                          <span className="absolute -right-4 -top-1 rounded-full bg-rose-500 px-1.5 py-[1px] text-[7px] font-black uppercase text-white shadow-sm">
                            Soon
                          </span>
                        )}
                      </span>
                      <span className="font-display text-[11px] font-black tracking-tight">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
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
