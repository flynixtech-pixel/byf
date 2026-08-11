/**
 * Last Min Boost — client mirror of the backend rule.
 *
 * A listing carries zero or more rules, each scoped to one Sport + Court + Slot (or every
 * court hosting that sport, when `courtId` is omitted) — so two courts can run independent
 * boosts at once. The discount is never baked into slot prices; it's derived here on every
 * render so the trigger window actually holds: a 6:00 PM slot with a 30-minute trigger
 * shows full price at 5:29 PM and the deal at 5:30 PM.
 *
 * Must stay in step with backend/src/services/lastMinBoost.service.ts — the backend
 * re-checks all of this at booking time, so drift shows up as a price mismatch.
 */

export interface LastMinuteBoostRule {
  id: string;
  enabled: boolean;
  /** Sport label the boost applies to. */
  game: string;
  /** Specific court this rule targets. Absent = every active court hosting `game`. */
  courtId?: string;
  /** Slot start times in "HH:mm" the vendor opted into. */
  slotStarts: string[];
  discountPct: number;
  triggerMins: number;
}

export const BOOST_MIN_PCT = 10;
export const BOOST_MAX_PCT = 30;

/** Preset choices shown in the vendor wizard; a custom value is also allowed inside the band. */
export const BOOST_DISCOUNT_PRESETS = [10, 15, 20, 25, 30];
export const BOOST_TRIGGER_OPTIONS = [10, 15, 20, 30, 45, 60];

export function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function clampBoostPct(pct: number): number {
  return Math.min(BOOST_MAX_PCT, Math.max(BOOST_MIN_PCT, Math.round(pct)));
}

/** Price after the boost, never below ₹1. */
export function boostedPrice(basePrice: number, discountPct: number): number {
  return Math.max(1, Math.round((basePrice * (100 - clampBoostPct(discountPct))) / 100));
}

/**
 * Whether `now` is inside the deal window [start - triggerMins, start). Computed on a
 * 24-hour circle so a 00:30 slot with a 60-minute trigger opens at 23:30 the night before.
 */
export function isWindowOpen(slotStart: string, triggerMins: number, nowMinutes: number): boolean {
  const start = toMinutes(slotStart);
  const opensAt = start - triggerMins;
  if (opensAt < 0) return nowMinutes >= opensAt + 1440 || nowMinutes < start;
  return nowMinutes >= opensAt && nowMinutes < start;
}

/**
 * Whether one rule covers this slot at all — enabled, the slot was opted in, the sport
 * matches, and (if the rule targets a specific court) the court matches too. A rule with
 * no sport/court named is a lenient match; a court-specific rule with no court given is
 * NOT a match, since that would silently apply a single-court discount venue-wide.
 */
export function boostCoversSlot(
  rule: LastMinuteBoostRule | undefined | null,
  slotStart: string,
  sport?: string,
  courtId?: string
): boolean {
  if (!rule?.enabled) return false;
  if (!rule.slotStarts?.includes(slotStart)) return false;
  if (rule.game && sport && rule.game !== sport) return false;
  if (rule.courtId && rule.courtId !== courtId) return false;
  return true;
}

/**
 * The rule currently discounting this slot, or undefined when no deal is running. When
 * several rules match, the court-specific one wins, then the higher discount.
 */
export function findActiveBoostRule(
  rules: LastMinuteBoostRule[] | undefined | null,
  slotStart: string,
  nowMinutes: number,
  sport?: string,
  courtId?: string
): LastMinuteBoostRule | undefined {
  const matching = (rules ?? []).filter(
    (rule) => boostCoversSlot(rule, slotStart, sport, courtId) && isWindowOpen(slotStart, rule.triggerMins, nowMinutes)
  );
  if (matching.length === 0) return undefined;
  matching.sort((a, b) => {
    if (!!a.courtId !== !!b.courtId) return a.courtId ? -1 : 1;
    return b.discountPct - a.discountPct;
  });
  return matching[0];
}

/** Live discount for a slot, or 0 when no deal is running. Callers must check the slot is unbooked. */
export function activeBoostPct(
  rules: LastMinuteBoostRule[] | undefined | null,
  slotStart: string,
  nowMinutes: number,
  sport?: string,
  courtId?: string
): number {
  const rule = findActiveBoostRule(rules, slotStart, nowMinutes, sport, courtId);
  return rule ? clampBoostPct(rule.discountPct) : 0;
}

/** Minutes since midnight for a Date, in the viewer's local clock (venues are sold in IST). */
export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
