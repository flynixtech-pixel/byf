"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, CalendarRange } from "lucide-react";
import { PageHero, SectionCard } from "@/components/vendor/ui";
import StatCard from "@/components/vendor/StatCard";
import { getVendorBookings, getVendorListings } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { Booking, Listing } from "@/lib/api/types";
import { PageBack } from "@/components/vendor/PageBack";

export default function StatisticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getVendorBookings({ limit: 500 }), getVendorListings()])
      .then(([bookingsResult, listingItems]) => {
        setBookings(bookingsResult.items);
        setListings(listingItems);
      })
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load statistics"))
      .finally(() => setLoading(false));
  }, []);

  const byListing = useMemo(
    () =>
      listings.map((l) => ({
        id: l._id,
        title: l.title,
        count: bookings.filter((b) => b.listingId === l._id).length,
      })),
    [listings, bookings]
  );

  const repeatCustomers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookings) counts.set(b.phone, (counts.get(b.phone) ?? 0) + 1);
    return Array.from(counts.values()).filter((c) => c > 1).length;
  }, [bookings]);

  const avgLeadTimeDays = useMemo(() => {
    if (bookings.length === 0) return 0;
    const totalDays = bookings.reduce((sum, b) => {
      const lead = (new Date(b.dateTime).getTime() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return sum + Math.max(lead, 0);
    }, 0);
    return Math.round((totalDays / bookings.length) * 10) / 10;
  }, [bookings]);

  const maxCount = Math.max(1, ...byListing.map((b) => b.count));

  return (
    <div className="space-y-6">
      <PageBack fallback="/vendor/dashboard" />
      <PageHero
        eyebrow="Insights"
        title="Statistics"
        description="See how your turfs, games and events are performing over time."
      />

      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-xs text-vibe-coral">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Repeat Customers" value={String(repeatCustomers)} hint="Booked more than once" icon={Users} accent="lime" />
        <StatCard label="Avg. Booking Lead Time" value={`${avgLeadTimeDays} day(s)`} hint="Booking made vs slot date" icon={CalendarRange} accent="amber" />
      </div>

      <SectionCard title="Bookings by Listing" description="Which turfs, games or events get booked the most.">
        <div className="space-y-4">
          {byListing.map((l) => (
            <div key={l.id}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-ink">{l.title}</span>
                <span className="text-ink-faint">{l.count} booking(s)</span>
              </div>
              <div className="h-2.5 rounded-full bg-cream-300 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-vibe-violet to-vibe-lime"
                  style={{ width: `${(l.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-ink-faint">Loading...</p>}
          {!loading && byListing.length === 0 && <p className="text-sm text-ink-faint">No listings yet.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
