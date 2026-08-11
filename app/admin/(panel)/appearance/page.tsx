"use client";

import { useState } from "react";
import { Check, Palette, Sparkles, Star, Wand2 } from "lucide-react";
import { Toast } from "@/components/admin/Toast";
import { useTheme, type CustomColors } from "@/components/theme/ThemeProvider";
import { CUSTOM_THEME_ID, THEME_PRESETS, type ThemePreset } from "@/lib/themes";
import { isValidHexColor } from "@/lib/colorShades";
import { updateSiteAppearance } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";

function ThemeCard({
  preset,
  active,
  disabled,
  onApply,
}: {
  preset: ThemePreset;
  active: boolean;
  disabled: boolean;
  onApply: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col gap-4 rounded-xl2 border p-5 transition ${
        active ? "border-vibe-violet shadow-pop" : "border-surface-border shadow-panel hover:border-vibe-violet/40"
      }`}
    >
      {active && (
        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-vibe-violet text-white">
          <Check size={14} strokeWidth={3} />
        </span>
      )}

      <div
        className="h-20 w-full rounded-xl"
        style={{ background: `linear-gradient(120deg, ${preset.brand} 0%, ${preset.accent} 100%)` }}
      />

      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: preset.brand }} />
        <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: preset.accent }} />
        <p className="text-sm font-semibold text-ink">{preset.name}</p>
      </div>
      <p className="-mt-2 text-xs text-ink-faint">{preset.tagline}</p>

      <button
        onClick={onApply}
        disabled={active || disabled}
        className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          active
            ? "cursor-default bg-vibe-violet/10 text-vibe-violet"
            : "bg-ink text-white hover:bg-vibe-violet"
        }`}
      >
        {active ? (
          "Currently Live"
        ) : (
          <>
            <Sparkles size={14} /> Apply Theme
          </>
        )}
      </button>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  return (
    <div className="flex-1">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-white p-1.5 pl-2">
        <input
          type="color"
          value={isValidHexColor(value) ? value : "#000000"}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value);
          }}
          aria-label={label}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border-none bg-transparent p-0"
        />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (isValidHexColor(e.target.value)) onChange(e.target.value);
          }}
          placeholder="#f97316"
          className={`w-full bg-transparent font-mono text-sm outline-none ${
            isValidHexColor(text) ? "text-ink" : "text-red-500"
          }`}
        />
      </div>
    </div>
  );
}

function CustomThemeSection({
  isActive,
  initialColors,
  disabled,
  onApply,
}: {
  isActive: boolean;
  initialColors: CustomColors | null;
  disabled: boolean;
  onApply: (colors: CustomColors) => void;
}) {
  const [brand, setBrand] = useState(initialColors?.brand ?? "#f97316");
  const [accent, setAccent] = useState(initialColors?.accent ?? "#f43f5e");
  const canApply = isValidHexColor(brand) && isValidHexColor(accent);

  return (
    <div
      className={`rounded-xl2 border p-6 transition ${
        isActive ? "border-vibe-violet shadow-pop" : "border-surface-border shadow-panel"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Wand2 size={16} /> Invent Your Own Color
          </p>
          <p className="mt-1 max-w-md text-xs text-ink-faint">
            Pick any brand + accent color — BYV generates the full light-to-dark shade scale for you and applies it
            site-wide.
          </p>
        </div>
        {isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-vibe-violet/10 px-3 py-1 text-xs font-bold text-vibe-violet">
            <Check size={12} strokeWidth={3} /> Currently Live
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <ColorField label="Brand Color" value={brand} onChange={setBrand} />
        <ColorField label="Accent Color" value={accent} onChange={setAccent} />
      </div>

      <div
        className="mt-4 h-16 w-full rounded-xl"
        style={{ background: canApply ? `linear-gradient(120deg, ${brand} 0%, ${accent} 100%)` : undefined }}
      />

      <button
        onClick={() => onApply({ brand, accent })}
        disabled={disabled || !canApply}
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-vibe-violet disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles size={14} /> Apply Custom Theme
      </button>
    </div>
  );
}

export default function AppearancePage() {
  const { theme, customColors, setTheme, setCustomTheme } = useTheme();
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activePreset = THEME_PRESETS.find((p) => p.id === theme);
  const liveThemeName = theme === CUSTOM_THEME_ID ? "Custom" : activePreset?.name ?? THEME_PRESETS[0].name;

  async function applyTheme(preset: ThemePreset) {
    setSaving(true);
    try {
      await updateSiteAppearance({ theme: preset.id });
      setTheme(preset.id);
      setToast(`"${preset.name}" applied — live across the whole site`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Couldn't save the theme. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function applyCustomTheme(colors: CustomColors) {
    setSaving(true);
    try {
      await updateSiteAppearance({ theme: CUSTOM_THEME_ID, customBrand: colors.brand, customAccent: colors.accent });
      setCustomTheme(colors);
      setToast("Custom theme applied — live across the whole site");
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Couldn't save the theme. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl2 p-6 text-white shadow-pop"
        style={{ background: "linear-gradient(120deg, #0c1912 0%, #15101f 60%, #211731 100%)" }}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
            Appearance
          </span>
          <h1 className="mt-2 flex items-center gap-2 font-display text-xl font-semibold">
            <Palette size={18} /> Theme Studio
          </h1>
          <p className="mt-1 max-w-lg text-sm text-white/70">
            Switch the entire site&rsquo;s color palette — home, venues, booking flow, mobile and desktop — in a
            single tap, or invent your own brand color below.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold">
          Live theme: {liveThemeName}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_PRESETS.map((preset) => (
          <ThemeCard
            key={preset.id}
            preset={preset}
            active={preset.id === theme}
            disabled={saving}
            onApply={() => applyTheme(preset)}
          />
        ))}
      </div>

      <CustomThemeSection
        isActive={theme === CUSTOM_THEME_ID}
        initialColors={customColors}
        disabled={saving}
        onApply={applyCustomTheme}
      />

      <div className="rounded-xl2 border border-surface-border bg-white p-6 shadow-panel">
        <p className="mb-4 text-sm font-semibold text-ink">Live Preview — real components, current theme</p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white">
              <Star size={18} className="fill-current" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Cricket Arena</p>
              <p className="text-xs text-slate-500">4.8 · Bhawani Nagar</p>
            </div>
          </div>

          <button className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm">
            Book Now
          </button>

          <span className="inline-flex items-center rounded-full border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-600">
            Selected Filter Chip
          </span>

          <span className="inline-flex items-center rounded-full bg-accent-500/90 px-4 py-2.5 text-sm font-semibold text-white">
            Full — Status Badge
          </span>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
