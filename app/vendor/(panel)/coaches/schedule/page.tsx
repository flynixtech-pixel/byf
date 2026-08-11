"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Sun,
  UserRoundCog,
  X,
} from "lucide-react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import {
  addCoachLeave,
  listVendorCoaches,
  removeCoachLeave,
  updateCoach,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { Coach, CoachWeeklyDay } from "@/lib/api/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function normalizeWeek(week: CoachWeeklyDay[] | undefined) {
  return Array.from({ length: 7 }, (_, day) => week?.find((d) => d.day === day) ?? { day, isOpen: day !== 0, startTime: "09:00", endTime: "18:00" });
}

export default function CoachScheduleManagerPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listVendorCoaches({ limit: 100 })
      .then((res) => {
        setCoaches(res.items);
        setActiveId((cur) => cur ?? res.items[0]?._id ?? null);
      })
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load coaches"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const coach = coaches.find((c) => c._id === activeId) ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leaveByDate = useMemo(
    () => new Map((coach?.leaves ?? []).map((l) => [ymd(new Date(l.date)), l.type])),
    [coach?.leaves]
  );
  const weeklyOff = useMemo(
    () => new Set(normalizeWeek(coach?.weeklyAvailability).filter((d) => !d.isOpen).map((d) => d.day)),
    [coach?.weeklyAvailability]
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
    if (!coach) return;
    setBusy(true);
    try {
      await addCoachLeave(coach._id, { date, type, reason: reason || undefined });
      setToast(type === "half" ? "Half-day marked" : "Holiday marked");
      setReason("");
      setSelected(null);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to mark leave");
    } finally {
      setBusy(false);
    }
  }

  async function clearLeave(date: string) {
    if (!coach) return;
    setBusy(true);
    try {
      await removeCoachLeave(coach._id, date);
      setToast("Leave removed");
      setSelected(null);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to remove leave");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible() {
    if (!coach) return;
    setBusy(true);
    try {
      await updateCoach(coach._id, { status: coach.status === "Active" ? "Inactive" : "Active" });
      setToast(coach.status === "Active" ? "Hidden from customers" : "Visible to customers");
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Schedule Manager"
        title="Manage coaching days"
        description="Mark a holiday or half-day for any upcoming day, and show/hide the profile on the customer side."
      />

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-faint">Loading coaches…</p>
      ) : coaches.length === 0 ? (
        <SectionCard title="No coaches yet" description="Add a coach from Manage Coaches first.">
          <p className="py-4 text-sm text-ink-faint">No coaches found.</p>
        </SectionCard>
      ) : (
        <>
          {/* Coach picker */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {coaches.map((c) => (
              <button
                key={c._id}
                onClick={() => { setActiveId(c._id); setSelected(null); }}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  activeId === c._id ? "border-[#5c3a21] bg-[#5c3a21]/10 text-[#5c3a21]" : "border-surface-border text-ink-soft hover:bg-cream-200"
                }`}
              >
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt={c.name} className="h-6 w-6 rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5c3a21]/15 text-[#5c3a21]"><UserRoundCog size={13} /></span>
                )}
                {c.name}
              </button>
            ))}
          </div>

          {coach && (
            <>
              {/* Profile-manage actions */}
              <SectionCard title={coach.name} description="Customer side profile controls & quick day-off.">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={coach.status === "Active" ? "success" : "neutral"}>
                    {coach.status === "Active" ? "Visible to customers" : "Hidden"}
                  </Badge>
                  <button
                    onClick={toggleVisible}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-200 disabled:opacity-60"
                  >
                    {coach.status === "Active" ? <><EyeOff size={15} /> Hide profile</> : <><Eye size={15} /> Show profile</>}
                  </button>
                  <button
                    onClick={() => mark(ymd(tomorrow), "full")}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-coral/10 px-3.5 py-2 text-sm font-semibold text-vibe-coral hover:bg-vibe-coral/20 disabled:opacity-60"
                  >
                    <CalendarOff size={15} /> Tomorrow off
                  </button>
                  <button
                    onClick={() => mark(ymd(tomorrow), "half")}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-100 disabled:opacity-60"
                  >
                    <Clock3 size={15} /> Tomorrow half-day
                  </button>
                </div>
              </SectionCard>

              {/* Calendar */}
              <SectionCard title="Calendar" description="Tap any date to mark a holiday / half-day.">
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
                    const leaveType = leaveByDate.get(key);
                    const isWeeklyOff = weeklyOff.has(date.getDay());
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
                            ? "border-[#5c3a21] bg-[#5c3a21] text-white"
                            : isWeeklyOff
                            ? "border-surface-border bg-cream-200 text-ink-faint"
                            : "border-surface-border text-ink hover:border-[#5c3a21]"
                        }`}
                      >
                        {date.getDate()}
                        {leaveType === "half" && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-500" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-vibe-coral bg-vibe-coral/10" /> Holiday</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-amber-400 bg-amber-50" /> Half-day</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-surface-border bg-cream-200" /> Weekly off</span>
                </div>
              </SectionCard>
            </>
          )}
        </>
      )}

      {/* Action panel */}
      {selected && coach && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <button aria-label="Close" onClick={() => setSelected(null)} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-surface-border sm:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {new Date(selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                <p className="text-xs text-ink-faint">{coach.name} · manage this day</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full bg-cream-300 p-1.5 text-ink-soft hover:bg-cream-200"><X size={16} /></button>
            </div>

            {leaveByDate.has(selected) ? (
              <div className="space-y-3">
                <p className="rounded-xl bg-cream-200/60 px-4 py-3 text-sm text-ink-soft">
                  Currently marked as <span className="font-semibold">{leaveByDate.get(selected) === "half" ? "Half-day" : "Full holiday"}</span>.
                </p>
                <button onClick={() => clearLeave(selected)} disabled={busy} className="w-full rounded-xl bg-vibe-coral/10 py-3 text-sm font-semibold text-vibe-coral hover:bg-vibe-coral/20 disabled:opacity-60">
                  Remove this leave
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (optional) — personal, medical, travel…"
                  className="w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-[#5c3a21]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => mark(selected, "full")} disabled={busy} className="flex flex-col items-center gap-1 rounded-xl bg-vibe-coral/10 py-3 text-sm font-semibold text-vibe-coral hover:bg-vibe-coral/20 disabled:opacity-60">
                    <CalendarOff size={18} /> Full Holiday
                  </button>
                  <button onClick={() => mark(selected, "half")} disabled={busy} className="flex flex-col items-center gap-1 rounded-xl bg-amber-50 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-100 disabled:opacity-60">
                    <Sun size={18} /> Half Day
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
