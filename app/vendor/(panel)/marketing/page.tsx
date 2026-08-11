"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Percent, Share2, Tag, Trash2, X } from "lucide-react";
import { PageHero, SectionCard } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { getVendorListings, updateVendorListing } from "@/lib/api/vendor";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { Listing } from "@/lib/types";

const ALL = "__all__";

export default function MarketingPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getVendorListings()
      .then((l) => setListings(l.map(apiListingToMock)))
      .catch((e) => setToast(e instanceof ApiError ? e.describe() : "Failed to load listings"))
      .finally(() => setLoading(false));
  }, []);

  /** Every live promo code, flattened with the listing it belongs to. */
  const codes = useMemo(
    () =>
      listings.flatMap((l) =>
        (l.coupons ?? []).map((c) => ({ listing: l, coupon: c }))
      ),
    [listings]
  );

  async function saveListing(updated: Listing) {
    const saved = await updateVendorListing(updated.id, mockListingToApiInput(updated));
    setListings((ls) => ls.map((x) => (x.id === updated.id ? apiListingToMock(saved) : x)));
  }

  async function handleCreate(targetId: string, code: string, discountPercent: number) {
    const targets = targetId === ALL ? listings : listings.filter((l) => l.id === targetId);
    for (const l of targets) {
      if ((l.coupons ?? []).some((c) => c.code === code)) continue; // already has it
      const coupon = { id: `${code}-${Date.now()}`, code, discountPercent };
      await saveListing({ ...l, coupons: [...(l.coupons ?? []), coupon] });
    }
    setToast(`Promo code ${code} (${discountPercent}% off) is live.`);
  }

  async function handleDelete(listing: Listing, couponId: string) {
    try {
      await saveListing({ ...listing, coupons: (listing.coupons ?? []).filter((c) => c.id !== couponId) });
      setToast("Promo code removed.");
    } catch (e) {
      setToast(e instanceof ApiError ? e.describe() : "Failed to remove promo code");
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Grow"
        title="Marketing"
        description="Promote your listings, run discounts, and get more bookings for your turfs, games & events."
      />

      <div className="grid sm:grid-cols-3 gap-5">
        <SectionCard title="Promo Codes" description="Create discount codes for a listing or your whole profile.">
          <button
            onClick={() => setCreating(true)}
            disabled={loading || listings.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-vibe-violet text-white text-sm font-semibold py-2.5 hover:bg-vibe-violetSoft disabled:opacity-60"
          >
            <Percent size={16} /> Create Promo Code
          </button>
          {!loading && listings.length === 0 && (
            <p className="mt-2 text-xs text-ink-faint">Add a listing first to create promo codes.</p>
          )}
        </SectionCard>
        <SectionCard title="Featured Placement" description="Boost visibility on the homepage and search results.">
          <a
            href="mailto:bookyourvibe2026@gmail.com?subject=Featured%20Placement%20Request"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border text-ink-soft text-sm font-semibold py-2.5 hover:bg-cream-300"
          >
            <Megaphone size={16} /> Request Feature
          </a>
        </SectionCard>
        <SectionCard title="Share Listings" description="Get shareable links for Instagram, WhatsApp & more.">
          <button
            onClick={async () => {
              const url = typeof window !== "undefined" ? window.location.origin : "";
              await navigator.clipboard?.writeText(url).catch(() => {});
              setToast("Site link copied to clipboard.");
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border text-ink-soft text-sm font-semibold py-2.5 hover:bg-cream-300"
          >
            <Share2 size={16} /> Get Share Links
          </button>
        </SectionCard>
      </div>

      <SectionCard title="Live Promo Codes" description="Codes customers can apply at checkout.">
        {loading ? (
          <p className="text-sm text-ink-faint">Loading…</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-ink-faint">No promo codes yet — create one above.</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {codes.map(({ listing, coupon }) => (
              <div key={`${listing.id}-${coupon.id}`} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-vibe-violet/10 text-vibe-violet">
                    <Tag size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink tracking-wide">{coupon.code}</p>
                    <p className="truncate text-xs text-ink-faint">
                      {coupon.discountPercent}% off · {listing.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(listing, coupon.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
                  aria-label={`Delete ${coupon.code}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {creating && (
        <CreatePromoModal
          listings={listings}
          onClose={() => setCreating(false)}
          onCreate={async (targetId, code, pct) => {
            try {
              await handleCreate(targetId, code, pct);
              setCreating(false);
            } catch (e) {
              setToast(e instanceof ApiError ? e.describe() : "Failed to create promo code");
            }
          }}
        />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function CreatePromoModal({
  listings,
  onClose,
  onCreate,
}: {
  listings: Listing[];
  onClose: () => void;
  onCreate: (targetId: string, code: string, discountPercent: number) => Promise<void>;
}) {
  const [targetId, setTargetId] = useState(ALL);
  const [code, setCode] = useState("");
  const [percentInput, setPercentInput] = useState("10");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Number(percentInput) || 0;

  async function submit() {
    if (code.trim().length < 2) {
      setError("Code must be at least 2 characters.");
      return;
    }
    if (pct <= 0 || pct > 100) {
      setError("Discount must be between 1 and 100%.");
      return;
    }
    setSaving(true);
    await onCreate(targetId, code.trim().toUpperCase(), pct);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display font-semibold text-ink">Create Promo Code</p>
          <button onClick={onClose} className="text-ink-faint hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {error && <p className="text-xs text-vibe-coral">{error}</p>}

          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">Applies To</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
            >
              <option value={ALL}>All listings</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16))}
              placeholder="e.g. VIBE20"
              className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm font-bold tracking-widest outline-none focus:border-vibe-violet"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">Discount (%)</label>
            <input
              inputMode="numeric"
              value={percentInput}
              onChange={(e) => setPercentInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="10"
              className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="mt-5 w-full rounded-lg bg-vibe-violet py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create Promo Code"}
        </button>
      </div>
    </div>
  );
}
