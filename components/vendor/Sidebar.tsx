"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  CalendarCheck2,
  LayoutGrid,
  Wallet,
  CreditCard,
  ShieldCheck,
  Settings2,
  BarChart3,
  Megaphone,
  LogOut,
  UtensilsCrossed,
  ClipboardList,
  UserRoundCog,
  Tag,
  Ticket,
  ScanLine,
  Receipt,
  Boxes,
  Clock3,
  Star,
  X,
  Bell,
} from "lucide-react";
import { MPIN_SESSION_KEY } from "./MpinGate";
import type { VendorVertical } from "@/lib/api/types";

export const NAV_ITEMS_BY_VERTICAL: Record<VendorVertical, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  turf: [
    { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vendor/listings", label: "Turfs & Games", icon: LayoutGrid },
    { href: "/vendor/notifications", label: "Notifications", icon: Bell },
    { href: "/vendor/bookings", label: "Bookings Management", icon: CalendarCheck2 },
    { href: "/vendor/pricing", label: "Price Setting", icon: Tag },
    { href: "/vendor/payments", label: "Payment Settled", icon: Wallet },
    { href: "/vendor/memberships", label: "Memberships", icon: CreditCard },
    { href: "/vendor/statistics", label: "Statistics", icon: BarChart3 },
  ],
  events: [
    { href: "/vendor/events/dashboard", label: "Events Dashboard", icon: LayoutDashboard },
    { href: "/vendor/events/listings", label: "Event Listings", icon: Ticket },
    { href: "/vendor/events/scanner", label: "Ticket Scanner", icon: ScanLine },
  ],
  food: [
    { href: "/vendor/food/dashboard", label: "Food Dashboard", icon: LayoutDashboard },
    { href: "/vendor/food/notifications", label: "Notifications", icon: Bell },
    { href: "/vendor/food/reservations", label: "Table Reservations", icon: CalendarCheck2 },
    { href: "/vendor/food/tables", label: "Tables", icon: LayoutGrid },
    { href: "/vendor/food/profile", label: "Restaurants", icon: Briefcase },
    { href: "/vendor/food/menu", label: "Menu Management", icon: UtensilsCrossed },
    { href: "/vendor/food/offers", label: "Offers", icon: Tag },
    { href: "/vendor/food/orders", label: "Food Orders", icon: ClipboardList },
    { href: "/vendor/food/payments", label: "Payments", icon: Wallet },
    { href: "/vendor/food/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/vendor/food/reviews", label: "Reviews", icon: Star },
    { href: "/vendor/food/team", label: "Team", icon: UserRoundCog },
    { href: "/vendor/food/activity", label: "Activity Log", icon: Clock3 },
    { href: "/vendor/food/pos", label: "Billing Slide / POS", icon: Receipt },
    { href: "/vendor/food/inventory", label: "Inventory", icon: Boxes },
  ],
  coaches: [
    { href: "/vendor/coaches/dashboard", label: "Coaches Dashboard", icon: LayoutDashboard },
    { href: "/vendor/coaches", label: "Manage Coaches", icon: UserRoundCog },
    { href: "/vendor/coaches/schedule", label: "Schedule Manager", icon: CalendarCheck2 },
    { href: "/vendor/coaches/notifications", label: "Notifications", icon: Bell },
  ],
};

/** Mobile bottom-nav order, when it should differ from the desktop sidebar's reading order. */
export const MOBILE_NAV_ORDER: Partial<Record<VendorVertical, string[]>> = {
  turf: ["/vendor/bookings", "/vendor/notifications", "/vendor/dashboard", "/vendor/pricing"],
  events: ["/vendor/events/listings", "/vendor/events/scanner", "/vendor/events/dashboard"],
  // Dashboard sits 3rd so the bottom-nav floats it to the centre.
  coaches: ["/vendor/coaches", "/vendor/coaches/schedule", "/vendor/coaches/dashboard", "/vendor/coaches/notifications"],
  // Dashboard sits 3rd so the bottom-nav floats it to the centre; deeper tools live under "More".
  food: ["/vendor/food/reservations", "/vendor/food/tables", "/vendor/food/dashboard", "/vendor/food/menu"],
};

