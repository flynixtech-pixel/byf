export interface EventPriceTierLike {
  label: string;
  amount: number;
}

export function eventTierName(label: string): string {
  if (!label) return "Ticket";
  try {
    const parsed = JSON.parse(label) as { type?: unknown };
    if (typeof parsed.type === "string" && parsed.type.trim()) return parsed.type.trim();
  } catch {
    // Older events store a plain label rather than serialized tier metadata.
  }
  return label;
}

export function eventTierGst(label: string): number {
  try {
    const parsed = JSON.parse(label) as { gst?: unknown };
    if (typeof parsed.gst === "number" && Number.isFinite(parsed.gst)) {
      return Math.min(100, Math.max(0, parsed.gst));
    }
  } catch {
    // Legacy plain labels have no GST metadata.
  }
  return 0;
}

export function eventTierSummary(tiers: EventPriceTierLike[]): string {
  return tiers.map((tier) => `${eventTierName(tier.label)} ₹${tier.amount.toLocaleString("en-IN")}`).join(" · ");
}
