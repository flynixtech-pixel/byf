"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save, Smartphone } from "lucide-react";
import { Toast } from "@/components/admin/Toast";
import { listAppVersions, upsertAppVersion } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { AppVersionConfig } from "@/lib/api/types";

type Draft = Omit<AppVersionConfig, "_id" | "updatedAt">;

function emptyDraft(platform: "ios" | "android"): Draft {
  return { platform, currentVersion: "1.0.0", minRequiredVersion: "1.0.0", downloadUrl: "", releaseNotes: "", forceUpdate: false };
}

export default function AppVersionPage() {
  const [ios, setIos] = useState<Draft>(emptyDraft("ios"));
  const [android, setAndroid] = useState<Draft>(emptyDraft("android"));
  const [saving, setSaving] = useState<"ios" | "android" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listAppVersions()
      .then((configs) => {
        const iosConfig = configs.find((c) => c.platform === "ios");
        const androidConfig = configs.find((c) => c.platform === "android");
        if (iosConfig) setIos(iosConfig);
        if (androidConfig) setAndroid(androidConfig);
      })
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load app version config"));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSave(platform: "ios" | "android") {
    const draft = platform === "ios" ? ios : android;
    setSaving(platform);
    try {
      const saved = await upsertAppVersion({
        platform,
        currentVersion: draft.currentVersion,
        minRequiredVersion: draft.minRequiredVersion,
        downloadUrl: draft.downloadUrl,
        releaseNotes: draft.releaseNotes,
        forceUpdate: draft.forceUpdate,
      });
      if (platform === "ios") setIos(saved);
      else setAndroid(saved);
      setToast(`${platform === "ios" ? "iOS" : "Android"} version config saved`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save config");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl2 p-6 text-white shadow-pop"
        style={{ background: "linear-gradient(120deg, #0c1912 0%, #15101f 60%, #211731 100%)" }}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
            Release Management
          </span>
          <h1 className="mt-2 flex items-center gap-2 font-display text-xl font-semibold">
            <Smartphone size={18} /> Mobile App Version Control
          </h1>
          <p className="mt-1 max-w-lg text-sm text-white/70">
            Admin panel se iOS aur Android dono app versions, minimum support aur force update rules manage karein.
          </p>
        </div>
        <button
          onClick={() => {
            refresh();
            setToast("Config refreshed");
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20"
        >
          <RefreshCw size={14} /> Refresh Config
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PlatformCard
          title="iOS Version Control"
          subtitle="App Store listing aur minimum supported iOS build yahan manage karein."
          gradient="from-sky-600 to-cyan-600"
          config={ios}
          endpoint="PUT /admin/app-version"
          onChange={(patch) => setIos((c) => ({ ...c, ...patch }))}
          onSave={() => handleSave("ios")}
          saving={saving === "ios"}
          saveLabel="Save iOS"
        />
        <PlatformCard
          title="Android Version Control"
          subtitle="Play Store release aur forced update threshold yahan update karein."
          gradient="from-emerald-600 to-teal-600"
          config={android}
          endpoint="PUT /admin/app-version"
          onChange={(patch) => setAndroid((c) => ({ ...c, ...patch }))}
          onSave={() => handleSave("android")}
          saving={saving === "android"}
          saveLabel="Save Android"
        />
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function PlatformCard({
  title,
  subtitle,
  gradient,
  config,
  endpoint,
  onChange,
  onSave,
  saving,
  saveLabel,
}: {
  title: string;
  subtitle: string;
  gradient: string;
  config: Draft;
  endpoint: string;
  onChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl2 border border-surface-border bg-white shadow-panel">
      <div className={`bg-gradient-to-r p-5 text-white ${gradient}`}>
        <p className="font-display font-semibold">{title}</p>
        <p className="mt-1 text-xs text-white/80">{subtitle}</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Current Version</label>
            <input
              value={config.currentVersion}
              onChange={(e) => onChange({ currentVersion: e.target.value })}
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Min Required Version</label>
            <input
              value={config.minRequiredVersion}
              onChange={(e) => onChange({ minRequiredVersion: e.target.value })}
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Download URL</label>
          <input
            value={config.downloadUrl}
            onChange={(e) => onChange({ downloadUrl: e.target.value })}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Release Notes</label>
          <textarea
            value={config.releaseNotes}
            onChange={(e) => onChange({ releaseNotes: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
          />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={config.forceUpdate} onChange={(e) => onChange({ forceUpdate: e.target.checked })} className="mt-1 accent-vibe-violet" />
          <span>
            <span className="font-semibold text-ink">Force Update</span>
            <p className="text-xs text-ink-faint">Enable karne par outdated app versions ko update mandatory dikhaya jayega.</p>
          </span>
        </label>

        <div className="flex items-center justify-between border-t border-surface-border pt-3">
          <p className="text-[11px] text-ink-faint">
            Save karte hi <code className="rounded bg-cream-200 px-1 py-0.5">{endpoint}</code> call trigger hoga.
          </p>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Saving..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
