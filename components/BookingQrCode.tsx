"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { bookingQrDataUrl } from "@/lib/ticket";
import type { Booking } from "@/lib/api/types";

/** Same QR the downloadable ticket prints (see lib/ticket.ts's shared bookingQrPayload) —
 * shown inline on the confirmation screen so a player can check in straight from the app
 * without needing to have downloaded anything. */
export function BookingQrCode({ booking }: { booking: Pick<Booking, "orderId" | "listingId"> }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    bookingQrDataUrl(booking, 176)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
    // Depend on primitive fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.orderId, booking.listingId]);

  return (
    <div className="mt-2 sm:mt-2.5 flex flex-col items-center gap-1 sm:gap-1.5 rounded-2xl border border-slate-100 bg-slate-50 p-2 sm:p-2.5">
      <div className="flex h-[125px] w-[125px] sm:h-[135px] sm:w-[135px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated data URL
          <img src={dataUrl} alt="Booking check-in QR code" className="h-full w-full object-contain" />
        ) : (
          <QrCode className="h-8 w-8 animate-pulse text-slate-300" />
        )}
      </div>
      <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Scan this QR at the venue for check-in.</p>
    </div>
  );
}
