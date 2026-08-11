import { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl2 border border-surface-border bg-surface-card shadow-panel ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
        <div>
          <h3 className="font-display font-semibold text-ink text-base">{title}</h3>
          {description && (
            <p className="text-xs text-ink-faint mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="px-5 sm:px-6 pb-6">{children}</div>
    </div>
  );
}

type BadgeTone = "success" | "pending" | "danger" | "neutral" | "info";

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "bg-lime-100 text-vibe-limeDark",
  pending: "bg-amber-100 text-vibe-amber",
  danger: "bg-rose-100 text-vibe-coral",
  neutral: "bg-cream-300 text-ink-soft",
  info: "bg-vibe-violet/10 text-vibe-violet",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#100725] via-[#220f4c] to-[#3a1a7c] px-5 py-5 sm:px-6 sm:py-6 text-white shadow-lg border border-purple-500/20">
      <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute left-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase shadow-sm backdrop-blur-md text-purple-200">
            {eyebrow}
          </span>
          <h1 className="mt-2 font-display text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-xs text-white/70 max-w-lg leading-relaxed">{description}</p>
          )}
        </div>
        {right && <div className="flex flex-wrap gap-2.5">{right}</div>}
      </div>
    </div>
  );
}
