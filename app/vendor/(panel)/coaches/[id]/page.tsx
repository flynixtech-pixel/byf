"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Plus,
  Trash2,
  UserRoundCog,
  X,
} from "lucide-react";
import { SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { TimeField } from "@/components/vendor/TimeField";
import { LocationPicker } from "@/components/coach/LocationPicker";
import { CoachPhotoUpload } from "@/components/coach/CoachPhotoUpload";
import { SportsMultiSelect } from "@/components/coach/SportsMultiSelect";
import { GalleryUpload } from "@/components/coach/GalleryUpload";
import {
  addCoachBatch,
  addCoachLeave,
  getVendorCoachById,
  removeCoachBatch,
  removeCoachLeave,
  setCoachAvailability,
  updateCoach,
  updateCoachBatch,
  type CoachBatchInput,
  type CoachLocationInput,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { Coach, CoachBatch, CoachWeeklyDay } from "@/lib/api/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TABS = [
  { id: "profile", label: "Profile", icon: UserRoundCog },
  { id: "location", label: "Location", icon: MapPin },
  { id: "availability", label: "Availability", icon: Clock },
  { id: "batches", label: "Slots", icon: Layers },
  { id: "leaves", label: "Leave Calendar", icon: CalendarOff },
] as const;
type TabId = (typeof TABS)[number]["id"];

function to12h(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr) % 24; // "24:00" (midnight close) → 12:00 AM
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ap}`;
}

/** Half-hourly time choices for slot dropdowns (turf-style). */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const value = `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
  return { value, label: to12h(value) };
});
/** "To" can't be 00:00 (day start) but can run to 24:00 (midnight). */
const END_TIME_OPTIONS = [...TIME_OPTIONS.slice(1), { value: "24:00", label: "12:00 AM" }];

function normalizeWeek(week: CoachWeeklyDay[] | undefined): CoachWeeklyDay[] {
  return Array.from({ length: 7 }, (_, day) => {
    const found = week?.find((d) => d.day === day);
    return found ?? { day, isOpen: day !== 0, startTime: "09:00", endTime: "18:00" };
  });
}

export default function VendorCoachDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("profile");
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getVendorCoachById(id)
      .then(setCoach)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load coach"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <p className="py-16 text-center text-sm text-ink-faint">Loading coach…</p>;
  if (!coach) return <p className="py-16 text-center text-sm text-ink-faint">Coach not found.</p>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/vendor/coaches")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to coaches
      </button>

      <div className="flex items-center gap-4 rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-panel">
        {coach.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.photoUrl} alt={coach.name} className="h-16 w-16 rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5c3a21]/10 text-[#5c3a21]">
            <UserRoundCog size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-xl font-semibold text-ink">{coach.name}</h1>
            <Badge tone={coach.status === "Active" ? "success" : "neutral"}>{coach.status}</Badge>
          </div>
          <p className="text-sm text-ink-faint">
            {coach.categories?.length ? coach.categories.join(", ") : coach.category}
            {coach.subCategory ? ` · ${coach.subCategory}` : ""}
            {coach.experienceYears ? ` · ${coach.experienceYears} yrs` : ""}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-surface-border bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id ? "bg-[#5c3a21] text-white" : "text-ink-soft hover:bg-cream-200"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab coach={coach} onSaved={(msg) => { setToast(msg); refresh(); }} onError={setToast} />}
      {tab === "location" && <LocationTab coach={coach} onSaved={(msg) => { setToast(msg); refresh(); }} onError={setToast} />}
      {tab === "availability" && <AvailabilityTab coach={coach} onSaved={(msg) => { setToast(msg); refresh(); }} onError={setToast} />}
      {tab === "batches" && <BatchesTab coach={coach} onChanged={(msg) => { setToast(msg); refresh(); }} onError={setToast} />}
      {tab === "leaves" && <LeavesTab coach={coach} onChanged={(msg) => { setToast(msg); refresh(); }} onError={setToast} />}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------- Profile tab ------------------------------- */
