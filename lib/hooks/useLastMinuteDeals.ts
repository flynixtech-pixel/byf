"use client";

import { useEffect, useState } from "react";
import { getLastMinuteDeals, type LastMinuteDeal } from "@/lib/api/deals";

/** Matches the notification bell's cadence — the only other "live" polling precedent
 * in this app. A vendor edit/cancel, or another player booking the slot, shows up here
 * within one cycle. */
const POLL_MS = 9000;

/** Live Last Minute Deals: freshly polled from the backend (which already excludes
 * booked/expired/cancelled boosts), and additionally dropped client-side the instant
 * a slot's own start time passes, so a card never lingers past its countdown hitting zero. */
export function useLastMinuteDeals(): { deals: LastMinuteDeal[]; loading: boolean } {
  const [deals, setDeals] = useState<LastMinuteDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      getLastMinuteDeals()
        .then((fresh) => {
          if (!cancelled) setDeals(fresh);
        })
        .catch(() => {
          // A failed poll keeps showing the last known deals rather than flashing empty.
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setDeals((prev) => prev.filter((d) => new Date(d.slotStartsAt).getTime() > Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { deals, loading };
}
