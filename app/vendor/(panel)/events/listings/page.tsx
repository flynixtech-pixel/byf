"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Plus, Share2, Ticket, Users, Eye, Trash2, Zap } from "lucide-react";
import { PageHero } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { EventStudio } from "@/components/vendor/EventStudio";
import { QuickAddEventModal } from "@/components/vendor/QuickAddEventModal";
import { getListingImage } from "@/lib/api/venues";
import { getVendorListings, createVendorListing, deleteVendorListing } from "@/lib/api/vendor";
import { mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { Listing } from "@/lib/api/types";
import { Listing as MockListing } from "@/lib/types";

export default function EventListingsPage() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    getVendorListings({ type: "Event" })
      .then(setListings)
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load event listings"));
  }

  useEffect(load, []);

  async function handleSave(listing: MockListing) {
    try {
      const created = await createVendorListing(mockListingToApiInput(listing));
      setListings((prev) => [created, ...(prev ?? [])]);
      setCreating(false);
      setToast("Event published");
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to create event");
    }
  }

  async function handleQuickCreate(listing: MockListing) {
    const created = await createVendorListing(mockListingToApiInput(listing));
    setListings((prev) => [created, ...(prev ?? [])]);
    setQuickAdding(false);
    setToast("Event published");
  }

  async function handleDelete(listing: Listing) {
    if (!window.confirm(`Delete "${listing.title}"? It will no longer be visible to players. This cannot be undone.`)) return;

    setDeletingId(listing._id);
    try {
      await deleteVendorListing(listing._id);
      setListings((previous) => (previous ?? []).filter((item) => item._id !== listing._id));
      setToast(`Deleted "${listing.title}". It is no longer visible to players.`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  }

  if (creating) {
    return (
      <>
        <EventStudio
          mode="create"
          audience="vendor"
          onClose={() => setCreating(false)}
          onSave={handleSave}
        />
        <Toast message={toast} onDone={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Community & Events"
        title="Event Listings"
        description="Publish and manage your events. Each listing takes bookings and check-ins just like a turf slot."
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickAdding(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"
            >
              <Zap size={16} /> Quick Add
            </button>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white text-vibe-violet px-4 py-2.5 text-sm font-semibold hover:bg-white/90"
            >
              <Plus size={16} /> Create Event
            </button>
          </div>
        }
      />

      {error && <p className="rounded-xl2 border border-surface-border bg-white p-6 text-sm text-vibe-coral">{error}</p>}

      {!error && !listings && (
        <div className="rounded-xl2 border border-surface-border bg-white p-10 text-center text-sm text-ink-faint">Loading event listings...</div>
      )}

      {listings && listings.length === 0 && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-vibe-violet/10 text-vibe-violet">
            <Ticket size={22} />
          </div>
          <h3 className="font-display font-semibold text-ink">No events yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-faint">
            Create your first event listing to start taking bookings.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => setQuickAdding(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-vibe-violet px-4 py-2.5 text-sm font-semibold text-vibe-violet hover:bg-vibe-violet/5"
            >
              <Zap size={16} /> Quick Add
            </button>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violet/90"
            >
              <Plus size={16} /> Create Event
            </button>
          </div>
        </div>
      )}

      {listings && listings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.map((l) => (
            <div key={l._id} className="overflow-hidden rounded-xl2 border border-surface-border bg-white shadow-panel">
              <div className="h-32 w-full bg-cream-300 relative">
                {getListingImage(l as any, "poster") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getListingImage(l as any, "poster")} alt={l.title} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-faint">
                    <Ticket size={28} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/venues/${l.slug || l._id}`;
                    navigator.clipboard.writeText(shareUrl);
                    setToast("Event link copied to clipboard!");
                  }}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
                  title="Share Event"
                >
                  <Share2 size={13} />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold text-ink leading-tight">{l.title}</h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(l.status)}`}>{l.status}</span>
                </div>
                {l.categories?.[0] && <p className="text-xs text-ink-faint">{l.categories[0]}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-ink-soft">
                  <span className="inline-flex items-center gap-1"><MapPin size={13} /> {l.city}</span>
                  {l.availableFrom && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={13} /> {new Date(l.availableFrom).toLocaleDateString("en-IN")}
                    </span>
                  )}
                  {l.capacity ? (
                    <span className="inline-flex items-center gap-1"><Users size={13} /> {l.capacity} seats</span>
                  ) : null}
                </div>
                <p className="pt-1 text-sm font-semibold text-ink">
                  {l.price === 0 ? "Free entry" : `₹${l.price.toLocaleString("en-IN")}`}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                  <Link
                    href={`/vendor/listings/${l._id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-vibe-violet text-white text-xs font-semibold py-2 hover:bg-vibe-violetSoft transition-colors"
                  >
                    <Eye size={14} /> Manage Event
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(l)}
                    disabled={deletingId === l._id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold py-2 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={14} /> {deletingId === l._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {quickAdding && <QuickAddEventModal onClose={() => setQuickAdding(false)} onCreate={handleQuickCreate} />}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function statusClass(status: string) {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-600";
    case "Draft":
      return "bg-amber-50 text-amber-600";
    case "Inactive":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-vibe-violet/10 text-vibe-violet";
  }
}
