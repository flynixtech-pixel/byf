import { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "violet",
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent?: "violet" | "lime" | "amber" | "coral";
}) {
  const accentMap = {
    violet: "bg-vibe-violet/10 text-vibe-violet",
    lime: "bg-lime-100 text-vibe-limeDark",
    amber: "bg-amber-100 text-vibe-amber",
    coral: "bg-rose-100 text-vibe-coral",
  } as const;

  const barMap = {
    violet: "bg-vibe-violet",
    lime: "bg-vibe-lime",
    amber: "bg-vibe-amber",
    coral: "bg-vibe-coral",
  } as const;

  return (
    <div className="relative overflow-hidden rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-panel">
      <span className={`absolute top-0 left-0 h-1 w-full ${barMap[accent]}`} />
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
          {label}
        </p>
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-faint">{hint}</p>
    </div>
  );
}
