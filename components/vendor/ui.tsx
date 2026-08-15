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
  icon,
  right,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-to-r from-[#200f50] via-[#2f1373] to-[#3c1490] px-6 py-4 sm:px-8 sm:py-6 text-white shadow-xl shadow-indigo-900/10 border border-[#442393]">
      <div className="absolute right-0 top-0 w-1/3 h-full bg-[url('/images/events-banner.png')] opacity-20 bg-cover bg-center mask-image:linear-gradient(to_left,white,transparent)" style={{ WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1), rgba(0,0,0,0))" }} />
      <div className="absolute left-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-5">
          {icon && (
             <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-full bg-white/10 border border-white/20 shadow-inner backdrop-blur-md">
                {icon}
             </div>
          )}
          <div>
            <span className="inline-flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-bold tracking-widest uppercase text-indigo-200">
              {eyebrow}
            </span>
            <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
            {description && (
              <p className="mt-1.5 text-[13px] text-indigo-100/80 max-w-lg leading-relaxed font-medium">{description}</p>
            )}
          </div>
        </div>
        {right && <div className="flex flex-wrap items-center gap-3">{right}</div>}
      </div>
    </div>
  );
}
