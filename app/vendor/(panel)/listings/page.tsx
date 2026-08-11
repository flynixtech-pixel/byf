"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Eye, Plus, Search, Share2, Trash2 } from "lucide-react";
import { PageHero, Badge } from "@/components/vendor/ui";
import { useVendorAuth } from "@/components/providers/VendorAuthProvider";
import { Toast } from "@/components/admin/Toast";
import { Listing } from "@/lib/types";
import { getVendorListings, createVendorListing, deleteVendorListing } from "@/lib/api/vendor";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { categoryLabel } from "@/lib/taxonomy";

const TABS = ["All", "Turf", "Game", "Event"] as const;

const TYPE_TONE: Record<Listing["type"], "info" | "success" | "pending"> = {
  Turf: "info",
  Game: "success",
  Event: "pending",
};

export default function ListingsPage() {
  const { vendor } = useVendorAuth();
  const canAddEvent = vendor.verticals.includes("events");
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getVendorListings()
      .then((items) => setAllListings(items.map(apiListingToMock)))
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load listings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleClone = useCallback(
    async (listing: Listing) => {
      try {
        const input = mockListingToApiInput({ ...listing, title: `${listing.title} (Copy)`, status: "Inactive" });
        const clone = await createVendorListing(input);
        refresh();
        setToast(`Cloned "${listing.title}" as "${clone.title}"`);
      } catch (err) {
        setToast(err instanceof ApiError ? err.describe() : "Failed to clone listing");
      }
    },
    [refresh]
  );

  const handleDelete = useCallback(
    async (listing: Listing) => {
      if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
      try {
        await deleteVendorListing(listing.id);
        refresh();
        setToast(`Deleted "${listing.title}"`);
      } catch (err) {
        setToast(err instanceof ApiError ? err.describe() : "Failed to delete listing");
      }
    },
    [refresh]
  );

  const handleShare = useCallback((listing: Listing) => {
    const shareUrl = `${window.location.origin}/venues/${listing.slug || listing.id}`;
    navigator.clipboard.writeText(shareUrl);
    setToast("Listing link copied to clipboard!");
  }, []);

  const filtered = useMemo(() => {
    return allListings.filter((l) => {
      const matchesTab = tab === "All" || l.type === tab;
      const matchesQuery = l.title.toLowerCase().includes(query.toLowerCase());
      return matchesTab && matchesQuery;
    });
  }, [allListings, tab, query]);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Vendor Listings"
        title="Manage your listings"
        description="Add turfs, indoor games, or events — control pricing, availability and visibility from one place."
        right={
          <>
            <Link
              href="/vendor/listings/new?kind=turf"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-indigo-950 font-bold text-xs px-3.5 py-2 shadow-sm hover:scale-105 hover:shadow-md transition-all"
            >
              <Plus size={14} /> Add Turf / Game
            </Link>
            {canAddEvent && (
              <Link
                href="/vendor/listings/new?kind=event"
                className="inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-400 text-white font-bold text-xs px-3.5 py-2 shadow-sm shadow-fuchsia-500/25 hover:scale-105 hover:shadow-md transition-all"
              >
                <Plus size={14} /> Add New Event
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="My Listings" value={allListings.length} hint="Vendor owned" />
        <SummaryCard label="Claimable Admin Listings" value={0} hint="Available to claim" />
        <SummaryCard label="Claimed From Admin" value={0} hint="Claimed listings" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="inline-flex rounded-xl border border-surface-border bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === t
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search my listings..."
            className="w-full rounded-xl border-2 border-slate-100 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none transition-colors focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onClone={handleClone}
            onDelete={handleDelete}
            onShare={handleShare}
          />
        ))}
        {loading && (
          <div className="col-span-full rounded-xl2 border border-dashed border-surface-border bg-white py-14 text-center">
            <p className="text-sm text-ink-faint">Loading listings...</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full rounded-xl2 border border-dashed border-surface-border bg-white py-14 text-center">
            <p className="text-sm text-ink-faint">
              No listings match this filter yet — try another tab or add a new listing.
            </p>
          </div>
        )}
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-[1rem] border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="font-display text-2xl font-black text-slate-900">{value}</p>
        <p className="text-[10px] font-semibold text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

const ListingCard = memo(function ListingCard({
  listing,
  onClone,
  onDelete,
  onShare,
}: {
  listing: Listing;
  onClone: (listing: Listing) => void;
  onDelete: (listing: Listing) => void;
  onShare: (listing: Listing) => void;
}) {
  return (
    <div className="group rounded-[1rem] border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col hover:-translate-y-1">
      <div className="h-28 bg-gradient-to-br from-indigo-900 to-purple-900 relative flex items-end p-3">
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <Badge tone={TYPE_TONE[listing.type]}>{listing.type}</Badge>
          <Badge tone={listing.status === "Active" ? "success" : "neutral"}>
            {listing.status}
          </Badge>
        </div>
        <button
          type="button"
          onClick={() => onShare(listing)}
          className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-transform hover:scale-110 hover:bg-white/40"
          title="Share Link"
        >
          <Share2 size={12} />
        </button>
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <h4 className="font-display font-bold text-slate-900 text-[13px] leading-tight">{listing.title}</h4>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-base font-black text-slate-900">
            ₹{listing.price.toLocaleString("en-IN")}
            <span className="text-[10px] font-semibold text-slate-500"> /slot</span>
          </p>
          <span className="text-[9px] font-semibold tracking-wide text-slate-400 uppercase">Listed {listing.listedOn}</span>
        </div>

        <div className="mt-2.5 rounded-lg border border-slate-50 bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-600">
          Access: <span className="font-bold text-slate-800">{listing.access}</span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <Link
            href={`/vendor/listings/${listing.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-950 text-white text-[11px] font-bold py-1.5 transition-colors hover:bg-indigo-900"
          >
            <Eye size={12} /> View
          </Link>
          <button
            onClick={() => onClone(listing)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold py-1.5 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Copy size={12} /> Clone
          </button>
        </div>
        <button
          onClick={() => onDelete(listing)}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-100 text-rose-600 text-[11px] font-bold py-1.5 transition-colors hover:bg-rose-50"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
});
