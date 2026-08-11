"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X, Sun, Moon, Lock } from "lucide-react";
import { useBackDismiss } from "@/lib/useBackDismiss";

/** Every half is a pure, fixed 12-hour analog face (12 positions, 30° each) — the
 * split point is 3 AM / 3 PM rather than midnight/noon, which is what makes Morning/
 * Noon actually run 5 AM–3 PM and Evening/Night 3 PM–3 AM as requested. That means
 * "12" does not sit at the very top of either face — the hour at the top position is
 * honestly labelled whatever it really is (3, for both halves) — but every hour a
 * vendor asked for (through 3 PM on Morning/Noon) is a normal, fillable slice. The
 * fixed 3:00–5:00 AM cleaning/maintenance gap falls as the first two slices of
 * Morning/Noon; Evening/Night's 12 hours never reach it. Must match
 * CLOSED_WINDOW_START/END in PackageStudio.tsx, the real source of truth for what
 * slots actually get generated. */
const CLOSED_HOURS = new Set<number>();

type Half = "MorningNoon" | "EveningNight";

const HALF_START: Record<Half, number> = { MorningNoon: 3, EveningNight: 15 };

/** The 12 real hours on each half's dial face, in clockwise order. */
const HALF_FACE_HOURS: Record<Half, number[]> = {
  MorningNoon: Array.from({ length: 12 }, (_, i) => (HALF_START.MorningNoon + i) % 24),
  EveningNight: Array.from({ length: 12 }, (_, i) => (HALF_START.EveningNight + i) % 24),
};

/** Same as HALF_FACE_HOURS minus the permanently-closed 3–5 AM pair — only ever
 * trims Morning/Noon since Evening/Night's hours never include them. */
const HALF_BOOKABLE_HOURS: Record<Half, number[]> = {
  MorningNoon: HALF_FACE_HOURS.MorningNoon.filter((h) => !CLOSED_HOURS.has(h)),
  EveningNight: HALF_FACE_HOURS.EveningNight,
};

const HALF_LABEL: Record<Half, string> = {
  MorningNoon: "Morning/Noon",
  EveningNight: "Evening/Night",
};

export interface ClockSlotItem {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  price: number;
  label: string;     // "Morning", etc.
  status: "Available" | "Booked" | "Part Paid" | "Offline Booked" | "Blocked" | "On Hold" | "Empty";
  customerName?: string;
}

/* ─── Vibe Cycle: same 6-colour language as the Bookings Timeline ──────
   available (green) · booked on BYV (red) · walk-in (blue) · pending (amber) ·
   blocked (rose) · closed/no slot (grey) — so a vendor sees identical colours
   whether they're on Timeline or Clock view. */
const TONE_HEX = {
  available: "#10b981",
  onlineBooked: "#ef4444",
  confirmed: "#3b82f6",
  pending: "#f59e0b",
  blocked: "#f43f5e",
  closed: "#94a3b8",
} as const;

type Tone = keyof typeof TONE_HEX;

const STATUS_TONE: Record<ClockSlotItem["status"], Tone> = {
  Available: "available",
  Booked: "onlineBooked",
  "Offline Booked": "confirmed",
  "Part Paid": "pending",
  "On Hold": "pending",
  Blocked: "blocked",
  // Past slot nobody booked — shown as the same neutral grey as "Closed".
  Empty: "closed",
};

const TONE_LEGEND: { tone: Tone; label: string }[] = [
  { tone: "available", label: "Available" },
  { tone: "onlineBooked", label: "Booked on BYV" },
  { tone: "confirmed", label: "Walk-in" },
  { tone: "pending", label: "Pending" },
  { tone: "blocked", label: "Blocked" },
  { tone: "closed", label: "Closed" },
];

/** The stat-card summary stays a simple 3-way split (Available / Booked / Blocked)
 * even though the dial itself now shows the full 6-colour breakdown. */
type SummaryBucket = "available" | "taken" | "blocked";

function summaryBucket(status: ClockSlotItem["status"]): SummaryBucket {
  if (status === "Available") return "available";
  if (status === "Blocked" || status === "Empty") return "blocked";
  return "taken";
}

