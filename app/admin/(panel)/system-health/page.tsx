"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Cpu, Database, MemoryStick } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { getSystemHealth } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { SystemHealth } from "@/lib/api/types";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSystemHealth()
      .then(setHealth)
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load system health"));
  }, []);

  const isHealthy = health?.database.state === "connected";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
          <Activity size={20} className="text-vibe-violet" /> System Health
        </h1>
        <p className="mt-0.5 text-xs text-ink-faint">Live status of the API server and its database connection.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl2 border border-vibe-coral/30 bg-rose-50 p-4 text-sm text-vibe-coral">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {health && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isHealthy ? "bg-lime-100 text-vibe-limeDark" : "bg-rose-100 text-vibe-coral"}`}>
                <CheckCircle2 size={18} />
              </span>
              <div>
                <p className="font-semibold text-ink">Book Your Vibe API</p>
                <p className="text-xs text-ink-faint">Main Service</p>
              </div>
            </div>
            <Badge tone={isHealthy ? "success" : "danger"}>{isHealthy ? "Operational" : "Degraded"}</Badge>
            <div className="text-xs text-ink-faint">
              <p className="uppercase tracking-wide">Timestamp</p>
              <p className="font-semibold text-ink">{new Date(health.timestamp).toLocaleString("en-IN")}</p>
            </div>
            <div className="text-xs text-ink-faint">
              <p className="uppercase tracking-wide">Node Version</p>
              <p className="font-semibold text-ink">{health.nodeVersion}</p>
            </div>
          </div>

          <div>
            <p className="mb-3 font-display font-semibold text-ink">Runtime</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile icon={<Clock size={15} />} label="Uptime" value={formatUptime(health.uptimeSeconds)} />
              <StatTile icon={<Cpu size={15} />} label="Heap Used" value={formatBytes(health.memory.heapUsed)} />
              <StatTile icon={<MemoryStick size={15} />} label="Heap Total" value={formatBytes(health.memory.heapTotal)} />
              <StatTile icon={<MemoryStick size={15} />} label="RSS Memory" value={formatBytes(health.memory.rss)} />
            </div>
          </div>

          <div>
            <p className="mb-3 font-display font-semibold text-ink">Database</p>
            <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={16} className={isHealthy ? "text-vibe-limeDark" : "text-vibe-coral"} />
                  <div>
                    <p className="font-semibold text-ink">{health.database.name || "—"}</p>
                    <p className="text-xs text-ink-faint">{health.database.host || "—"}</p>
                  </div>
                </div>
                <Badge tone={isHealthy ? "success" : "danger"}>{health.database.state}</Badge>
              </div>
            </div>
          </div>
        </>
      )}

      {!health && !error && <div className="rounded-xl2 border border-surface-border bg-white p-10 text-center text-sm text-ink-faint">Loading system health...</div>}
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {icon} {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
