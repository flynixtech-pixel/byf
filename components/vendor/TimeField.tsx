"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock } from "lucide-react";

/**
 * A styled 12-hour time picker that replaces the raw `<input type="time">`.
 *
 * The native input pops the OS clock dial (the spinning-hand thing the vendor
 * asked us to "enhance"), which feels clunky on a booking screen. This is a
 * self-contained hour / minute / AM–PM picker that matches the panel styling and
 * works the same on every device. Value in and out is 24-hour `"HH:MM"`, so it
 * drops straight into the existing slot code.
 */
export function TimeField({
  value,
  onChange,
  minuteStep = 5,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Granularity of the minute list. */
  minuteStep?: number;
}) {
  const [h24, mRaw] = value.split(":");
  const hour24 = Number(h24 || 0);
  const minute = Number(mRaw || 0);
  const ampm: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  const compose = (h12: number, min: number, ap: "AM" | "PM") => {
    let h = h12 % 12;
    if (ap === "PM") h += 12;
    onChange(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);

  return (
    <div className="flex items-stretch gap-1.5">
      <span className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-slate-400">
        <Clock size={14} />
      </span>
      <MiniSelect
        value={hour12}
        options={hourOptions.map((h) => ({ value: h, label: String(h).padStart(2, "0") }))}
        onChange={(h) => compose(h, minute, ampm)}
      />
      <span className="flex items-center text-sm font-black text-slate-400">:</span>
      <MiniSelect
        value={minute}
        options={minuteOptions.map((m) => ({ value: m, label: String(m).padStart(2, "0") }))}
        onChange={(m) => compose(hour12, m, ampm)}
      />
      <MiniSelect
        value={ampm}
        options={[
          { value: "AM", label: "AM" },
          { value: "PM", label: "PM" },
        ]}
        onChange={(ap) => compose(hour12, minute, ap)}
      />
    </div>
  );
}

/** Compact custom dropdown — no native OS picker, matches the panel look. */
function MiniSelect<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-0.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm font-black tabular-nums text-slate-800 outline-none transition hover:border-slate-300"
      >
        {current?.label ?? "--"}
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-100 bg-white p-1 shadow-xl">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full rounded-lg px-2 py-2 text-center text-sm font-black tabular-nums transition ${
                  on ? "bg-vibe-violet/10 text-vibe-violet" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
