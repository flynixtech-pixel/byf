"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * A back control for secondary vendor pages reached from the More menu.
 *
 * On mobile these pages had no visible way back, and the hardware Back button
 * would jump the vendor clean out of the panel ("back krte hi direct bahar a
 * jaate h"). This gives an explicit affordance that returns to the previous page,
 * falling back to a sensible route when there's nothing to go back to.
 */
export function PageBack({ label = "Back", fallback = "/vendor/more" }: { label?: string; fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white px-3 py-1.5 text-xs font-bold text-ink-soft transition hover:bg-cream-300"
    >
      <ArrowLeft size={14} /> {label}
    </button>
  );
}
