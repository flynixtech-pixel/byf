import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
        <p className="mt-0.5 text-xs text-ink-faint">{description}</p>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-surface-border bg-white py-20 text-center shadow-panel">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-vibe-amber">
          <Construction size={20} />
        </span>
        <p className="font-display font-semibold text-ink">Coming soon</p>
        <p className="max-w-sm text-xs text-ink-faint">
          This section isn&apos;t wired up yet — it&apos;ll activate once the backend API for it is connected.
        </p>
      </div>
    </div>
  );
}
