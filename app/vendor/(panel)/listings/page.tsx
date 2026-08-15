"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Copy, Eye, Filter, Plus, Search, Share2, ShieldCheck, Store, Trash2, Users } from "lucide-react";
import { PageHero, Badge } from "@/components/vendor/ui";
import { useVendorAuth } from "@/components/providers/VendorAuthProvider";
import { Toast } from "@/components/admin/Toast";
import { Listing } from "@/lib/types";
import { getVendorListings, createVendorListing, deleteVendorListing } from "@/lib/api/vendor";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { categoryLabel } from "@/lib/taxonomy";


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
      return l.title.toLowerCase().includes(query.toLowerCase());
    });
  }, [allListings, query]);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="VENDOR LISTINGS"
        title="Manage your listings"
        description="Add turfs, indoor games, or events — control pricing, availability and visibility from one place."
        icon={<CalendarDays size={28} className="text-[#d8b4fe]" />}
        right={
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search my listings..."
                  className="w-full rounded-full border border-indigo-400/30 bg-indigo-900/30 pl-9 pr-3 py-2.5 text-[12px] font-semibold text-white placeholder-indigo-300 outline-none backdrop-blur-md transition-colors focus:border-indigo-300 focus:bg-indigo-900/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/vendor/listings/new?kind=turf"
                className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-full bg-white text-[#281c52] font-bold text-xs px-4 shadow-sm hover:scale-105 transition-all"
              >
                <Plus size={14} /> Add Turf
              </Link>
              {canAddEvent && (
                <Link
                  href="/vendor/listings/new?kind=event"
                  className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-full bg-fuchsia-400 text-white font-bold text-xs px-4 shadow-sm hover:scale-105 transition-all"
                >
                  <Plus size={14} /> Add Event
                </Link>
              )}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SummaryCard label="My Listings" value={allListings.length} hint="Vendor owned" icon={<Store size={20} />} color="text-indigo-600 bg-indigo-50" trend="↑ 12%" trendColor="text-green-700 bg-green-100" />
        <SummaryCard label="Claimable Admin Listings" value={0} hint="Available to claim" icon={<ShieldCheck size={20} />} color="text-slate-600 bg-slate-100" trend="0%" trendColor="text-emerald-700 bg-emerald-100" />
        <SummaryCard label="Claimed From Admin" value={0} hint="Claimed listings" icon={<Users size={20} />} color="text-slate-600 bg-slate-100" trend="0%" trendColor="text-emerald-700 bg-emerald-100" />
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  icon,
  color,
  trend,
  trendColor,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  color: string;
  trend: string;
  trendColor: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-[1.25rem] border border-slate-100 bg-white p-3.5 sm:p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.85rem] ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-bold text-slate-900 leading-tight">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="font-display text-[20px] font-black text-slate-900 leading-none">{value}</p>
        </div>
        <p className="text-[10px] font-medium text-slate-500 mt-0.5">{hint}</p>
      </div>
      <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${trendColor}`}>
        {trend}
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
  const imageUrl = listing.coverImage || listing.images?.[0]?.url || "/images/events-banner.png";

  return (
    <div className="group rounded-[1.5rem] border border-slate-100 bg-white overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col hover:-translate-y-1">
      <div 
        className="h-36 bg-cover bg-center relative flex items-end p-4"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#200f50]/80 to-transparent mix-blend-multiply opacity-60" />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge tone={TYPE_TONE[listing.type]}>{listing.type}</Badge>
          <Badge tone={listing.status === "Active" ? "success" : "neutral"}>
            {listing.status}
          </Badge>
        </div>
        <button
          type="button"
          onClick={() => onShare(listing)}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-110 hover:bg-white/40 shadow-sm"
          title="Share Link"
        >
          <Share2 size={14} />
        </button>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h4 className="font-display font-bold text-slate-900 text-[16px] leading-snug mb-3 line-clamp-2">{listing.title}</h4>
        
        <div className="flex items-center justify-between mb-4 mt-auto">
          <div>
            <p className="text-[18px] font-black text-slate-900">
              ₹{listing.price.toLocaleString("en-IN")}
              <span className="text-[11px] font-semibold text-slate-500 ml-1">/slot</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[9px] font-bold tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Listed</span>
             <p className="text-[10px] font-semibold text-slate-500">{listing.listedOn}</p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-3 text-[12px] text-emerald-800 flex items-center gap-2.5 font-bold mb-1">
           <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
           Access: {listing.access}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-slate-100">
          <Link
            href={`/vendor/listings/${listing.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#281c52] text-white text-[12px] font-bold py-2.5 transition-all hover:bg-indigo-900 hover:shadow-lg hover:shadow-indigo-900/20"
          >
            <Eye size={14} /> View Details
          </Link>
          <button
            onClick={() => onClone(listing)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-slate-700 text-[12px] font-bold py-2.5 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Copy size={14} /> Clone
          </button>
          <button
            onClick={() => onDelete(listing)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-100 text-rose-600 text-[12px] font-bold py-2.5 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
});