const VERTICAL_TAB_LABELS: Record<VendorVertical, string> = {
  turf: "Turf",
  events: "Events",
  food: "Food",
  coaches: "Coaches",
};

export const SHARED_NAV_ITEMS = [
  { href: "/vendor/role-access", label: "Role Access", icon: ShieldCheck },
  { href: "/vendor/profile", label: "Profile", icon: Settings2 },
  { href: "/vendor/marketing", label: "Marketing", icon: Megaphone },
] as const;

export default function Sidebar({
  open,
  onClose,
  onLogout,
  verticals,
  desktopClosed,
}: {
  open: boolean;
  onClose: () => void;
  onLogout?: () => void;
  verticals: VendorVertical[];
  desktopClosed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeMode = (() => {
    const matched = verticals.find((v) =>
      NAV_ITEMS_BY_VERTICAL[v].some((item) => pathname?.startsWith(item.href))
    );
    if (matched) return matched;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("byv_vendor_active_vertical") as VendorVertical | null;
      if (stored && verticals.includes(stored)) return stored;
    }
    return verticals[0] ?? "turf";
  })();

  /** Switch panels: jump straight to that vertical's dashboard (its first nav item). */
  function switchVertical(v: VendorVertical) {
    localStorage.setItem("byv_vendor_active_vertical", v);
    const home = NAV_ITEMS_BY_VERTICAL[v][0]?.href ?? "/vendor/dashboard";
    router.push(home);
    onClose();
  }

  const sharedItems = activeMode === "events"
    ? SHARED_NAV_ITEMS.filter((item) => item.href !== "/vendor/role-access")
    : SHARED_NAV_ITEMS;
  const navItems = [...NAV_ITEMS_BY_VERTICAL[activeMode], ...sharedItems];

  // Longest-prefix match so /vendor/coaches doesn't stay active on its sub-routes.
  const bestHref = navItems
    .map((i) => i.href)
    .filter((h) => pathname === h || pathname?.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  // Lock body scrolling on mobile when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* mobile backdrop */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed z-50 inset-y-0 left-0 w-64 shrink-0 border-r border-surface-border bg-white flex flex-col transform transition-transform duration-300 ease-in-out lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:z-30 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${desktopClosed ? "lg:-translate-x-full" : "lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="BYV Logo" className="h-9 w-auto rounded-lg object-contain shadow-sm" />
            <div>
              <p className="font-display font-black text-slate-900 text-[15px] leading-tight tracking-tight">
                Book Your Vibes
              </p>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide">Vendor Workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-ink-faint hover:text-ink p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {verticals.length > 1 && (
          <div className="p-3 border-b border-surface-border shrink-0">
            <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Switch panel</p>
            <div
              className="grid gap-1 rounded-xl bg-cream-200 p-1 text-xs font-semibold"
              style={{ gridTemplateColumns: `repeat(${verticals.length}, minmax(0, 1fr))` }}
            >
              {verticals.map((v) => (
                <button
                  key={v}
                  onClick={() => switchVertical(v)}
                  className={`rounded-lg py-2 transition ${
                    activeMode === v ? "bg-white text-vibe-violet shadow" : "text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  {VERTICAL_TAB_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
            Navigation
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === bestHref;
            const isDashboard = href.endsWith("/dashboard");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  if (!isDashboard) sessionStorage.removeItem(MPIN_SESSION_KEY);
                  onClose();
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-vibe-violet/10 text-vibe-violet font-bold"
                    : "text-ink-soft hover:bg-cream-300"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-surface-border bg-white shrink-0 mt-auto">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-vibe-coral hover:bg-vibe-coral/10 w-full transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
