"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_ITEMS_BY_VERTICAL, MOBILE_NAV_ORDER } from "./Sidebar";
import { MPIN_SESSION_KEY } from "./MpinGate";
import { getVendorBookings, listVendorCoachSubscriptions } from "@/lib/api/vendor";
import { getReadNotificationIds } from "@/lib/vendorNotifications";
import type { VendorVertical } from "@/lib/api/types";

const MAX_PRIMARY_ITEMS = 4;

const SHORT_LABELS: Record<string, string> = {
  "Bookings Management": "Bookings",
  "Payment Settled": "Payments",
  "Manage Tournaments": "Tournaments",
  "Event Listings": "Events",
  "Ticket Scanner": "Scanner",
  "Manage Coaches": "Coaches",
  "Schedule Manager": "Schedule",
  "Menu Management": "Menu",
  "Billing Slide / POS": "POS",
  "Table Reservations": "Tables",
  "Notifications": "Alerts",
  "Food Orders": "Orders",
  "Offers": "Offers",
  "Payments": "Payments",
  "Analytics": "Analytics",
  "Reviews": "Reviews",
  "Team": "Team",
  "Activity Log": "Activity",
  "Events Dashboard": "Dashboard",
  "Food Dashboard": "Dashboard",
  "Coaches Dashboard": "Dashboard",
};

export default function BottomNav({
  verticals,
}: {
  verticals: VendorVertical[];
}) {
  const pathname = usePathname();

  // Derive active vertical from the current URL, then fall back to localStorage,
  // then to the first vertical the vendor has access to.
  const activeVertical = (() => {
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

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Poll whichever vertical's bookings/enrolments feed the Notifications tab, so the bottom
  // nav can show an unread count the moment something new comes in. "Unread" means not yet
  // individually opened/acknowledged (or swept by "mark all read") on the Notifications
  // page itself — landing on this tab does NOT clear it on its own.
  useEffect(() => {
    if (activeVertical !== "turf" && activeVertical !== "coaches") {
      setUnreadNotifCount(0);
      return;
    }
    let cancelled = false;
    function poll() {
      const readIds = getReadNotificationIds();
      // Turf bookings come back sorted by slot date, not creation date — a venue with
      // 20+ bookings for later dates could bury a booking that was just made for an
      // earlier slot, so this fetches the same 500-row window the Notifications page
      // itself uses instead of a small page that can silently miss it. Coach
      // subscriptions are already sorted newest-created-first, so a small page is safe.
      const request =
        activeVertical === "turf"
          ? getVendorBookings({ limit: 500 }).then((res) => res.items.map((b) => ({ orderId: b.orderId, status: b.status })))
          : listVendorCoachSubscriptions({ limit: 100 }).then((res) => res.items.map((s) => ({ orderId: s.orderId, status: s.status })));
      request
        .then((rows) => {
          if (cancelled) return;
          const unread = rows.filter((r) => r.status !== "Cancelled" && !readIds.has(r.orderId)).length;
          setUnreadNotifCount(unread);
        })
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeVertical]);

  const allItems = NAV_ITEMS_BY_VERTICAL[activeVertical];
  const customOrder = MOBILE_NAV_ORDER[activeVertical];
  const primaryItems = customOrder
    ? (customOrder.map((href) => allItems.find((item) => item.href === href)).filter(Boolean) as typeof allItems)
    : allItems.slice(0, MAX_PRIMARY_ITEMS);

  const isMoreActive = pathname === "/vendor/more";

  // Pick the single best (longest) matching nav href so prefix routes like
  // /vendor/coaches don't also light up when on /vendor/coaches/schedule.
  const bestHref = allItems
    .map((i) => i.href)
    .filter((h) => pathname === h || pathname?.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-surface-border bg-white lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {primaryItems.map(({ href, label, icon: Icon }) => {
        const active = href === bestHref && !isMoreActive;
        const isDashboard = href.endsWith("/dashboard");
        const isNotifications = href.endsWith("/notifications");

        if (isDashboard) {
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-end text-center gap-1 pb-1.5 text-[11px] font-medium text-ink-faint"
            >
              <span
                className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-colors ${
                  active ? "bg-vibe-violet" : "bg-vibe-navy"
                }`}
              >
                <Icon size={22} strokeWidth={2} className="text-white" />
              </span>
              <span className={active ? "text-vibe-violet" : "text-ink-faint"}>{SHORT_LABELS[label] ?? label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            onClick={() => sessionStorage.removeItem(MPIN_SESSION_KEY)}
            className={`flex flex-1 flex-col items-center text-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-vibe-violet" : "text-ink-faint"
            }`}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={2} />
              {isNotifications && unreadNotifCount > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vibe-coral px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </span>
            {SHORT_LABELS[label] ?? label}
          </Link>
        );
      })}
      <Link
        href="/vendor/more"
        onClick={() => sessionStorage.removeItem(MPIN_SESSION_KEY)}
        className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
          isMoreActive ? "text-vibe-violet" : "text-ink-faint"
        }`}
      >
        <Menu size={20} strokeWidth={2} />
        More
      </Link>
    </nav>
  );
}
