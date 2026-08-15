"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, ShieldCheck, User, X } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { useCustomerAuth } from "./providers/CustomerAuthProvider";
import { LoginModal } from "./home/modals/LoginModal";
import { SignupModal } from "./home/modals/SignupModal";
import { CustomerNotificationBell } from "./notifications/CustomerNotificationBell";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Sports", href: "/games" },
  { label: "Dineout", href: "/food" },
  { label: "Events", href: "/events" },
  { label: "Coaches", href: "/coaches" },
  { label: "Community", href: "/community" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Blog", href: "/blogs" },
];

/** The one header every page renders — same links, same auth state, same look everywhere. */
export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup" | null>(null);
  const [imgError, setImgError] = useState(false);
  const pathname = usePathname();
  const { customer, status, logout } = useCustomerAuth();
  const isLoggedIn = status === "authenticated";
  const userName = customer?.name?.split(" ")[0] ?? "";

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

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-2.5 py-2 sm:gap-4 sm:px-6">
        <BrandLogo
          className="shrink min-w-0"
          logoBoxClassName="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shrink-0"
          imageClassName="p-1"
          priority
        />

        <nav className="hidden flex-1 items-center justify-center gap-5 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold transition ${
                isActive(link.href) ? "text-brand-600" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <CustomerNotificationBell />
          <Link
            href="/vendor/register"
            className="hidden rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700 lg:inline-flex shadow-sm"
          >
            List Your Games
          </Link>

          {status === "loading" ? (
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
            </div>
          ) : status === "authenticated" ? (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/profile"
                aria-label="My Profile"
                title="My Profile"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-bold text-brand-700 transition hover:bg-brand-200 border border-brand-200 shadow-sm shrink-0"
              >
                {customer?.avatarUrl && !imgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customer.avatarUrl}
                    alt={userName}
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  getInitials()
                )}
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAuthView("login")}
                className="hidden rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 sm:inline-flex"
              >
                Login / Sign Up
              </button>
              <button
                type="button"
                onClick={() => setAuthView("login")}
                aria-label="Profile / Login"
                title="Profile / Login"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 sm:hidden shrink-0"
              >
                <User className="h-4 w-4 text-slate-700" />
              </button>
            </>
          )}

          <button
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 lg:hidden shrink-0 cursor-pointer"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>

    {/* Side Drawer Overlay */}
    <div 
      className={`fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} 
      onClick={() => setMobileOpen(false)}
      aria-hidden="true"
    />

    {/* Side Drawer Menu */}
    <div 
      className={`fixed inset-y-0 right-0 z-[100] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <span className="font-extrabold text-slate-900 text-lg tracking-tight">Menu</span>
        <button onClick={() => setMobileOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95">
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1 flex flex-col">
        <nav className="flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`text-base font-bold pb-3 border-b border-slate-50 transition-colors ${
                isActive(link.href) ? "text-brand-600" : "text-slate-700 hover:text-brand-600"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        
        <div className="mt-8 pt-6 border-t border-slate-100">
          {status === "loading" ? (
            <div className="flex flex-col gap-3">
              <div className="h-11 animate-pulse rounded-full bg-slate-100" />
              <div className="h-11 animate-pulse rounded-full bg-slate-100" />
            </div>
          ) : status === "authenticated" ? (
            <div className="flex flex-col gap-3">
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition active:scale-95 hover:bg-slate-50"
              >
                My Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition active:scale-95 hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setAuthView("login");
                }}
                className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-95"
              >
                Login / Sign Up
              </button>
              <Link
                href="/vendor/register"
                onClick={() => setMobileOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition active:scale-95"
              >
                List Your Games
              </Link>
            </div>
          )}
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
    </>
  );
}
