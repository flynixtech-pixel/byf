"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpen,
  Calendar,
  Gamepad2,
  GraduationCap,
  Home,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  Trophy,
  Users,
  UserRoundCog,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { LoginModal } from "@/components/home/modals/LoginModal";
import { SignupModal } from "@/components/home/modals/SignupModal";

const PRIMARY_TABS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Community", href: "/community", icon: Users },
  { label: "Dineout", href: "/food", icon: UtensilsCrossed, isComingSoon: true },
];

const MORE_LINKS = [
  { label: "Profile", href: "/profile", icon: UserRoundCog },
  { label: "Coaches", href: "/coaches", icon: GraduationCap },
  { label: "Tournaments", href: "/tournaments", icon: Trophy },
  { label: "Blog", href: "/blogs", icon: BookOpen },
  { label: "View Challenges", href: "/challenges", icon: Zap },
];

/** Fixed mobile app-shell bottom tab bar — replaces the desktop footer's nav role on small screens. */
export function BottomNav() {
  const pathname = usePathname();
  const { customer, status, logout } = useCustomerAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isLoggedIn = status === "authenticated";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/vendor")) {
    return null;
  }

  return (
    <>
      <div className="h-16 sm:hidden" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] sm:hidden bg-white/85 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
          {PRIMARY_TABS.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;

            if (tab.isComingSoon) {
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => showToast(`${tab.label} is coming soon!`)}
                  className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 active:scale-90 transition-transform duration-200"
                >
                  <div className="relative flex items-center justify-center h-8 w-11 rounded-full transition-all duration-300 bg-transparent">
                    <Icon className="h-5 w-5 transition-colors duration-300 drop-shadow-sm text-slate-400" strokeWidth={2} />
                  </div>
                  <span className="w-full truncate text-center text-[9px] font-extrabold transition-all duration-300 text-slate-400 opacity-80">
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 active:scale-90 transition-transform duration-200"
              >
                <div className={`relative flex items-center justify-center h-8 w-11 rounded-full transition-all duration-300 ${active ? "bg-gradient-to-br from-brand-100 to-brand-50 shadow-inner" : "bg-transparent"}`}>
                  <Icon className={`h-5 w-5 transition-colors duration-300 drop-shadow-sm ${active ? "text-brand-600" : "text-slate-400"}`} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span
                  className={`w-full truncate text-center text-[9px] font-extrabold transition-all duration-300 ${
                    active ? "text-brand-700 opacity-100 scale-105" : "text-slate-400 opacity-80"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 active:scale-90 transition-transform duration-200"
          >
            <div className={`relative flex items-center justify-center h-8 w-11 rounded-full transition-all duration-300 ${moreOpen ? "bg-slate-100 shadow-inner" : "bg-transparent"}`}>
              <Menu className={`h-5 w-5 transition-colors duration-300 drop-shadow-sm ${moreOpen ? "text-slate-900" : "text-slate-400"}`} strokeWidth={moreOpen ? 2.5 : 2} />
            </div>
            <span className={`w-full truncate text-center text-[9px] font-extrabold transition-all duration-300 ${moreOpen ? "text-slate-900 opacity-100 scale-105" : "text-slate-400 opacity-80"}`}>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:hidden">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold uppercase tracking-wide text-slate-900">More</p>
              <button
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {MORE_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"
                  >
                    <Icon className="h-4 w-4 text-brand-500" /> {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    logout();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 active:scale-95"
                >
                  <LogOut className="h-4 w-4 text-rose-600" /> Logout
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    setAuthView("login");
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-95"
                >
                  <LogIn className="h-4 w-4" /> Login / Sign Up
                </button>
              )}
              <div>
                <Link
                  href="/vendor/login"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"
                >
                  <Store className="h-4 w-4 text-brand-500" /> Vendor Panel
                </Link>
              </div>
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

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-xl animate-in slide-in-from-bottom-5 fade-in">
          {toast}
        </div>
      )}
    </>
  );
}
