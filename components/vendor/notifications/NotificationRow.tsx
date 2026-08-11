"use client";

import { CheckCheck, ChevronRight, Clock, Trash2 } from "lucide-react";

/**
 * One booking/activity row.
 *
 * Tone drives the whole row's colour, per the spec:
 *   red → partial payment · green → paid in full · purple → tomorrow's booking
 */
export type RowTone = "paid" | "partial" | "tomorrow" | "neutral";

/** How the booking reached us. M (member) needs the memberships API before it can appear. */
export type BookingSource = "O" | "F" | "M";

const TONES: Record<RowTone, { dot: string; accent: string; chip: string; border: string }> = {
  paid: { dot: "bg-emerald-500", accent: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700", border: "border-l-emerald-400" },
  partial: { dot: "bg-rose-500", accent: "text-rose-600", chip: "bg-rose-50 text-rose-600", border: "border-l-rose-500" },
  tomorrow: { dot: "bg-purple-500", accent: "text-purple-600", chip: "bg-purple-50 text-purple-600", border: "border-l-purple-400" },
  neutral: { dot: "bg-slate-400", accent: "text-slate-500", chip: "bg-slate-100 text-slate-600", border: "border-l-slate-200" },
};

const SOURCE_STYLE: Record<BookingSource, { bg: string; title: string }> = {
  O: { bg: "bg-emerald-500", title: "Online booking" },
  F: { bg: "bg-amber-500", title: "Offline / walk-in" },
  M: { bg: "bg-indigo-500", title: "Member" },
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function NotificationRow({
  name,
  statusLine,
  timeRange,
  courtName,
  when,
  tone,
  source,
  amount,
  amountNote,
  isLast,
  expanded,
  unread,
  onToggle,
  onRemove,
  children,
}: {
  name: string;
  statusLine: string;
  timeRange: string;
  courtName?: string;
  when: string;
  tone: RowTone;
  source: BookingSource;
  amount?: number;
  amountNote?: string;
  isLast: boolean;
  expanded: boolean;
  unread?: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  children?: React.ReactNode;
}) {
  const t = TONES[tone];
  const s = SOURCE_STYLE[source];

  return (
    <div className="flex gap-2.5">
      {/* Left rail — just the timeline dot + connector now; the "played X times" label
          moved inside the card, in the line a mobile number would normally sit on. */}
      <div className="flex w-3 shrink-0 flex-col items-center pt-4">
        <span className={`h-2 w-2 shrink-0 rounded-full ${t.dot}`} />
        {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
      </div>

      {/* Card — coloured left border makes payment status readable at a glance, without
          opening the row (partial payment shows rose even collapsed). Every row keeps
          full contrast; viewed rows show a blue double-tick instead of fading. */}
      <div className={`mb-2.5 min-w-0 flex-1 rounded-2xl border border-l-4 border-slate-100 bg-white shadow-sm transition ${t.border}`}>
        <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-3.5 text-left">
          {/* Profile of whoever booked, with an O / F / M source badge */}
          <div className="relative shrink-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500">
              {initials(name)}
            </span>
            <span
              title={s.title}
              className={`absolute -bottom-0.5 -right-0.5 flex h-4 min-w-[18px] items-center justify-center rounded-full border-2 border-white px-1 text-[6.5px] font-black text-white ${s.bg}`}
            >
              {source === "O" ? "ON" : source === "F" ? "OFF" : "MEM"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[12px] font-black text-slate-900">
              {source !== "F" && (
                <span
                  title="Online booking"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                />
              )}
              <span className="truncate">{name}</span>
            </p>
            <p className={`mt-0.5 truncate text-[10px] font-black ${t.accent}`}>{statusLine}</p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
              {timeRange}
              {courtName ? ` • ${courtName}` : ""}
            </p>
            {amount !== undefined && (
              <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black ${t.chip}`}>
                ₹{amount.toLocaleString("en-IN")}
                {amountNote ? ` • ${amountNote}` : ""}
              </span>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
              <Clock size={9} /> {when}
              <ChevronRight
                size={13}
                className={`text-slate-300 transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {!unread && (
                <span title="Seen" className="flex items-center gap-0.5 text-[8px] font-black text-sky-500">
                  <CheckCheck size={12} /> Seen
                </span>
              )}
              {onRemove && (
                <span
                  role="button"
                  tabIndex={0}
                  title="Remove notification"
                  aria-label="Remove notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onRemove();
                    }
                  }}
                  className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                >
                  <Trash2 size={13} />
                </span>
              )}
            </div>
          </div>
        </button>

        {expanded && children && (
          <div className="border-t border-slate-50 p-3.5 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
