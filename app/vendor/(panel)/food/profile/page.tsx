"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin, Pencil, Plus, Store, Trash2, X } from "lucide-react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { CuisineMultiSelect } from "@/components/food/CuisineMultiSelect";
import { OutletImageUpload } from "@/components/food/OutletImageUpload";
import { OutletGalleryUpload } from "@/components/food/OutletGalleryUpload";
import { LocationPicker } from "@/components/coach/LocationPicker";
import {
  createVendorOutlet,
  deleteVendorOutlet,
  listVendorOutlets,
  updateVendorOutlet,
  type CreateOutletInput,
  type OutletLocationInput,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { FoodOutlet } from "@/lib/api/types";

interface OutletDraft {
  name: string;
  kind: "dining" | "venue";
  offer: string;
  description: string;
  cuisines: string[];
  logo: string;
  banner: string;
  poster: string;
  gallery: string[];
  location: OutletLocationInput;
}

const emptyDraft: OutletDraft = {
  name: "",
  kind: "dining",
  offer: "",
  description: "",
  cuisines: [],
  logo: "",
  banner: "",
  poster: "",
  gallery: [],
  location: { address: "", area: "", city: "", lat: undefined, lng: undefined },
};

export default function VendorFoodProfilePage() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<FoodOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<OutletDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listVendorOutlets()
      .then(setOutlets)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load restaurants"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function set<K extends keyof OutletDraft>(key: K, value: OutletDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEdit(outlet: FoodOutlet) {
    setEditingId(outlet._id);
    setShowForm(true);
    setDraft({
      name: outlet.name,
      kind: outlet.kind ?? "dining",
      offer: outlet.offer ?? "",
      description: outlet.description ?? "",
      cuisines: outlet.cuisines ?? [],
      logo: outlet.logo ?? "",
      banner: outlet.banner ?? "",
      poster: outlet.poster ?? "",
      gallery: outlet.gallery ?? [],
      location: {
        address: outlet.location?.address ?? "",
        area: outlet.location?.area ?? "",
        city: outlet.location?.city ?? "",
        lat: outlet.location?.lat,
        lng: outlet.location?.lng,
      },
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(false);
  }

  function buildPayload(): CreateOutletInput {
    const hasPin = typeof draft.location.lat === "number" && typeof draft.location.lng === "number";
    return {
      name: draft.name.trim(),
      kind: draft.kind,
      offer: draft.kind === "dining" ? draft.offer.trim() || undefined : undefined,
      description: draft.description.trim() || undefined,
      cuisines: draft.cuisines,
      logo: draft.logo || undefined,
      banner: draft.banner || undefined,
      poster: draft.poster || undefined,
      gallery: draft.gallery,
      location: hasPin || draft.location.city ? draft.location : undefined,
    };
  }

  async function handleSubmit() {
    if (draft.name.trim().length < 2) return setToast("Enter the restaurant's name (min 2 letters).");
    setSaving(true);
    try {
      if (editingId) {
        await updateVendorOutlet(editingId, buildPayload());
        setToast(`"${draft.name}" updated`);
        handleCancel();
        refresh();
      } else {
        const created = await createVendorOutlet(buildPayload());
        setToast(`"${draft.name}" added — now set its opening hours & menu.`);
        handleCancel();
        refresh();
        router.push(`/vendor/food/profile/${created._id}`);
      }
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save restaurant");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(outlet: FoodOutlet) {
    try {
      await updateVendorOutlet(outlet._id, { status: outlet.status === "Active" ? "Inactive" : "Active" });
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update restaurant");
    }
  }

  async function handleDelete(outlet: FoodOutlet) {
    if (!window.confirm(`Remove ${outlet.name}? Its menu must be empty first.`)) return;
    try {
      await deleteVendorOutlet(outlet._id);
      setToast(`Removed ${outlet.name}`);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to remove restaurant");
    }
  }

  const hasPin = typeof draft.location.lat === "number" && typeof draft.location.lng === "number";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Food Owner"
        title="Restaurant Profiles"
        description="Create a profile for each restaurant/outlet you run — customers browse these on the Food page."
        right={
          showForm ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
              <Store size={16} /> {outlets.length} Restaurant(s)
            </span>
          ) : (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-vibe-violet shadow-sm hover:bg-cream-200"
            >
              <Plus size={16} /> Create Restaurant Profile
            </button>
          )
        }
      />

      {showForm ? (
        <SectionCard
          title={editingId ? "Edit Restaurant" : "Create Restaurant Profile"}
          description={
            editingId
              ? "Update the profile. Opening hours & holidays are managed inside the restaurant."
              : "Fill the profile — name, cuisines, images & location. Hours, holidays and menu come after saving."
          }
        >
          {/* Type: standalone dining vs food served at a sports venue */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">This place is…</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "dining", label: "Dining spot", hint: "A cafe/restaurant near a venue" },
                { value: "venue", label: "Food at a venue", hint: "Served at a turf / pickleball court" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("kind", opt.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    draft.kind === opt.value ? "border-vibe-violet bg-vibe-violet/5 ring-1 ring-vibe-violet" : "border-surface-border hover:bg-cream-200"
                  }`}
                >
                  <p className="text-sm font-bold text-ink">{opt.label}</p>
                  <p className="text-[11px] text-ink-faint">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Restaurant name" placeholder="Spice Villa" value={draft.name} onChange={(v) => set("name", v)} />
            <div className="sm:col-span-1">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Short description (optional)
              </label>
              <input
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Authentic North Indian & Chinese"
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
              />
            </div>
          </div>

          {draft.kind === "dining" && (
            <div className="mt-4">
              <Input
                label="Discount / offer for BYV players (optional)"
                placeholder="e.g. 10% off for BYV players"
                value={draft.offer}
                onChange={(v) => set("offer", v)}
              />
            </div>
          )}

          <FormBlock label="Cuisines" hint="Select what this restaurant serves — shown as tags on its card.">
            <CuisineMultiSelect value={draft.cuisines} onChange={(v) => set("cuisines", v)} />
          </FormBlock>

          <FormBlock label="Images" hint="Poster shows at the top of the restaurant page; banner on the listing card.">
            <div className="grid gap-4 sm:grid-cols-3">
              <OutletImageUpload label="Logo" hint="Square — shown beside the name" value={draft.logo} onChange={(v) => set("logo", v)} aspect="aspect-square" />
              <OutletImageUpload label="Banner" hint="Landscape — listing card" value={draft.banner} onChange={(v) => set("banner", v)} />
              <OutletImageUpload label="Poster" hint="Top of your restaurant page" value={draft.poster} onChange={(v) => set("poster", v)} />
            </div>
          </FormBlock>

          <FormBlock label="Gallery" hint="Food & ambience photos shown on your restaurant page.">
            <OutletGalleryUpload value={draft.gallery} onChange={(v) => set("gallery", v)} />
          </FormBlock>

          <FormBlock label="Location" hint="Search or drop a pin to set the exact restaurant location.">
            <LocationPicker
              value={hasPin ? { lat: draft.location.lat!, lng: draft.location.lng! } : null}
              onChange={({ lat, lng }) => set("location", { ...draft.location, lat, lng })}
              onResolveAddress={(info) =>
                set("location", {
                  ...draft.location,
                  address: info.address ?? draft.location.address,
                  city: info.city ?? draft.location.city,
                  area: info.area ?? draft.location.area,
                })
              }
            />
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Input label="City" placeholder="Udaipur" value={draft.location.city ?? ""} onChange={(v) => set("location", { ...draft.location, city: v })} />
              <Input label="Area / Locality" placeholder="Fatehpura" value={draft.location.area ?? ""} onChange={(v) => set("location", { ...draft.location, area: v })} />
              <Input label="Full Address" placeholder="Shop address" value={draft.location.address ?? ""} onChange={(v) => set("location", { ...draft.location, address: v })} />
            </div>
          </FormBlock>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
            >
              <Plus size={16} /> {saving ? "Saving..." : editingId ? "Save Changes" : "Create Restaurant"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold text-ink-faint hover:bg-surface-hover disabled:opacity-60"
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </SectionCard>
      ) : (
        <>
          <button
            onClick={openCreate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-vibe-violet px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-vibe-violetSoft"
          >
            <Plus size={18} /> Create Restaurant Profile
          </button>

          <SectionCard title="Your Restaurants" description="Click a restaurant to manage — hours, holidays & details.">
            <div className="divide-y divide-surface-border">
              {outlets.map((outlet) => (
                <div key={outlet._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <Link href={`/vendor/food/profile/${outlet._id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                    {outlet.logo || outlet.banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={outlet.logo || outlet.banner} alt={outlet.name} className="h-12 w-12 shrink-0 rounded-xl object-cover"
            loading="lazy"
            decoding="async"
          />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-vibe-violet/10 text-vibe-violet">
                        <Store size={18} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink group-hover:text-vibe-violet">{outlet.name}</p>
                      <p className="flex flex-wrap items-center gap-x-1 text-xs text-ink-faint">
                        <span>{outlet.cuisines.slice(0, 3).join(", ") || "No cuisines set"}</span>
                        {outlet.location?.city ? (
                          <span className="inline-flex items-center gap-0.5">
                            {" · "}
                            <MapPin size={11} /> {outlet.location.city}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleStatus(outlet)}>
                      <Badge tone={outlet.status === "Active" ? "success" : "neutral"}>{outlet.status}</Badge>
                    </button>
                    <button
                      onClick={() => handleEdit(outlet)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-violet hover:bg-vibe-violet/10"
                      title="Edit profile"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(outlet)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                    <Link
                      href={`/vendor/food/profile/${outlet._id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-cream-300"
                      title="Manage"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
              {loading && <p className="py-8 text-center text-sm text-ink-faint">Loading restaurants...</p>}
              {!loading && outlets.length === 0 && (
                <p className="py-8 text-center text-sm text-ink-faint">No restaurants yet — tap “Create Restaurant Profile” to add one.</p>
              )}
            </div>
          </SectionCard>
        </>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function FormBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-surface-border pt-5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</label>
      {hint && <p className="mb-3 mt-0.5 text-xs text-ink-faint">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
      />
    </div>
  );
}
