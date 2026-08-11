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
    // Depend on the primitive fields the QR actually encodes, not the `booking` object
    // reference, so a parent re-render with an equal-but-new object doesn't re-generate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.orderId, booking.listingId]);

  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-[176px] w-[176px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not an optimizable remote image
          <img src={dataUrl} alt="Booking check-in QR code" width={176} height={176} />
        ) : (
          <QrCode className="h-10 w-10 animate-pulse text-slate-300" />
        )}
      </div>
      <p className="text-[11px] font-semibold text-slate-500">Scan this QR at the venue for check-in.</p>
    </div>
  );
}
