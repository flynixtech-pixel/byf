"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Copy, Share2, Trash2, Plus, Search } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { PackageStudio } from "@/components/vendor/PackageStudio";
import { Listing, ListingType } from "@/lib/types";
import { getAdminListings, createAdminListing, updateAdminListing, deleteAdminListing } from "@/lib/api/admin";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { categoryLabel } from "@/lib/taxonomy";

type OwnerTab = "all" | "admin" | "vendor";

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Inactive">("Active");
  const [ownerTab, setOwnerTab] = useState<OwnerTab>("all");
  const [category, setCategory] = useState("All Categories");
  const [city, setCity] = useState("All Cities");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [studio, setStudio] = useState<{ type: ListingType; editing?: Listing } | null>(null);
  const pageSize = 10;

  const refresh = useCallback(() => {
    getAdminListings()
      .then((items) => setListings(items.map(apiListingToMock)))
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load listings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const categories = useMemo(
    () => ["All Categories", ...Array.from(new Set(listings.flatMap((l) => l.categories)))],
    [listings]
  );
  const cities = useMemo(() => ["All Cities", ...Array.from(new Set(listings.map((l) => l.city)))], [listings]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const matchesQuery =
        l.title.toLowerCase().includes(query.toLowerCase()) ||
        l.city.toLowerCase().includes(query.toLowerCase()) ||
        l.address.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = l.status === statusFilter;
      const matchesOwner = ownerTab === "all" || (ownerTab === "vendor" ? !!l.ownerName : !l.ownerName);
      const matchesCategory = category === "All Categories" || l.categories.includes(category);
      const matchesCity = city === "All Cities" || l.city === city;
      return matchesQuery && matchesStatus && matchesOwner && matchesCategory && matchesCity;
    });
  }, [listings, query, statusFilter, ownerTab, category, city]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleClone(listing: Listing) {
    try {
      const input = mockListingToApiInput({ ...listing, title: `${listing.title} (Copy)`, status: "Inactive" });
      const clone = await createAdminListing(input);
      refresh();
      setToast(`Cloned "${listing.title}" as "${clone.title}"`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to clone listing");
    }
  }

  function handleShare(listing: Listing) {
    const url = `${window.location.origin}/admin/listings/${listing.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setToast("Listing link copied to clipboard");
  }

  async function handleDelete(listing: Listing) {
    if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    try {
      await deleteAdminListing(listing.id);
      refresh();
      setToast(`Deleted "${listing.title}"`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to delete listing");
    }
  }

  async function handleStudioSave(listing: Listing) {
    try {
      if (studio?.editing) {
        await updateAdminListing(studio.editing.id, mockListingToApiInput(listing));
        setToast(`Updated "${listing.title}"`);
      } else {
        await createAdminListing(mockListingToApiInput(listing));
        setToast(`Created "${listing.title}"`);
      }
      setStudio(null);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save listing");
    }
  }

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl2 p-6 text-white shadow-pop"
        style={{ background: "linear-gradient(120deg, #0c1912 0%, #15101f 60%, #211731 100%)" }}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
            Listings Console
          </span>
          <h1 className="mt-2 font-display text-xl font-semibold">Premium Listing Management</h1>
          <p className="mt-1 max-w-lg text-sm text-white/70">
            Manage listings, move faster with filters, and handle actions from one workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-white/60">Listings</p>
            <p className="text-lg font-bold">{filtered.length}</p>
          </div>
          <button
            onClick={() => setStudio({ type: "Turf" })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-vibe-lime px-4 py-2.5 text-sm font-semibold text-vibe-indigo hover:bg-vibe-lime/90"
          >
            <Plus size={15} /> Add New Listing
          </button>
          <button
            onClick={() => setStudio({ type: "Event" })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20"
          >
            <Plus size={15} /> Add New Event
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search listings, destination, city..."
            className="w-full rounded-xl border border-surface-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-vibe-violet"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-surface-border bg-white p-1">
            {(["Active", "Inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                  statusFilter === s ? "bg-ink text-white" : "text-ink-soft hover:bg-cream-300"
                }`}
              >
                {s === "Active" ? "Active" : "Deactivated"}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-xl bg-vibe-violet p-1">
            {(["all", "admin", "vendor"] as OwnerTab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setOwnerTab(t);
                  setPage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                  ownerTab === t ? "bg-white text-vibe-violet" : "text-white/80 hover:text-white"
                }`}
              >
                {t === "all" ? "All Listings" : t === "admin" ? "Admin Listings" : "Vendor Listings"}
              </button>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink-soft"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === "All Categories" ? c : categoryLabel(c)}</option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink-soft"
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-surface-border bg-white shadow-panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((l, i) => (
              <tr key={l.id} className="border-b border-surface-border last:border-0 hover:bg-cream-200/40">
                <td className="px-4 py-3 text-ink-faint">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3 font-semibold text-ink">{l.title}</td>
                <td className="px-4 py-3 text-ink-soft">{l.ownerName ?? "Book Your Vibe (Admin)"}</td>
                <td className="px-4 py-3 text-ink-soft">{l.categories.map(categoryLabel).join(", ") || "—"}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {l.city}, {l.state}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={l.status === "Active" ? "success" : "neutral"}>{l.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/listings/${l.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-violet hover:bg-vibe-violet/10"
                      title="View"
                    >
                      <Eye size={15} />
                    </Link>
                    <button
                      onClick={() => handleClone(l)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-300"
                      title="Clone"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleShare(l)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-300"
                      title="Share"
                    >
                      <Share2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(l)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">
                  Loading listings...
                </td>
              </tr>
            )}
            {!loading && pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">
                  No listings match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-xs text-ink-faint">
          <span>
            Showing {pageItems.length === 0 ? 0 : (page - 1) * pageSize + 1} to {(page - 1) * pageSize + pageItems.length} of{" "}
            {filtered.length} listings
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-surface-border px-2.5 py-1 font-semibold text-ink-soft disabled:opacity-40"
            >
              ‹
            </button>
            <span className="px-2 font-semibold text-ink">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-surface-border px-2.5 py-1 font-semibold text-ink-soft disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {studio && (
        <PackageStudio
          mode="create"
          initialType={studio.type}
          audience="admin"
          onClose={() => setStudio(null)}
          onSave={handleStudioSave}
        />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
