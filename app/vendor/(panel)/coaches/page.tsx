"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Layers, MapPin, Pencil, Plus, Trash2, UserRoundCog, X } from "lucide-react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { CoachPhotoUpload } from "@/components/coach/CoachPhotoUpload";
import { SportsMultiSelect } from "@/components/coach/SportsMultiSelect";
import { GalleryUpload } from "@/components/coach/GalleryUpload";
import { LocationPicker } from "@/components/coach/LocationPicker";
import {
  createCoach,
  deleteCoach,
  listVendorCoaches,
  updateCoach,
  type CoachLocationInput,
  type CreateCoachInput,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { Coach } from "@/lib/api/types";

interface CoachDraft {
  name: string;
  categories: string[];
  subCategory: string;
  phone: string;
  email: string;
  experienceYears: string;
  fees: string;
  bio: string;
  photoUrl: string;
  gallery: string[];
  location: CoachLocationInput;
}

const emptyDraft: CoachDraft = {
  name: "",
  categories: [],
  subCategory: "",
  phone: "",
  email: "",
  experienceYears: "",
  fees: "",
  bio: "",
  photoUrl: "",
  gallery: [],
  location: { address: "", area: "", city: "", lat: undefined, lng: undefined },
};

export default function VendorCoachesPage() {
  const router = useRouter();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<CoachDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // The full form is hidden until the vendor clicks "Create Coach Profile" (or edits one).
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(() => {
    listVendorCoaches()
      .then((result) => setCoaches(result.items))
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load coaches"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function set<K extends keyof CoachDraft>(key: K, value: CoachDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEdit(coach: Coach) {
    setEditingId(coach._id);
    setShowForm(true);
    setDraft({
      name: coach.name,
      categories: coach.categories?.length ? coach.categories : coach.category ? [coach.category] : [],
      subCategory: coach.subCategory ?? "",
      phone: coach.phone ?? "",
      email: coach.email ?? "",
      experienceYears: coach.experienceYears ? String(coach.experienceYears) : "",
      fees: coach.fees ? String(coach.fees) : "",
      bio: coach.bio ?? "",
      photoUrl: coach.photoUrl ?? "",
      gallery: coach.gallery ?? [],
      location: {
        address: coach.location?.address ?? "",
        area: coach.location?.area ?? "",
        city: coach.location?.city ?? "",
        lat: coach.location?.lat,
        lng: coach.location?.lng,
      },
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(false);
  }

  function buildPayload(): CreateCoachInput {
    const hasPin = typeof draft.location.lat === "number" && typeof draft.location.lng === "number";
    return {
      name: draft.name.trim(),
      category: draft.categories[0]!,
      categories: draft.categories,
      subCategory: draft.subCategory.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      email: draft.email.trim() || undefined,
      experienceYears: draft.experienceYears ? Number(draft.experienceYears) : undefined,
      fees: draft.fees ? Number(draft.fees) : undefined,
      bio: draft.bio.trim() || undefined,
      photoUrl: draft.photoUrl || undefined,
      gallery: draft.gallery,
      location: hasPin ? draft.location : undefined,
    };
  }

  async function handleSubmit() {
    if (draft.name.trim().length < 2) return setToast("Enter the coach's name (min 2 letters).");
    if (draft.categories.length === 0) return setToast("Select at least one sport/category.");

    setSaving(true);
    try {
      if (editingId) {
        // Edit updates the profile only — slots stay managed via the coach detail
        // page so existing student enrolments keep their batch linkage.
        await updateCoach(editingId, buildPayload());
        setToast(`"${draft.name}" updated`);
      } else {
        const created = await createCoach(buildPayload());
        setToast(`"${draft.name}" added — now open the coach to add slots, availability & leaves.`);
        handleCancelEdit();
        refresh();
        router.push(`/vendor/coaches/${created._id}`);
        return;
      }
      handleCancelEdit();
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save coach");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(coach: Coach) {
    try {
      await updateCoach(coach._id, { status: coach.status === "Active" ? "Inactive" : "Active" });
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update coach");
    }
  }

  async function handleDelete(coach: Coach) {
    if (!window.confirm(`Remove ${coach.name} from your coaches?`)) return;
    try {
      await deleteCoach(coach._id);
      setToast(`Removed ${coach.name}`);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to remove coach");
    }
  }

  const hasPin = typeof draft.location.lat === "number" && typeof draft.location.lng === "number";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Coach Marketplace"
        title="Coaches"
        description="Build the full coach profile in one form — photo, contact, sports, location, slots, gallery. Players book them live from the Sports tab."
        right={
          showForm ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
              <UserRoundCog size={16} /> {coaches.length} Coach(es)
            </span>
          ) : (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#5c3a21] shadow-sm hover:bg-cream-200"
            >
              <Plus size={16} /> Create Coach Profile
            </button>
          )
        }
      />

      {showForm ? (
      <SectionCard
        title={editingId ? "Edit Coach" : "Create Coach Profile"}
        description={
          editingId
            ? "Update the profile. Slots are managed inside the coach (Slots tab)."
            : "Fill the whole profile — photo, contact, sports, location, bio & gallery. Slots are added after saving."
        }
      >
        <div className="mb-5 flex justify-center">
          <CoachPhotoUpload value={draft.photoUrl} onChange={(url) => set("photoUrl", url)} />
        </div>

        {/* Basics */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name of coach" placeholder="Rohan Sharma" value={draft.name} onChange={(v) => set("name", v)} />
          <Input
            label="Mobile no."
            placeholder="9876543210"
            value={draft.phone}
            onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 10))}
          />
          <Input label="Email (optional)" placeholder="coach@email.com" value={draft.email} onChange={(v) => set("email", v)} />
          <Input
            label="Experience (years)"
            placeholder="5"
            value={draft.experienceYears}
            onChange={(v) => set("experienceYears", v.replace(/\D/g, ""))}
          />
          <Input label="Specialisation (optional)" placeholder="Doubles coaching" value={draft.subCategory} onChange={(v) => set("subCategory", v)} />
          <Input label="Starting fee ₹ (optional)" placeholder="800" value={draft.fees} onChange={(v) => set("fees", v.replace(/\D/g, ""))} />
        </div>

        {/* Sports */}
        <FormBlock label="Sports / Category" hint="Select one or more. Add a sport that isn't listed under 'Others'. The first one is the primary sport.">
          <SportsMultiSelect value={draft.categories} onChange={(v) => set("categories", v)} />
        </FormBlock>

        {/* Location */}
        <FormBlock label="Location" hint="Search or drop a pin on the map to set the exact coaching location.">
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
            <Input label="Full Address" placeholder="Court address" value={draft.location.address ?? ""} onChange={(v) => set("location", { ...draft.location, address: v })} />
          </div>
        </FormBlock>

        {/* Slots are added after the coach exists — see the Slots tab on the coach page. */}
        <FormBlock label="Slots" hint="">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-surface-border bg-cream-200/40 px-4 py-3 text-sm text-ink-faint">
            <Layers size={16} className="shrink-0 text-[#5c3a21]" />
            {editingId ? (
              <span>
                Manage slots from{" "}
                <Link href={`/vendor/coaches/${editingId}`} className="font-semibold text-[#5c3a21] underline">
                  the coach&apos;s Slots tab
                </Link>{" "}
                — set each slot&apos;s time, limit and monthly/yearly price there.
              </span>
            ) : (
              <span>Save the coach first — then add slots from its Slots tab (time, limit &amp; monthly/yearly price per slot).</span>
            )}
          </div>
        </FormBlock>

        {/* Bio */}
        <FormBlock label="Bio (optional)" hint="Short intro players will see.">
          <textarea
            value={draft.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={3}
            placeholder="Short intro players will see"
            className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21] placeholder:text-ink-faint"
          />
        </FormBlock>

        {/* Gallery */}
        <FormBlock label="Gallery" hint="Coaching / academy photos — shown to players on the coach profile.">
          <GalleryUpload value={draft.gallery} onChange={(v) => set("gallery", v)} />
        </FormBlock>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#5c3a21] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7b4f2e] disabled:opacity-60"
          >
            <Plus size={16} /> {saving ? "Saving..." : editingId ? "Save Changes" : "Add Coach"}
          </button>
          <button
            onClick={handleCancelEdit}
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5c3a21] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7b4f2e]"
        >
          <Plus size={18} /> Create Coach Profile
        </button>

        <SectionCard title="Your Coaches" description="Click a coach to manage — availability, slots, location, leaves.">
        <div className="divide-y divide-surface-border">
          {coaches.map((coach) => (
            <div key={coach._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <Link href={`/vendor/coaches/${coach._id}`} className="flex min-w-0 flex-1 items-center gap-3 group">
                {coach.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coach.photoUrl} alt={coach.name} className="h-12 w-12 shrink-0 rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5c3a21]/10 text-[#5c3a21]">
                    <UserRoundCog size={18} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink group-hover:text-[#5c3a21]">{coach.name}</p>
                  <p className="flex flex-wrap items-center gap-x-1 text-xs text-ink-faint">
                    <span>{coach.categories?.length ? coach.categories.join(", ") : coach.category}</span>
                    {` · ${coach.batches.length} slot(s)`}
                    {coach.location?.city ? (
                      <span className="inline-flex items-center gap-0.5">
                        {" · "}
                        <MapPin size={11} /> {coach.location.city}
                      </span>
                    ) : null}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleStatus(coach)}>
                  <Badge tone={coach.status === "Active" ? "success" : "neutral"}>{coach.status}</Badge>
                </button>
                <button
                  onClick={() => handleEdit(coach)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5c3a21] hover:bg-[#5c3a21]/10"
                  title="Edit profile"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(coach)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
                <Link
                  href={`/vendor/coaches/${coach._id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-cream-300"
                  title="Manage"
                >
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
          {loading && <p className="py-8 text-center text-sm text-ink-faint">Loading coaches...</p>}
          {!loading && coaches.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-faint">No coaches yet — tap “Create Coach Profile” to add one.</p>
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
      <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21] placeholder:text-ink-faint"
      />
    </div>
  );
}
