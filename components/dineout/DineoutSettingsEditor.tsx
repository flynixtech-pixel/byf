"use client";

import { useState } from "react";
import { BadgePercent, CalendarCheck2, LoaderCircle, Receipt, Save } from "lucide-react";
import { SectionCard } from "@/components/vendor/ui";
import { setOutletDineout } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { FoodOutlet, OutletDineout } from "@/lib/api/types";

const DEFAULTS: OutletDineout = {
  tableBooking: true,
  payBill: true,
  flatDiscountPct: 10,
  slotMinutes: 60,
  tablesPerSlot: 10,
  maxPartySize: 20,
  advanceDays: 30,
  autoConfirm: false,
};

/**
 * Dineout controls for a partner restaurant: the flat discount players get, how table
 * slots are shaped, and whether reservations auto-confirm.
 *
 * State holds only unsaved edits, layered over what's on the outlet during render, so
 * switching restaurants needs no re-seeding.
 */
export function DineoutSettingsEditor({
  outlet,
  onSaved,
  onToast,
}: {
  outlet: FoodOutlet;
  onSaved: (outlet: FoodOutlet) => void;
  onToast: (message: string) => void;
}) {
  const [edits, setEdits] = useState<Partial<OutletDineout>>({});
  const [saving, setSaving] = useState(false);

  const value: OutletDineout = { ...DEFAULTS, ...outlet.dineout, ...edits };

  function set<K extends keyof OutletDineout>(key: K, next: OutletDineout[K]) {
    setEdits((e) => ({ ...e, [key]: next }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await setOutletDineout(outlet._id, value);
      setEdits({});
      onSaved(updated);
      onToast("Dineout settings saved");
    } catch (err) {
      onToast(err instanceof ApiError ? err.describe() : "Failed to save Dineout settings");
    } finally {
      setSaving(false);
    }
  }

  /** Slots per day at the current shape, so the owner can sanity-check capacity. */
  const slotsPerDay = Math.max(1, Math.floor((13 * 60) / Math.max(15, value.slotMinutes)));

  return (
    <SectionCard
      title="Dineout — Table Booking & Bill Payment"
      description="How players reserve a table here and what discount they get when they settle the bill in the app."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          icon={<CalendarCheck2 size={16} />}
          label="Table booking"
          hint="Players can reserve a table from the app"
          on={value.tableBooking}
          onToggle={() => set("tableBooking", !value.tableBooking)}
        />
        <Toggle
          icon={<Receipt size={16} />}
          label="Pay bill in app"
          hint="Players settle their bill through BYV"
          on={value.payBill}
          onToggle={() => set("payBill", !value.payBill)}
        />
      </div>

      {value.payBill && (
        <div className="mt-5 border-t border-surface-border pt-4">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            <BadgePercent size={13} className="text-emerald-600" /> Flat player discount
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2">
              <input
                type="number"
                min={0}
                max={100}
                value={value.flatDiscountPct}
                onChange={(e) => set("flatDiscountPct", Number(e.target.value))}
                aria-label="Flat discount percentage"
                className="w-14 bg-transparent text-sm font-semibold outline-none"
              />
              <span className="text-xs text-ink-faint">% off</span>
            </div>
            <p className="text-xs text-ink-faint">
              Comes off every bill players pay through the app. You fund this — BYV charges the player a
              separate convenience fee.
            </p>
          </div>
          {value.flatDiscountPct > 0 && (
            <p className="mt-2 text-xs text-ink-faint">
              On a ₹1,000 bill a player pays{" "}
              <span className="font-semibold text-ink">
                ₹{Math.round(1000 - (1000 * value.flatDiscountPct) / 100) + 10}
              </span>{" "}
              and you receive{" "}
              <span className="font-semibold text-ink">
                ₹{Math.round(1000 - (1000 * value.flatDiscountPct) / 100)}
              </span>
              .
            </p>
          )}
        </div>
      )}

      {value.tableBooking && (
        <div className="mt-5 space-y-4 border-t border-surface-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Slot length (mins)"
              value={value.slotMinutes}
              min={15}
              max={240}
              onChange={(v) => set("slotMinutes", v)}
              hint={`About ${slotsPerDay} slots across a 13-hour day`}
            />
            <NumberField
              label="Tables per slot"
              value={value.tablesPerSlot}
              min={1}
              max={500}
              onChange={(v) => set("tablesPerSlot", v)}
              hint="How many bookings you'll take at the same time"
            />
            <NumberField
              label="Max guests per booking"
              value={value.maxPartySize}
              min={1}
              max={100}
              onChange={(v) => set("maxPartySize", v)}
              hint="Larger groups will need to call you"
            />
            <NumberField
              label="Bookable days ahead"
              value={value.advanceDays}
              min={1}
              max={180}
              onChange={(v) => set("advanceDays", v)}
              hint="How far in advance players can reserve"
            />
          </div>

          <Toggle
            icon={<CalendarCheck2 size={16} />}
            label="Auto-confirm bookings"
            hint="Skip manual approval — reservations confirm instantly"
            on={value.autoConfirm}
            onToggle={() => set("autoConfirm", !value.autoConfirm)}
          />
        </div>
      )}

      <div className="mt-5 border-t border-surface-border pt-4">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Cost for two (optional)
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2">
            <span className="text-sm text-ink-faint">₹</span>
            <input
              type="number"
              min={0}
              value={value.costForTwo ?? ""}
              onChange={(e) => set("costForTwo", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="900"
              aria-label="Cost for two"
              className="w-20 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-ink-faint"
            />
          </div>
          <p className="text-xs text-ink-faint">Typical spend for two, shown on your restaurant card.</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
      >
        {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? "Saving…" : "Save Dineout Settings"}
      </button>
    </SectionCard>
  );
}

function Toggle({
  icon,
  label,
  hint,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        on ? "border-vibe-violet bg-vibe-violet/5" : "border-surface-border opacity-60 hover:opacity-100"
      }`}
    >
      <span className={on ? "text-vibe-violet" : "text-ink-faint"}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block truncate text-[11px] text-ink-faint">{hint}</span>
      </span>
      <span className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition ${on ? "bg-vibe-violet" : "bg-cream-300"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  hint?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm font-semibold outline-none focus:border-vibe-violet"
      />
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}