function ProfileTab({ coach, onSaved, onError }: { coach: Coach; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({
    name: coach.name,
    categories: coach.categories?.length ? coach.categories : coach.category ? [coach.category] : [],
    subCategory: coach.subCategory ?? "",
    phone: coach.phone ?? "",
    email: coach.email ?? "",
    experienceYears: coach.experienceYears ? String(coach.experienceYears) : "",
    fees: coach.fees ? String(coach.fees) : "",
    photoUrl: coach.photoUrl ?? "",
    bio: coach.bio ?? "",
    gallery: coach.gallery ?? [],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (form.categories.length === 0) return onError("Select at least one sport/category.");
    setSaving(true);
    try {
      await updateCoach(coach._id, {
        name: form.name,
        category: form.categories[0],
        categories: form.categories,
        subCategory: form.subCategory || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
        fees: form.fees ? Number(form.fees) : undefined,
        photoUrl: form.photoUrl || undefined,
        bio: form.bio || undefined,
        gallery: form.gallery,
      });
      onSaved("Profile updated");
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Profile" description="This info shows on the customer's coach profile.">
      <div className="mb-5 flex justify-center">
        <CoachPhotoUpload value={form.photoUrl} onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Field label="Mobile no." value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v.replace(/\D/g, "").slice(0, 10) }))} />
        <Field label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
        <Field label="Specialisation" value={form.subCategory} onChange={(v) => setForm((f) => ({ ...f, subCategory: v }))} />
        <Field label="Experience (years)" value={form.experienceYears} onChange={(v) => setForm((f) => ({ ...f, experienceYears: v.replace(/\D/g, "") }))} />
        <Field label="Starting fee ₹" value={form.fees} onChange={(v) => setForm((f) => ({ ...f, fees: v.replace(/\D/g, "") }))} />
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Sports / Category</label>
        <SportsMultiSelect value={form.categories} onChange={(v) => setForm((f) => ({ ...f, categories: v }))} />
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21]"
        />
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Gallery</label>
        <GalleryUpload value={form.gallery} onChange={(v) => setForm((f) => ({ ...f, gallery: v }))} />
      </div>

      <button onClick={save} disabled={saving} className="mt-5 rounded-lg bg-[#5c3a21] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7b4f2e] disabled:opacity-60">
        {saving ? "Saving…" : "Save Profile"}
      </button>
    </SectionCard>
  );
}