const STAT_CARD_CFG: {
  tone: SummaryBucket;
  label: string;
  cls: { box: string; label: string; value: string };
}[] = [
  { tone: "available", label: "Available", cls: { box: "border-emerald-200 bg-emerald-50", label: "text-emerald-600", value: "text-emerald-700" } },
  { tone: "taken", label: "Booked", cls: { box: "border-orange-200 bg-orange-50", label: "text-orange-500", value: "text-orange-700" } },
  { tone: "blocked", label: "Blocked", cls: { box: "border-slate-200 bg-slate-100", label: "text-slate-500", value: "text-slate-700" } },
];

function timeStringToHours(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h + (m || 0) / 60;
}

function slotDurationHrs(slot: ClockSlotItem): number {
  const startH = timeStringToHours(slot.startTime);
  let endH = timeStringToHours(slot.endTime);
  if (endH <= startH) endH += 24;
  return endH - startH;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describePieSegment(
  x: number,
  y: number,
  rIn: number,
  rOut: number,
  startAngle: number,
  endAngle: number
) {
  const startIn = polarToCartesian(x, y, rIn, endAngle);
  const endIn = polarToCartesian(x, y, rIn, startAngle);
  const startOut = polarToCartesian(x, y, rOut, endAngle);
  const endOut = polarToCartesian(x, y, rOut, startAngle);

  if (Math.abs(endAngle - startAngle) >= 360) {
    endAngle = startAngle + 359.99;
  }

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", startOut.x, startOut.y,
    "A", rOut, rOut, 0, largeArcFlag, 0, endOut.x, endOut.y,
    "L", endIn.x, endIn.y,
    "A", rIn, rIn, 0, largeArcFlag, 1, startIn.x, startIn.y,
    "Z"
  ].join(" ");
}

function toneOf(status: ClockSlotItem["status"]): Tone {
  return STATUS_TONE[status] ?? "available";
}

function statusColor(status: ClockSlotItem["status"]): string {
  return TONE_HEX[toneOf(status)];
}

/** Friendly label matching the Timeline's legend wording, e.g. "Offline Booked" → "Confirmed". */
function toneLabel(status: ClockSlotItem["status"]): string {
  return TONE_LEGEND.find((l) => l.tone === toneOf(status))?.label ?? status;
}

