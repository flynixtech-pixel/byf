"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Camera,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Megaphone,
  Ticket,
  Trophy,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { restoreVendorSession, vendorLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

type LoginTab = "email" | "phone";

const TABS: { id: LoginTab; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
];

const HIGHLIGHTS: { icon: LucideIcon; label: string }[] = [
  { icon: Calendar, label: "Slot-Based Booking" },
  { icon: Trophy, label: "Tournament Hosting" },
  { icon: Ticket, label: "Walk-in Ticketing" },
  { icon: Camera, label: "QR Check-In" },
  { icon: CreditCard, label: "Instant Payouts" },
  { icon: TrendingUp, label: "Revenue Insights" },
  { icon: Megaphone, label: "Growth Marketing Tools" },
  { icon: Users, label: "Customer Management" },
];

function VendorLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/vendor/bookings";

  const [tab, setTab] = useState<LoginTab>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const identifierLabel = tab === "email" ? "Email" : "Phone Number";
  const identifierPlaceholder = tab === "email" ? "vendor@bookyourvibes.com" : "98765 43210";


  useEffect(() => {
    restoreVendorSession().then((vendor) => {
      if (vendor) {
        setRedirecting(true);
        let targetPath = redirectTo;
        if (redirectTo === "/vendor/dashboard" || redirectTo === "/vendor/bookings") {
          const landingByVertical: Record<string, string> = {
            turf: "/vendor/bookings",
            food: "/vendor/food/orders",
            events: "/vendor/events/listings",
            coaches: "/vendor/coaches",
          };
          targetPath = landingByVertical[vendor.verticals[0]] ?? "/vendor/bookings";
        }
        router.replace(targetPath);
      }
    });
  }, [redirectTo, router]);

  async function handleLogin() {
    setError("");
    if (!identifier.trim()) {
      setError(`Enter your ${identifierLabel.toLowerCase()}.`);
      return;
    }
    if (tab === "phone") {
      if (!otpSent) {
        setOtpSent(true);
        return;
      }
      setError("Phone OTP login isn't available yet — please use the Email tab.");
      return;
    }
    if (!password.trim()) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    try {
      const vendor = await vendorLogin({ email: identifier.trim(), password });
      let targetPath = redirectTo;
      if (redirectTo === "/vendor/dashboard" || redirectTo === "/vendor/bookings") {
        const landingByVertical: Record<string, string> = {
          turf: "/vendor/bookings",
          food: "/vendor/food/orders",
          events: "/vendor/events/listings",
          coaches: "/vendor/coaches",
        };
        targetPath = landingByVertical[vendor.verticals[0]] ?? "/vendor/bookings";
      }
      router.replace(targetPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (redirecting) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0c1912] px-6 text-center text-[#f6f3ea]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#a6ff3c]">
            Vendor Access
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Redirecting to your panel...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c1912]">
      <Image
        src="/vendorbg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ transform: "scale(1.3) translateX(-21%)", transformOrigin: "center" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0c1912] via-[#0c1912]/92 to-[#0c1912]/55 lg:via-[#0c1912]/85 lg:to-[#0c1912]/35" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c1912]/70 via-transparent to-[#0c1912]/40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(166,255,60,0.16),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(255,176,32,0.14),transparent_45%)]" />

      <button
        type="button"
        onClick={() => router.push("/")}
        aria-label="Go back"
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#f6f3ea] backdrop-blur transition hover:bg-white/20 lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col-reverse items-center justify-center gap-12 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="flex max-w-md flex-col justify-center text-[#f6f3ea]">
          <div className="flex items-center gap-2 font-[600] text-2xl" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#a6ff3c] text-[#0c1912]">BYV</span>
            Book Your Vibes
          </div>
          <h1 className="mt-6 text-3xl font-[600] leading-tight" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            Vendor <span className="text-[#a6ff3c]">Partner</span> Login
          </h1>
          <p className="mt-3 text-sm text-[#c9d6cd]">
            Manage your turf, court, or arena bookings, slots, and payouts from your professional dashboard.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.label} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-3 text-xs font-semibold text-[#e6ede8]">
                <h.icon className="h-4 w-4 shrink-0 text-[#a6ff3c]" />
                {h.label}
              </div>
            ))}
          </div>

          <div className="mt-10 flex gap-8 text-sm">
            <Stat value="500+" label="Partners" />
            <Stat value="50+" label="Cities" />
            <Stat value="4.9" label="Rating" />
          </div>
        </div>

        <div className="w-full max-w-md rounded-3xl bg-[#0c1912]/85 backdrop-blur-xl border border-[#a6ff3c]/30 p-7 sm:p-9 shadow-[0_0_60px_rgba(166,255,60,0.12)] text-white">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            Partner Login
          </h2>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-[#a6ff3c]">Access your professional dashboard.</p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-black/40 border border-white/10 p-1 text-xs font-bold uppercase">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setError("");
                  setOtpSent(false);
                }}
                className={`rounded-xl py-2.5 transition-all duration-200 cursor-pointer ${
                  tab === t.id 
                    ? "bg-[#a6ff3c] text-[#0c1912] font-black shadow-md" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#a6ff3c]">{identifierLabel}</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={identifierPlaceholder}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#a6ff3c] focus:bg-white/10 focus:ring-4 focus:ring-[#a6ff3c]/20"
              />
            </div>

            {tab === "phone" && otpSent ? (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#a6ff3c]">OTP</label>
                  <button type="button" onClick={() => setOtpSent(false)} className="text-xs font-bold text-[#a6ff3c] hover:underline">
                    Change number
                  </button>
                </div>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 font-mono text-lg tracking-[0.3em] text-white outline-none transition-all focus:border-[#a6ff3c] focus:bg-white/10 focus:ring-4 focus:ring-[#a6ff3c]/20"
                />
              </div>
            ) : tab !== "phone" ? (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#a6ff3c]">Password</label>
                  <Link href="/vendor/forgot-password" className="text-xs font-bold text-[#a6ff3c] hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 pr-12 text-sm font-semibold text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#a6ff3c] focus:bg-white/10 focus:ring-4 focus:ring-[#a6ff3c]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-slate-400 hover:text-[#a6ff3c] transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
            ) : null}

            {error && <p className="text-xs font-bold text-rose-400">{error}</p>}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#a6ff3c] py-3.5 text-sm font-black text-[#0c1912] shadow-lg transition-all hover:bg-[#b5ff54] hover:shadow-[0_0_30px_rgba(166,255,60,0.35)] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Logging in…" : tab === "phone" && !otpSent ? "Send OTP" : "Login"}
              {!loading && <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-slate-300">
            Not a partner yet?{" "}
            <Link href="/vendor/register" className="font-black text-[#a6ff3c] hover:underline">
              Apply here
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function VendorLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <VendorLoginInner />
    </Suspense>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-lg font-bold text-[#ffb020]">{value}</p>
      <p className="text-xs uppercase tracking-wide text-[#c9d6cd]">{label}</p>
    </div>
  );
}