/* ------------------------------- Location tab ------------------------------- */
function LocationTab({ coach, onSaved, onError }: { coach: Coach; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [loc, setLoc] = useState<CoachLocationInput>({
    address: coach.location?.address ?? "",
    area: coach.location?.area ?? "",
    city: coach.location?.city ?? "",
    lat: coach.location?.lat,
    lng: coach.location?.lng,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (typeof loc.lat !== "number" || typeof loc.lng !== "number") {
      onError("Set a pin on the map first.");
      return;
    }
    setSaving(true);
    try {
      await updateCoach(coach._id, { location: loc });
      onSaved("Location saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Location" description="Choose your coaching location on the map — used for nearby matching and the map on the customer side.">
      <LocationPicker
        value={loc.lat != null && loc.lng != null ? { lat: loc.lat, lng: loc.lng } : null}
        onChange={({ lat, lng }) => setLoc((l) => ({ ...l, lat, lng }))}
        onResolveAddress={(info) =>
          setLoc((l) => ({
            ...l,
            address: info.address ?? l.address,
            city: info.city ?? l.city,
            area: info.area ?? l.area,
          }))
        }
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="City" value={loc.city ?? ""} onChange={(v) => setLoc((l) => ({ ...l, city: v }))} />
        <Field label="Area / Locality" value={loc.area ?? ""} onChange={(v) => setLoc((l) => ({ ...l, area: v }))} />
        <Field label="Full Address" value={loc.address ?? ""} onChange={(v) => setLoc((l) => ({ ...l, address: v }))} />
      </div>
      <button onClick={save} disabled={saving} className="mt-5 rounded-lg bg-[#5c3a21] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7b4f2e] disabled:opacity-60">
        {saving ? "Saving…" : "Save Location"}
      </button>
    </SectionCard>
  );
}

/* ----------------------------- Availability tab ----------------------------- */
function AvailabilityTab({ coach, onSaved, onError }: { coach: Coach; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [week, setWeek] = useState<CoachWeeklyDay[]>(normalizeWeek(coach.weeklyAvailability));
  const [saving, setSaving] = useState(false);

  function update(day: number, patch: Partial<CoachWeeklyDay>) {
    setWeek((w) => w.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  }

  async function save() {
    setSaving(true);
    try {
      await setCoachAvailability(coach._id, week);
      onSaved("Weekly availability saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Weekly Availability" description="Toggle each day on/off. An off day = weekly holiday (shown as off on the customer side too).">
      <div className="space-y-2">
        {week.map((d) => (
          <div key={d.day} className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border p-3">
            <label className="flex w-28 items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={d.isOpen} onChange={(e) => update(d.day, { isOpen: e.target.checked })} className="h-4 w-4 accent-[#5c3a21]" />
              {DAYS[d.day]}
            </label>
            {d.isOpen ? (
              <div className="flex items-center gap-2 text-sm">
                <input type="time" value={d.startTime} onChange={(e) => update(d.day, { startTime: e.target.value })} className="rounded-lg border border-surface-border px-3 py-2 outline-none focus:border-[#5c3a21]" />
                <span className="text-ink-faint">to</span>
                <input type="time" value={d.endTime} onChange={(e) => update(d.day, { endTime: e.target.value })} className="rounded-lg border border-surface-border px-3 py-2 outline-none focus:border-[#5c3a21]" />
              </div>
            ) : (
              <span className="text-sm text-ink-faint">Holiday / off</span>
            )}
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="mt-5 rounded-lg bg-[#5c3a21] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7b4f2e] disabled:opacity-60">
        {saving ? "Saving…" : "Save Availability"}
      </button>
    </SectionCard>
  );
}

/* -------------------------------- Batches tab -------------------------------- */
const emptyBatch: CoachBatchInput = {
  name: "",
  startTime: "09:00",
  endTime: "10:00",
  days: [],
  capacity: 20,
  priceMonthly: 0,
  priceYearly: 0,
  demoAvailable: false,
  active: true,
};

function BatchesTab({ coach, onChanged, onError }: { coach: Coach; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [draft, setDraft] = useState<CoachBatchInput>(emptyBatch);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(b: CoachBatch) {
    setEditingId(b.id);
    setDraft({
      name: b.name,
      startTime: b.startTime,
      endTime: b.endTime,
      days: [...b.days],
      capacity: b.capacity,
      priceMonthly: b.priceMonthly,
      priceYearly: b.priceYearly,
      demoAvailable: b.demoAvailable,
      active: b.active,
    });
  }

  function reset() {
    setEditingId(null);
    setDraft(emptyBatch);
  }

  async function save() {
    if (!draft.name.trim()) return onError("Enter a slot name.");
    if (draft.days.length === 0) return onError("Select at least one day.");
    setSaving(true);
    try {
      if (editingId) await updateCoachBatch(coach._id, editingId, draft);
      else await addCoachBatch(coach._id, draft);
      onChanged(editingId ? "Slot updated" : "Slot added");
      reset();
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to save slot");
    } finally {
      setSaving(false);
    }
  }

  async function remove(b: CoachBatch) {
    if (!window.confirm(`Remove slot "${b.name}"?`)) return;
    try {
      await removeCoachBatch(coach._id, b.id);
      onChanged("Slot removed");
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to remove slot");
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title={editingId ? "Edit Slot" : "Add Slot"} description="Slot = time window + student limit + monthly/yearly price + optional free demo. Add as many as you need.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slot name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="Morning Batch" />
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Limit (students per slot)</label>
            <input type="number" min={1} value={draft.capacity} onChange={(e) => setDraft((d) => ({ ...d, capacity: Number(e.target.value) || 1 }))} className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">From</label>
            <select value={draft.startTime} onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))} className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21]">
              {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">To</label>
            <select value={draft.endTime} onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))} className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21]">
              {END_TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Price / month ₹</label>
            <input type="number" min={0} value={draft.priceMonthly} onChange={(e) => setDraft((d) => ({ ...d, priceMonthly: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Price / year ₹</label>
            <input type="number" min={0} value={draft.priceYearly} onChange={(e) => setDraft((d) => ({ ...d, priceYearly: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21]" />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Runs on days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((label, day) => {
              const on = draft.days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, days: on ? d.days.filter((x) => x !== day) : [...d.days, day].sort() }))}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${on ? "bg-[#5c3a21] text-white" : "border border-surface-border text-ink-soft hover:bg-cream-200"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={!!draft.demoAvailable} onChange={(e) => setDraft((d) => ({ ...d, demoAvailable: e.target.checked }))} className="h-4 w-4 accent-[#5c3a21]" />
          Free demo session available for this slot
        </label>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#5c3a21] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7b4f2e] disabled:opacity-60">
            <Plus size={16} /> {saving ? "Saving…" : editingId ? "Save Slot" : "Add Slot"}
          </button>
          {editingId && (
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold text-ink-faint hover:bg-surface-hover">
              <X size={16} /> Cancel
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Slots" description="As students enrol, spots decrease (live on the customer side).">
        {coach.batches.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint">No slots yet — add your first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-[11px] uppercase tracking-wider text-ink-faint">
                  <th className="py-2 pr-3">Slot</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Days</th>
                  <th className="py-2 pr-3">Capacity</th>
                  <th className="py-2 pr-3">Monthly</th>
                  <th className="py-2 pr-3">Yearly</th>
                  <th className="py-2 pr-3">Demo</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {coach.batches.map((b) => (
                  <tr key={b.id} className="border-b border-surface-border/60">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{b.name}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{b.startTime}–{b.endTime}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{b.days.map((d) => DAYS[d]).join(", ")}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{b.capacity}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">₹{b.priceMonthly}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">₹{b.priceYearly}</td>
                    <td className="py-2.5 pr-3">{b.demoAvailable ? <Badge tone="success">Yes</Badge> : <Badge tone="neutral">No</Badge>}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(b)} className="rounded-md px-2 py-1 text-xs font-semibold text-[#5c3a21] hover:bg-[#5c3a21]/10">Edit</button>
                        <button onClick={() => remove(b)} className="flex h-7 w-7 items-center justify-center rounded-md text-vibe-coral hover:bg-vibe-coral/10"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* -------------------------------- Leaves tab -------------------------------- */
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function LeavesTab({ coach, onChanged, onError }: { coach: Coach; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leaveDates = useMemo(() => new Set(coach.leaves.map((l) => ymd(new Date(l.date)))), [coach.leaves]);
  const weeklyOff = useMemo(() => new Set(normalizeWeek(coach.weeklyAvailability).filter((d) => !d.isOpen).map((d) => d.day)), [coach.weeklyAvailability]);

  const grid = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d));
    return cells;
  }, [monthCursor]);

  async function addLeave(date: string) {
    setBusy(true);
    try {
      await addCoachLeave(coach._id, { date, reason: reason || undefined });
      onChanged("Leave added");
      setReason("");
      setSelected(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to add leave");
    } finally {
      setBusy(false);
    }
  }

  async function removeLeaveDate(date: string) {
    setBusy(true);
    try {
      await removeCoachLeave(coach._id, date);
      onChanged("Leave removed");
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to remove leave");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Leave Calendar" description="Mark an emergency holiday/leave on any future date — customers will see 'Holiday' that day.">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border hover:bg-cream-200"><ChevronLeft size={16} /></button>
          <p className="font-display font-semibold text-ink">{monthCursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
          <button onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border hover:bg-cream-200"><ChevronRight size={16} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-ink-faint">
          {DAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((date, i) => {
            if (!date) return <div key={i} />;
            const key = ymd(date);
            const isPast = date < today;
            const isLeave = leaveDates.has(key);
            const isWeeklyOff = weeklyOff.has(date.getDay());
            const isSelected = selected === key;
            return (
              <button
                key={i}
                disabled={isPast}
                onClick={() => (isLeave ? removeLeaveDate(key) : setSelected(isSelected ? null : key))}
                className={`aspect-square rounded-lg border text-sm font-medium transition ${
                  isPast
                    ? "cursor-not-allowed border-transparent text-ink-faint/40"
                    : isLeave
                    ? "border-vibe-coral bg-vibe-coral/10 text-vibe-coral"
                    : isSelected
                    ? "border-[#5c3a21] bg-[#5c3a21] text-white"
                    : isWeeklyOff
                    ? "border-surface-border bg-cream-200 text-ink-faint"
                    : "border-surface-border text-ink hover:border-[#5c3a21]"
                }`}
                title={isLeave ? "Click to remove leave" : isWeeklyOff ? "Weekly off" : "Click to mark leave"}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-vibe-coral bg-vibe-coral/10" /> Leave</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-surface-border bg-cream-200" /> Weekly off</span>
        </div>

        {selected && (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-cream-200/60 p-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Reason for {new Date(selected).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} (optional)
              </label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Personal / medical / travel" className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-[#5c3a21]" />
            </div>
            <button onClick={() => addLeave(selected)} disabled={busy} className="rounded-lg bg-[#5c3a21] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7b4f2e] disabled:opacity-60">
              Mark Leave
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Upcoming Leaves" description="Marked holidays.">
        {coach.leaves.filter((l) => new Date(l.date) >= today).length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-faint">No upcoming leaves.</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {coach.leaves
              .filter((l) => new Date(l.date) >= today)
              .sort((a, b) => +new Date(a.date) - +new Date(b.date))
              .map((l) => (
                <div key={l.date} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-ink">{new Date(l.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                    {l.reason && <p className="text-xs text-ink-faint">{l.reason}</p>}
                  </div>
                  <button onClick={() => removeLeaveDate(ymd(new Date(l.date)))} className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"><Trash2 size={14} /></button>
                </div>
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* --------------------------------- shared --------------------------------- */
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21] placeholder:text-ink-faint"
      />
    </div>
  );
}
