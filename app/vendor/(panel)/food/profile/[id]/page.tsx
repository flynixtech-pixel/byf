"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarOff, ChevronLeft, ChevronRight, Clock, Store, Trash2, UtensilsCrossed, X } from "lucide-react";
import { SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { DineoutSettingsEditor } from "@/components/dineout/DineoutSettingsEditor";
import { TimeField } from "@/components/vendor/TimeField";
import {
  addOutletLeave,
  getVendorOutletById,
  removeOutletLeave,
  setOutletAvailability,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { FoodOutlet, OutletWeeklyDay } from "@/lib/api/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeWeek(week: OutletWeeklyDay[] | undefined): OutletWeeklyDay[] {
  return Array.from({ length: 7 }, (_, day) => {
    const found = week?.find((d) => d.day === day);
    return found ?? { day, isOpen: true, startTime: "09:00", endTime: "22:00" };
  });
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function VendorOutletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [outlet, setOutlet] = useState<FoodOutlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getVendorOutletById(id)
      .then(setOutlet)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load restaurant"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <p className="py-16 text-center text-sm text-ink-faint">Loading restaurant…</p>;
  if (!outlet) return <p className="py-16 text-center text-sm text-ink-faint">Restaurant not found.</p>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/vendor/food/profile")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to restaurants
      </button>

      <div className="flex items-center gap-4 rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-panel">
        {outlet.logo || outlet.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={outlet.logo || outlet.banner} alt={outlet.name} className="h-16 w-16 rounded-xl object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-vibe-violet/10 text-vibe-violet">
            <Store size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-xl font-semibold text-ink">{outlet.name}</h1>
            <Badge tone={outlet.status === "Active" ? "success" : "neutral"}>{outlet.status}</Badge>
          </div>
          <p className="text-sm text-ink-faint">
            {outlet.cuisines.slice(0, 4).join(", ") || "No cuisines set"}
            {outlet.location?.city ? ` · ${outlet.location.city}` : ""}
          </p>
        </div>
        <Link
          href={`/vendor/food/menu?outlet=${outlet._id}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-vibe-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
        >
          <UtensilsCrossed size={15} /> Menu
        </Link>
      </div>

      {/* Dineout controls only apply to partner restaurants, not venue food counters. */}
      {outlet.kind === "dining" && (
        <DineoutSettingsEditor outlet={outlet} onSaved={setOutlet} onToast={setToast} />
      )}

      <HoursCard outlet={outlet} onSaved={(m) => { setToast(m); refresh(); }} onError={setToast} />
      <HolidaysCard outlet={outlet} onChanged={(m) => { setToast(m); refresh(); }} onError={setToast} />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------ Opening hours ------------------------------ */
function HoursCard({ outlet, onSaved, onError }: { outlet: FoodOutlet; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [week, setWeek] = useState<OutletWeeklyDay[]>(normalizeWeek(outlet.weeklyAvailability));
  const [saving, setSaving] = useState(false);

  function update(day: number, patch: Partial<OutletWeeklyDay>) {
    setWeek((w) => w.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  }

  async function save() {
    setSaving(true);
    try {
      await setOutletAvailability(outlet._id, week);
      onSaved("Opening hours saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to save hours");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Opening Hours"
      description="Toggle each day open/closed and set timings — customers see open/closed status live."
    >
      <div className="space-y-2">
        {week.map((d) => (
          <div key={d.day} className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border p-3">
            <label className="flex w-28 items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={d.isOpen}
                onChange={(e) => update(d.day, { isOpen: e.target.checked })}
                className="h-4 w-4 accent-vibe-violet"
              />
              {DAYS[d.day]}
            </label>
            {d.isOpen ? (
              <div className="flex items-center gap-2 text-sm">
                <TimeField
                  value={d.startTime || "09:00"}
                  onChange={(next) => update(d.day, { startTime: next })}
                />
                <span className="text-ink-faint">to</span>
                <TimeField
                  value={d.endTime || "17:00"}
                  onChange={(next) => update(d.day, { endTime: next })}
                />
              </div>
            ) : (
              <span className="text-sm text-ink-faint">Closed</span>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
      >
        <Clock size={15} /> {saving ? "Saving…" : "Save Hours"}
      </button>
    </SectionCard>
  );
}

/* ------------------------------ Holiday calendar ------------------------------ */
function HolidaysCard({ outlet, onChanged, onError }: { outlet: FoodOutlet; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leaveByDate = useMemo(
    () => new Map((outlet.leaves ?? []).map((l) => [ymd(new Date(l.date)), l.type])),
    [outlet.leaves]
  );
  const weeklyClosed = useMemo(
    () => new Set(normalizeWeek(outlet.weeklyAvailability).filter((d) => !d.isOpen).map((d) => d.day)),
    [outlet.weeklyAvailability]
  );

  const grid = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const pad = first.getDay();
    const days = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let dd = 1; dd <= days; dd++) cells.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), dd));
    return cells;
  }, [monthCursor]);

  async function mark(date: string, type: "full" | "half") {
    setBusy(true);
    try {
      await addOutletLeave(outlet._id, { date, type, reason: reason || undefined });
      onChanged(type === "half" ? "Half-day marked" : "Holiday marked");
      setReason("");
      setSelected(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to mark holiday");
    } finally {
      setBusy(false);
    }
  }

  async function clearLeave(date: string) {
    setBusy(true);
    try {
      await removeOutletLeave(outlet._id, date);
      onChanged("Holiday removed");
      setSelected(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.describe() : "Failed to remove holiday");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Holiday Calendar" description="Tap any future date to mark the restaurant closed (or half-day) — customers see it as closed that day.">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border hover:bg-cream-200"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="font-display font-semibold text-ink">
          {monthCursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border hover:bg-cream-200"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-ink-faint">
        {DAYS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = ymd(date);
          const isPast = date < today;
          const leaveType = leaveByDate.get(key);
          const isWeeklyClosed = weeklyClosed.has(date.getDay());
          const isSelected = selected === key;
          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => setSelected(isSelected ? null : key)}
              className={`relative aspect-square rounded-lg border text-sm font-medium transition ${
                isPast
                  ? "cursor-not-allowed border-transparent text-ink-faint/40"
                  : leaveType === "full"
                  ? "border-vibe-coral bg-vibe-coral/10 text-vibe-coral"
                  : leaveType === "half"
                  ? "border-amber-400 bg-amber-50 text-amber-600"
                  : isSelected
                  ? "border-vibe-violet bg-vibe-violet text-white"
                  : isWeeklyClosed
                  ? "border-surface-border bg-cream-200 text-ink-faint"
                  : "border-surface-border text-ink hover:border-vibe-violet"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-vibe-coral bg-vibe-coral/10" /> Holiday</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-amber-400 bg-amber-50" /> Half-day</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-surface-border bg-cream-200" /> Weekly closed</span>
      </div>

      {selected && (
        <div className="mt-4 rounded-lg bg-cream-200/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">
              {new Date(selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <button onClick={() => setSelected(null)} className="rounded-full bg-cream-300 p-1.5 text-ink-soft hover:bg-cream-200">
              <X size={14} />
            </button>
          </div>
          {leaveByDate.has(selected) ? (
            <button
              onClick={() => clearLeave(selected)}
              disabled={busy}
              className="w-full rounded-xl bg-vibe-coral/10 py-3 text-sm font-semibold text-vibe-coral hover:bg-vibe-coral/20 disabled:opacity-60"
            >
              Remove this holiday
            </button>
          ) : (
            <div className="space-y-3">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional) — festival, maintenance…"
                className="w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => mark(selected, "full")}
                  disabled={busy}
                  className="flex flex-col items-center gap-1 rounded-xl bg-vibe-coral/10 py-3 text-sm font-semibold text-vibe-coral hover:bg-vibe-coral/20 disabled:opacity-60"
                >
                  <CalendarOff size={18} /> Full Day Closed
                </button>
                <button
                  onClick={() => mark(selected, "half")}
                  disabled={busy}
                  className="flex flex-col items-center gap-1 rounded-xl bg-amber-50 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-100 disabled:opacity-60"
                >
                  <Clock size={18} /> Half Day
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Upcoming holidays</p>
        {(outlet.leaves ?? []).filter((l) => new Date(l.date) >= today).length === 0 ? (
          <p className="py-2 text-sm text-ink-faint">No upcoming holidays.</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {(outlet.leaves ?? [])
              .filter((l) => new Date(l.date) >= today)
              .sort((a, b) => +new Date(a.date) - +new Date(b.date))
              .map((l) => (
                <div key={l.date} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {new Date(l.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      {l.type === "half" ? " · Half-day" : ""}
                    </p>
                    {l.reason && <p className="text-xs text-ink-faint">{l.reason}</p>}
                  </div>
                  <button
                    onClick={() => clearLeave(ymd(new Date(l.date)))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