export function ClockSlotsWidget({
  slots = [],
  onSelectSlot,
  onSelectHour,
  onLongPressSlot,
  renderSeeBooking,
  autoFullscreen = false,
  onExitFullscreen,
}: {
  slots: ClockSlotItem[];
  onSelectSlot?: (slot: ClockSlotItem) => void;
  onSelectHour?: (hour: number) => void;
  /** Press-and-hold a slice for the quick "book offline / block" sheet. */
  onLongPressSlot?: (slot: ClockSlotItem) => void;
  /** Receives a callback that exits fullscreen — call it before opening any page-level UI. */
  renderSeeBooking?: (closeFullscreen: () => void) => React.ReactNode;
  /** Open fullscreen straight away — the dial is unreadable squeezed into a card on a phone. */
  autoFullscreen?: boolean;
  /** Fired whenever fullscreen is left, so the host page can switch views instead of
   * dropping the vendor back onto the cramped inline dial. */
  onExitFullscreen?: () => void;
}) {
  const [hoveredSlot, setHoveredSlot] = useState<ClockSlotItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [half, setHalf] = useState<Half>(() =>
    HALF_BOOKABLE_HOURS.MorningNoon.includes(new Date().getHours()) ? "MorningNoon" : "EveningNight"
  );
  const [isFullscreen, setIsFullscreen] = useState(autoFullscreen);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    onExitFullscreen?.();
  }, [onExitFullscreen]);

  /* ── Long-press: press-and-hold a slice for the quick book-offline / block sheet.
        A tap still opens the normal slot modal; the fired flag stops the trailing
        click from double-triggering. ── */
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = (slot: ClockSlotItem) => {
    // A past, never-booked slot has nothing left to do — don't offer to book/block it.
    if (!onLongPressSlot || slot.status === "Empty") return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPressSlot(slot);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Scroll lock keyed on fullscreen alone — re-running it would capture "hidden" as the
  // value to restore and leave the page unscrollable after closing.
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // Escape closes fullscreen.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, exitFullscreen]);

  /** Fullscreen fills the phone's width (capped so it stays a sensible size on desktop). */
  const [viewportW, setViewportW] = useState(420);
  useEffect(() => {
    const measure = () => setViewportW(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const size = isFullscreen ? Math.max(260, Math.min(400, viewportW - 56)) : 280;
  const center = size / 2;
  const outerRadius = size / 2 - 24;
  const innerRadius = outerRadius * 0.3;

  // The active half's hours, in clockwise dial order — 10 wedges for Morning/Noon,
  // 14 for Evening/Night (its 12 bookable hours plus the closed 3–5 AM tail). Each
  // half always fills the full 360°, so wedge width differs between the two faces.
  const faceHours = HALF_FACE_HOURS[half];
  const wedgeDeg = 360 / faceHours.length;

  // Position on the dial face (0 = top/"12", clockwise) → real 24h hour for the active half.
  function toRealHour(positionHour: number) {
    return faceHours[((positionHour % faceHours.length) + faceHours.length) % faceHours.length];
  }

  // The fullscreen overlay sits above the page's modals, so any selection made
  // while fullscreen must exit fullscreen first or the booking form opens
  // invisibly behind the clock.
  const selectSlot = (slot: ClockSlotItem) => {
    onSelectSlot?.(slot);
  };
  const selectHour = (hour: number) => {
    onSelectHour?.(hour);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;

    const angleRad = Math.atan2(y, x);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    const positionHour = Math.floor(angleDeg / wedgeDeg) % faceHours.length;
    const realHour = toRealHour(positionHour);
    if (CLOSED_HOURS.has(realHour)) return; // 3–5 AM is a fixed closed window — nothing to select
    selectHour(realHour);
  };

  const clockTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i < faceHours.length; i++) {
      const realHour = faceHours[i]!;
      const angle = i * wedgeDeg + 90;
      const posOuter = polarToCartesian(center, center, outerRadius + 14, angle);
      const label = realHour % 12 === 0 ? 12 : realHour % 12;
      ticks.push({ position: i, label, posOuter, angle });
    }
    return ticks;
  }, [center, outerRadius, faceHours, wedgeDeg]);

  /** Only the slots that fall inside the currently shown half's bookable hours. */
  const activeSlotsList = useMemo(() => {
    const bookable = new Set(HALF_BOOKABLE_HOURS[half]);
    return slots.filter((s) => bookable.has(Math.floor(timeStringToHours(s.startTime))));
  }, [slots, half]);

  const segments = useMemo(() => {
    const result: { slot: ClockSlotItem; pathData: string; color: string; index: number }[] = [];

    for (let i = 0; i < faceHours.length; i++) {
      const realHour = faceHours[i]!;
      if (CLOSED_HOURS.has(realHour)) continue; // rendered separately, never as a real slot

      // Find a slot that overlaps with [realHour, realHour + 1]
      const matchingSlot = activeSlotsList.find(s => {
        const start = timeStringToHours(s.startTime);
        let end = timeStringToHours(s.endTime);
        if (end <= start) end += 24;
        return realHour >= start && realHour < end;
      });

      const startAngle = i * wedgeDeg + 90;
      const endAngle = (i + 1) * wedgeDeg + 90;
      const color = matchingSlot ? statusColor(matchingSlot.status) : "transparent";

      if (matchingSlot) {
        result.push({
          slot: matchingSlot,
          pathData: describePieSegment(center, center, innerRadius, outerRadius, startAngle, endAngle),
          color,
          index: i,
        });
      }
    }
    return result;
  }, [activeSlotsList, center, innerRadius, outerRadius, faceHours, wedgeDeg]);

  /** The fixed 3–5 AM closed wedges for whichever half is showing (only ever present on
   * the Evening/Night face) — hatched, inert, always in the same place so a vendor
   * learns to read it at a glance. */
  const closedSegments = useMemo(() => {
    const result: { pathData: string; index: number; labelPos: { x: number; y: number } }[] = [];
    for (let i = 0; i < faceHours.length; i++) {
      const realHour = faceHours[i]!;
      if (!CLOSED_HOURS.has(realHour)) continue;
      const startAngle = i * wedgeDeg + 90;
      const endAngle = (i + 1) * wedgeDeg + 90;
      const labelPos = polarToCartesian(center, center, (innerRadius + outerRadius) / 2, startAngle + wedgeDeg / 2);
      result.push({
        pathData: describePieSegment(center, center, innerRadius, outerRadius, startAngle, endAngle),
        index: i,
        labelPos,
      });
    }
    return result;
  }, [center, innerRadius, outerRadius, faceHours, wedgeDeg]);

  // Stats and the "Slot timings" summary below cover the whole day, not just the half
  // currently shown on the dial face — otherwise they'd silently disagree with the
  // slot count shown on the board (which is always the full day), and switching the
  // half toggle would make totals appear to change even though no slot changed.
  const stats = useMemo(() => {
    const hrsByTone: Record<SummaryBucket, number> = { available: 0, taken: 0, blocked: 0 };
    for (const s of slots) {
      hrsByTone[summaryBucket(s.status)] += slotDurationHrs(s);
    }
    const total = slots.reduce((sum, s) => sum + slotDurationHrs(s), 0) || 1;
    const pct = (hrs: number) => Math.round((hrs / total) * 100);
    return {
      byTone: hrsByTone,
      pctByTone: {
        available: pct(hrsByTone.available),
        taken: pct(hrsByTone.taken),
        blocked: pct(hrsByTone.blocked),
      } as Record<SummaryBucket, number>,
    };
  }, [slots]);

  /** Earliest start / latest end across the whole day's slots — not assumed to already be
   * sorted, and not scoped to the active AM/PM half (see note above `stats`). */
  const fullDayRange = useMemo(() => {
    if (slots.length === 0) return null;
    let earliest = slots[0];
    let latest = slots[0];
    for (const s of slots) {
      if (timeStringToHours(s.startTime) < timeStringToHours(earliest.startTime)) earliest = s;
      if (timeStringToHours(s.endTime) > timeStringToHours(latest.endTime)) latest = s;
    }
    return { start: earliest.startTime, end: latest.endTime };
  }, [slots]);

  // Hands follow the real current time, refreshed every 30s.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const hourHandAngle = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
  const minuteHandAngle = now.getMinutes() * 6;

  // Two readable themes so a glance at the dial says "morning" or "night" without
  // reading the toggle label — warm sunrise tones for Morning/Noon, deep sky for
  // Evening/Night, with every line/number/hand recoloured for contrast.
  const isNight = half === "EveningNight";
  const dialTheme = isNight
    ? { tickFill: "#0f172a", ringStroke: "#475569", hourHand: "#f8fafc", minuteHand: "#cbd5e1", hub: "#f8fafc", hubStroke: "#64748b" }
    : { tickFill: "#0f172a", ringStroke: "#e2e8f0", hourHand: "#0f172a", minuteHand: "#334155", hub: "#0f172a", hubStroke: "#e2e8f0" };

  const body = (
    <>
      <div className="relative w-full text-center mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-vibe-violet">Vibe Cycle</p>
        <p className="text-[10px] text-ink-faint mt-0.5">
          {isFullscreen ? "Tap a slice to manage · press & hold to book offline or block" : "Tap the cycle to open it fullscreen"}
        </p>
        <button
          type="button"
          onClick={() => (isFullscreen ? exitFullscreen() : setIsFullscreen(true))}
          aria-label={isFullscreen ? "Exit fullscreen" : "Open Vibe Cycle fullscreen"}
          className="absolute right-0 top-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          {isFullscreen ? <X size={16} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* Morning/Noon vs Evening/Night toggle — sun/moon + colour so the active half reads at a glance */}
      <div className="mb-1.5 inline-flex overflow-hidden rounded-full border border-surface-border text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setHalf("MorningNoon")}
          className={`flex items-center gap-1.5 px-4 py-1.5 transition ${half === "MorningNoon" ? "bg-amber-500 text-white" : "bg-white text-ink-soft hover:bg-cream-300"}`}
        >
          <Sun size={13} /> {HALF_LABEL.MorningNoon}
        </button>
        <button
          type="button"
          onClick={() => setHalf("EveningNight")}
          className={`flex items-center gap-1.5 px-4 py-1.5 transition ${half === "EveningNight" ? "bg-indigo-900 text-white" : "bg-white text-ink-soft hover:bg-cream-300"}`}
        >
          <Moon size={13} /> {HALF_LABEL.EveningNight}
        </button>
      </div>
      <p className="mb-3 flex items-center justify-center gap-1 text-[9.5px] font-semibold text-ink-faint">
        Morning/Noon 3:00 AM–3:00 PM · Evening/Night 3:00 PM–3:00 AM
      </p>

      <div className="relative">
        {/* Compact mode: the whole cycle is one big tap target that opens fullscreen.
            In fullscreen this layer is gone, so slices/hours become directly interactive. */}
        {!isFullscreen && (
          <button
            type="button"
            aria-label="Open Vibe Cycle fullscreen"
            onClick={() => setIsFullscreen(true)}
            className="absolute inset-0 z-10 cursor-pointer rounded-full"
          />
        )}
        <svg width={size} height={size} className="overflow-visible select-none cursor-crosshair" onClick={handleSvgClick}>
          <defs>
            <clipPath id="dial-clip">
              <circle cx={center} cy={center} r={outerRadius} />
            </clipPath>
            <linearGradient id="dialDay" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            <linearGradient id="dialNight" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <pattern id="closedHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill={isNight ? "#334155" : "#cbd5e1"} opacity="0.55" />
              <line x1="0" y1="0" x2="0" y2="6" stroke={isNight ? "#0f172a" : "#94a3b8"} strokeWidth="3" />
            </pattern>
          </defs>

          {/* Outer Dial Face — warm sunrise gradient for Morning/Noon, deep sky for Evening/Night */}
          <circle cx={center} cy={center} r={outerRadius} fill={isNight ? "url(#dialNight)" : "url(#dialDay)"} stroke="#f1f5f9" strokeWidth="2" />

          {/* Subtle Watermark BYV Logo in the remaining area */}
          <image
            href="/logo.jpg"
            x={center - outerRadius}
            y={center - outerRadius}
            width={outerRadius * 2}
            height={outerRadius * 2}
            opacity={isNight ? 0.14 : 0.22}
            style={{ pointerEvents: "none" }}
            clipPath="url(#dial-clip)"
          />

          {/* Fixed 3–5 AM closed wedges — hatched, inert, same spot every time */}
          {closedSegments.map((seg) => (
            <g key={`closed-${seg.index}`} className="pointer-events-none">
              <path d={seg.pathData} fill="url(#closedHatch)" stroke={isNight ? "#0f172a" : "#ffffff"} strokeWidth="2" />
              <foreignObject x={seg.labelPos.x - 8} y={seg.labelPos.y - 8} width="16" height="16">
                <Lock size={13} color={isNight ? "#cbd5e1" : "#64748b"} />
              </foreignObject>
            </g>
          ))}

          {/* Slot Slices — solid pie wedges */}
          {segments.map((seg) => (
            <path
              key={seg.index}
              d={seg.pathData}
              fill={seg.color}
              className="cursor-pointer transition-all duration-200 hover:opacity-85"
              stroke="#ffffff"
              strokeWidth="2"
              onClick={() => {
                if (longPressFired.current) return; // consumed by the long-press sheet
                selectSlot(seg.slot);
              }}
              onPointerDown={() => startLongPress(seg.slot)}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onMouseEnter={(e) => {
                setHoveredSlot(seg.slot);
                const rect = e.currentTarget.getBoundingClientRect();
                const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                if (parentRect) {
                  setTooltipPos({
                    x: rect.left - parentRect.left + rect.width / 2,
                    y: rect.top - parentRect.top - 10,
                  });
                }
              }}
              onMouseLeave={() => {
                setHoveredSlot(null);
                cancelLongPress();
              }}
            />
          ))}

          {/* Outer ring frame + hour numbers */}
          <circle cx={center} cy={center} r={outerRadius} fill="none" stroke={dialTheme.ringStroke} strokeWidth="3" />
          {clockTicks.map((tick) => {
            const tickHour = toRealHour(tick.position);
            const closed = CLOSED_HOURS.has(tickHour);
            return (
              <text
                key={tick.position}
                x={tick.posOuter.x}
                y={tick.posOuter.y}
                fill={closed ? (isNight ? "#64748b" : "#94a3b8") : dialTheme.tickFill}
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                className={closed ? "cursor-not-allowed" : "cursor-pointer hover:fill-vibe-violet transition-all"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (closed) return;
                  selectHour(tickHour);
                }}
              >
                {tick.label}
              </text>
            );
          })}

          {/* Center hub */}
          <circle cx={center} cy={center} r={innerRadius} fill={isNight ? "#0f172a" : "#ffffff"} stroke={dialTheme.hubStroke} strokeWidth="2" />

          {/* Minute hand */}
          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - outerRadius * 0.75}
            stroke={dialTheme.minuteHand}
            strokeWidth="2"
            strokeLinecap="round"
            className="pointer-events-none"
            style={{
              transform: `rotate(${minuteHandAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: "transform 1s linear",
            }}
          />
          {/* Hour hand */}
          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - outerRadius * 0.45}
            stroke={dialTheme.hourHand}
            strokeWidth="4"
            strokeLinecap="round"
            className="pointer-events-none"
            style={{
              transform: `rotate(${hourHandAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: "transform 1s linear",
            }}
          />

          {/* Center "+" hub icon */}
          <circle cx={center} cy={center} r={innerRadius * 0.55} fill={isNight ? "#312e81" : "#0f172a"} className="pointer-events-none" />
          <line x1={center - 7} y1={center} x2={center + 7} y2={center} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="pointer-events-none" />
          <line x1={center} y1={center - 7} x2={center} y2={center + 7} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="pointer-events-none" />
        </svg>

        {/* Floating Tooltip */}
        {hoveredSlot && (
          <div
            className="absolute z-20 pointer-events-none rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg -translate-x-1/2 -translate-y-full flex flex-col gap-0.5 border border-slate-700"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <p className="text-vibe-lime font-bold">
              {to12h(hoveredSlot.startTime)} - {to12h(hoveredSlot.endTime)}
            </p>
            <p className="text-[10px] text-slate-300 font-semibold">Status: {toneLabel(hoveredSlot.status)}</p>
            {hoveredSlot.customerName && <p className="text-[10px] text-slate-300">Customer: {hoveredSlot.customerName}</p>}
          </div>
        )}
      </div>

      {/* Legend — same six colours as the Bookings Timeline */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[9px] font-semibold text-slate-500">
        {TONE_LEGEND.map((l) => (
          <span key={l.tone} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: TONE_HEX[l.tone] }} /> {l.label}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Slot timings</p>
        <p className="mt-1 text-xs font-semibold text-slate-700">
          {fullDayRange ? `${to12h(fullDayRange.start)} - ${to12h(fullDayRange.end)}` : "No slots configured"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 w-full mt-4">
        {STAT_CARD_CFG.map(({ tone, cls, label }) => (
          <div key={tone} className={`rounded-xl border p-2.5 text-center ${cls.box}`}>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${cls.label}`}>{label}</p>
            <p className={`text-lg font-extrabold leading-tight ${cls.value}`}>
              {round1(stats.byTone[tone])}
              <span className={`text-[10px] font-semibold ml-0.5 ${cls.label}`}>hrs</span>
            </p>
            <p className={`text-[9px] font-bold ${cls.label}`}>{stats.pctByTone[tone]}%</p>
          </div>
        ))}
      </div>

      {/* See booking slot — only rendered when the host page wires it up; a button
          with no action (e.g. in the Package Studio preview) would just confuse. */}
      {renderSeeBooking && <div className="mt-4">{renderSeeBooking(exitFullscreen)}</div>}
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-white animate-in fade-in duration-150">
        <div className="flex min-h-full flex-col items-center px-4 pb-10 pt-6">{body}</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center p-4 bg-white rounded-2xl border border-surface-border shadow-panel w-full max-w-sm">
      {body}
    </div>
  );
}

function to12h(t: string): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr) % 24; // "24:00" (midnight close) → 12:00 AM
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ap}`;
}
