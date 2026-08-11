"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, FileText, IndianRupee, MapPin, Layers, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { PackageStudio } from "@/components/vendor/PackageStudio";
import { Listing, ListingImage } from "@/lib/types";
import { getAdminListingById, createAdminListing, updateAdminListing, getAdminBookings } from "@/lib/api/admin";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { getVenueById, VendorPublicProfile, getListingImage } from "@/lib/api/venues";
import type { Booking as ApiBooking } from "@/lib/api/types";
import { categoryLabel, subCategoryLabel } from "@/lib/taxonomy";

const SUB_PAGES = [
  { id: "overview", label: "Package Overview", comingSoon: false },
  { id: "registrations", label: "Registrations", comingSoon: true },
  { id: "custom-booking-form", label: "Custom Booking Form", comingSoon: true },
  { id: "promotional-video", label: "Promotional Video", comingSoon: true },
  { id: "marketing", label: "Marketing", comingSoon: true },
  { id: "ticket-distribution", label: "Ticket Distribution", comingSoon: true },
  { id: "event-toolkit", label: "Event Toolkit", comingSoon: true },
  { id: "event-settings", label: "Event Settings", comingSoon: true },
] as const;

type SubPageId = (typeof SUB_PAGES)[number]["id"];

export default function AdminListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [subPage, setSubPage] = useState<SubPageId>("overview");
  const [activeImage, setActiveImage] = useState(0);
  const [studioOpen, setStudioOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getAdminListingById(params.id)
      .then((l) => setListing(apiListingToMock(l)))
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load listing"))
      .finally(() => setLoading(false));
    getAdminBookings({ limit: 100 })
      .then((res) => setBookings(res.items))
      .catch(() => {});
  }, [params.id]);

  const bookingsForListing = useMemo(
    () => (listing ? bookings.filter((b) => b.listingId === listing.id) : []),
    [listing, bookings]
  );

  const businessSnapshot = useMemo(() => {
    const grossRevenue = bookingsForListing.reduce((sum, b) => sum + b.totalAmount, 0);
    const platformProfit = bookingsForListing.reduce((sum, b) => sum + b.platformFee + b.taxes, 0);
    const vendorPayout = bookingsForListing.reduce((sum, b) => sum + b.vendorEarning, 0);
    return { bookings: bookingsForListing.length, grossRevenue, platformProfit, vendorPayout };
  }, [bookingsForListing]);

  if (loading) {
    return (
      <div className="rounded-xl2 border border-dashed border-surface-border bg-white py-16 text-center">
        <p className="text-sm text-ink-faint">Loading listing...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="rounded-xl2 border border-dashed border-surface-border bg-white py-16 text-center">
        <p className="text-sm text-ink-faint">Listing not found.</p>
        <Link href="/admin/listings" className="mt-3 inline-block text-sm font-semibold text-vibe-violet">
          Back to Listings
        </Link>
      </div>
    );
  }

  async function handleClone() {
    try {
      const input = mockListingToApiInput({ ...listing!, title: `${listing!.title} (Copy)`, status: "Inactive" });
      const clone = await createAdminListing(input);
      setToast(`Cloned as "${clone.title}"`);
      router.push(`/admin/listings/${clone._id}`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to clone listing");
    }
  }

  async function handleStudioSave(updated: Listing) {
    try {
      const saved = await updateAdminListing(updated.id, mockListingToApiInput(updated));
      setListing(apiListingToMock(saved));
      setStudioOpen(false);
      setToast("Package updated");
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update listing");
    }
  }

  const allImages = [
    listing.posterImage,
    listing.bannerImage,
    ...(listing.universalImages || []),
    ...listing.images
  ].filter(Boolean) as ListingImage[];

  const cover = getListingImage(listing, "poster");
  const active = allImages[activeImage] ?? allImages[0];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-72">
        <div className="overflow-hidden rounded-xl2 border border-surface-border bg-white shadow-panel">
          <div className="relative h-28">
            {cover && <img src={cover} alt={listing.title} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute left-2 top-2">
              <Badge tone={listing.status === "Active" ? "success" : "neutral"}>{listing.status}</Badge>
            </div>
            <div className="absolute bottom-2 left-3 right-3">
              <p className="truncate text-sm font-semibold leading-tight text-white">{listing.title}</p>
              <p className="text-[11px] text-white/70">
                {listing.city}, {listing.state}
              </p>
            </div>
          </div>
          <div className="p-3">
            <p className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Pages</p>
            <nav className="space-y-1">
              {SUB_PAGES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSubPage(p.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                    subPage === p.id ? "bg-vibe-violet/10 text-vibe-violet" : "text-ink-soft hover:bg-cream-300"
                  }`}
                >
                  <span className="flex flex-col">
                    <span>{p.label}</span>
                    <span className="text-[11px] font-normal text-ink-faint">
                      {subPage === p.id ? "Current page" : p.comingSoon ? "API connect hone ke baad activate hoga" : "Open section"}
                    </span>
                  </span>
                  {p.comingSoon && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-vibe-amber">
                      Soon
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/listings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-vibe-violet">
            <ArrowLeft size={15} /> {listing.title}
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handleClone}
              className="inline-flex items-center gap-1.5 rounded-lg border border-vibe-violet px-3.5 py-2 text-sm font-semibold text-vibe-violet hover:bg-vibe-violet/5"
            >
              <Copy size={14} /> Clone Package
            </button>
            <button
              onClick={() => setStudioOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-3.5 py-2 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
            >
              <FileText size={14} /> Edit Package
            </button>
          </div>
        </div>

        {subPage !== "overview" ? (
          <ComingSoonPanel label={SUB_PAGES.find((p) => p.id === subPage)?.label ?? ""} />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl2 border border-surface-border bg-white shadow-panel">
              <div className="relative h-64 sm:h-80">
                {active && <img src={active.url} alt={listing.title} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2">
                  <Badge tone={listing.status === "Active" ? "success" : "neutral"}>{listing.status}</Badge>
                  {listing.trending && <Badge tone="pending">Trending</Badge>}
                  <Badge tone="info">{listing.categories.map(categoryLabel).join(", ") || listing.type}</Badge>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h1 className="text-xl font-bold text-white sm:text-2xl">{listing.title}</h1>
                  <p className="flex items-center gap-1 text-sm text-white/80">
                    <MapPin size={13} /> {listing.city}, {listing.state}
                  </p>
                </div>
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {allImages.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(i)}
                      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                        i === activeImage ? "border-vibe-violet" : "border-transparent"
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                      <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[9px] font-semibold text-white">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {listing.priceTiers.slice(0, 2).map((tier) => (
                <StatTile key={tier.id} icon={<IndianRupee size={14} />} label={tier.label} value={`₹${tier.amount.toLocaleString("en-IN")}`} />
              ))}
              <StatTile icon={<MapPin size={14} />} label="Location" value={`${listing.city}, ${listing.state}`} />
              <StatTile icon={<Layers size={14} />} label="Slots" value={String(listing.slotsPerDay)} />
            </div>

            <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
              <p className="text-sm font-bold text-ink">Business Snapshot</p>
              <p className="mb-4 text-xs text-ink-faint">Admin ke liye listing revenue, profit aur latest booking visibility.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SnapshotTile label="Bookings" value={businessSnapshot.bookings.toLocaleString("en-IN")} tone="violet" />
                <SnapshotTile label="Gross Revenue" value={`₹${businessSnapshot.grossRevenue.toLocaleString("en-IN")}`} tone="green" />
                <SnapshotTile label="Platform Profit" value={`₹${businessSnapshot.platformProfit.toLocaleString("en-IN")}`} tone="amber" />
                <SnapshotTile label="Vendor Payout" value={`₹${businessSnapshot.vendorPayout.toLocaleString("en-IN")}`} tone="purple" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Basic Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoField label="Owner Type">{listing.ownerName ?? "Book Your Vibe (Admin)"}</InfoField>
                  <InfoField label="Shared With Vendors">{listing.sharedWithVendors ? "Yes" : "No"}</InfoField>
                  <InfoField label="Admin Name">{listing.ownerName ?? "Book Your Vibe"}</InfoField>
                  <InfoField label="Category">{listing.categories.map(categoryLabel).join(", ") || "—"}</InfoField>
                  <InfoField label="Sub-Category">{listing.subCategories.map(subCategoryLabel).join(", ") || "—"}</InfoField>
                  <InfoField label="Destination">{listing.address}</InfoField>
                </div>
              </div>

              <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Highlights</p>
                <ul className="space-y-2">
                  {listing.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-vibe-limeDark">
                      <CheckCircle2 size={14} /> {h}
                    </li>
                  ))}
                  {listing.highlights.length === 0 && <p className="text-xs text-ink-faint">Nothing added yet.</p>}
                </ul>
              </div>
            </div>

            <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Description</p>
              <p className="text-sm leading-relaxed text-ink-soft">{listing.description}</p>
            </div>
          </>
        )}
      </div>

      {studioOpen && (
        <PackageStudio mode="edit" initialListing={listing} audience="admin" onClose={() => setStudioOpen(false)} onSave={handleStudioSave} />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
        {icon} {label}
      </p>
      <p className="mt-1.5 truncate font-display text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

const SNAPSHOT_TONES: Record<string, string> = {
  violet: "bg-vibe-violet/10 text-vibe-violet",
  green: "bg-lime-100 text-vibe-limeDark",
  amber: "bg-amber-100 text-vibe-amber",
  purple: "bg-fuchsia-100 text-fuchsia-700",
};

function SnapshotTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-xl p-4 ${SNAPSHOT_TONES[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] text-ink-faint">{label}</p>
      <p className="font-medium text-ink">{children}</p>
    </div>
  );
}

function ComingSoonPanel({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl2 border border-dashed border-surface-border bg-white py-20 text-center shadow-panel">
      <p className="font-display font-semibold text-ink">{label}</p>
      <p className="max-w-sm text-xs text-ink-faint">
        This section isn&apos;t wired up yet — it&apos;ll activate once the backend API for it is connected.
      </p>
    </div>
  );
}
