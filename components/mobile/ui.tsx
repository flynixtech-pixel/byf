"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  User,
  X,
  Home,
  Gamepad2,
  Calendar,
  Users,
  UtensilsCrossed,
  GraduationCap,
  Trophy,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { LoginModal } from "@/components/home/modals/LoginModal";
import { SignupModal } from "@/components/home/modals/SignupModal";
import { CustomerNotificationBell } from "@/components/notifications/CustomerNotificationBell";

const MOBILE_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Sports", href: "/games" },
  { label: "Events", href: "/events" },
  { label: "Coaches", href: "/coaches" },
  { label: "Community", href: "/community" },
  { label: "Tournaments", href: "/tournaments" },
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

export function MobileTopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup" | null>(null);
  const { customer, status, logout } = useCustomerAuth();
  const isLoggedIn = status === "authenticated";

  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div className="h-[60px] w-full sm:hidden" aria-hidden />
      <div className="fixed inset-x-0 top-0 z-50 flex flex-col bg-white w-full sm:hidden border-b border-slate-100 shadow-xs">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <BrandLogo
            logoBoxClassName="h-11 w-11 rounded-xl"
            imageClassName="p-1"
            titleClassName="text-slate-900 text-xs"
            subtitleClassName="text-slate-400 text-[8px]"
            priority
          />
          <div className="flex shrink-0 items-center gap-2">
            <CustomerNotificationBell />
            {isLoggedIn ? (
              <Link
                href="/profile"
                aria-label="My Profile"
                title="My Profile"
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-200 bg-brand-50 text-xs font-black text-brand-700 shadow-2xs transition active:scale-95"
              >
                {customer?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={customer.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  customer?.name?.charAt(0).toUpperCase() || <User className="h-4 w-4 text-brand-600" />
                )}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setAuthView("login")}
                aria-label="Profile / Login"
                title="Profile / Login"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:border-brand-300 hover:text-brand-600 active:scale-95"
              >
                <User className="h-4 w-4 text-slate-700" />
              </button>
            )}
            <button
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition active:scale-95"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <nav
        aria-label="Explore Book Your Vibe"
        className="overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-slate-50/30 sm:hidden"
      >
        <div className="flex w-max min-w-full gap-2 pb-2 pt-3">
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

      {/* Compact sliding nav */}
      <div
        className={`fixed inset-x-0 top-[60px] z-40 border-b border-slate-200/70 bg-white/92 px-3 py-1.5 shadow-[0_8px_26px_rgba(15,23,42,0.09)] backdrop-blur-xl transition-all duration-300 sm:hidden ${
          isScrolled ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
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


      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 top-0 z-50 max-h-[85vh] overflow-y-auto rounded-b-3xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <BrandLogo logoBoxClassName="h-11 w-11 rounded-xl" imageClassName="p-1.5" />
              <button
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-4 flex flex-col gap-1">
              {MOBILE_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    <User className="h-4 w-4 text-brand-500" /> My Profile ({customer?.name?.split(" ")[0] || "User"})
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 active:scale-95"
                  >
                    <LogOut className="h-4 w-4 text-rose-600" /> Logout
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthView("login");
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-95"
                >
                  <LogIn className="h-4 w-4" /> Login / Sign Up
                </button>
              )}
            </div>
          </div>
        </>
      )}

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
    </>
  );
}

export function MobileCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function MobileSectionRow({
  title,
  actionLabel,
  onAction,
  emoji,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  emoji?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-extrabold text-slate-900">
        {title} {emoji}
      </h2>
      {actionLabel && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
        >
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function MobileChip({
  label,
  selected,
  onClick,
  icon: Icon,
  image,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
  image?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-4 py-3 transition ${
        selected
          ? "border-brand-300 bg-brand-50 text-brand-600"
          : "border-slate-100 bg-white text-slate-600"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center">
        {image ?? (Icon && <Icon className="h-6 w-6" />)}
      </span>
      <span className="text-[11px] font-semibold whitespace-nowrap">{label}</span>
    </button>
  );
}
