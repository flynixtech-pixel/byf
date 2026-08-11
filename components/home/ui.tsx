"use client";

import { ArrowRight, Star, type LucideIcon } from "lucide-react";
import { type Venue } from "@/lib/venues";

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur-sm">
      <Star className="h-3 w-3 fill-current" aria-hidden />
      {rating.toFixed(1)}
    </span>
  );
}

export function StatusPill({ status }: { status: Venue["status"] }) {
  const styles: Record<Venue["status"], string> = {
    Available: "bg-emerald-500/90 text-white",
    "Filling Fast": "bg-brand-500/90 text-white",
    Full: "bg-accent-500/90 text-white",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
      {status}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  className = "",
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition-transform hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  onAction,
  icon: Icon,
  light,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  light?: boolean;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p
            className={`mb-2 text-xs font-bold uppercase tracking-[0.2em] ${
              light ? "text-brand-300" : "text-brand-600"
            }`}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className={`flex items-center gap-2 text-2xl font-extrabold sm:text-3xl ${
            light ? "text-white" : "text-slate-900"
          }`}
        >
          {title}
          {Icon && <Icon className="h-6 w-6 text-brand-500" aria-hidden />}
        </h2>
        {subtitle && (
          <p className={`mt-2 text-sm sm:text-base ${light ? "text-slate-300" : "text-slate-500"}`}>
            {subtitle}
          </p>
        )}
      </div>
      {actionLabel && (
        <button
          onClick={onAction}
          className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold transition ${
            light ? "text-brand-300 hover:text-brand-200" : "text-brand-600 hover:text-brand-700"
          }`}
        >
          {actionLabel} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
