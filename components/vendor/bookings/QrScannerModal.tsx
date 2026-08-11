"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, QrCode, CheckCircle2, AlertTriangle, Keyboard } from "lucide-react";

/**
 * Scans the QR printed on a player's booking ticket and checks them in.
 *
 * The ticket QR (see lib/ticket.ts) encodes JSON: { orderId, listingId }.
 * Older/other tickets may encode the bare order id, so both are accepted.
 */

type Phase = "scanning" | "working" | "done" | "error";

/** Pull an order id out of whatever the QR encodes. */
export function parseTicketQr(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.orderId === "string" && obj.orderId.trim()) return obj.orderId.trim();
  } catch {
    // Not JSON — fall through to the bare-id form.
  }
  // Bare order id, e.g. "BYV-MRJFPFY1-24A07A"
  if (/^[A-Za-z0-9-]{6,40}$/.test(text)) return text;
  return null;
}

/** Pull a challenge code out of whatever the QR encodes (see the Poster's QR in
 * ChallengeFlow.tsx, which prints `{ challengeCode }`). Bare "CHALxxxx" codes work too. */
export function parseChallengeQr(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.challengeCode === "string" && obj.challengeCode.trim()) return obj.challengeCode.trim().toUpperCase();
  } catch {
    // Not JSON — fall through to the bare-code form.
  }
  if (/^CHAL[A-Z0-9]{3,10}$/i.test(text)) return text.toUpperCase();
  return null;
}

export function QrScannerModal({
  onClose,
  onCheckIn,
  onChallengeCheckIn,
}: {
  onClose: () => void;
  /** Resolve with a message on success; throw with a message on failure. */
  onCheckIn: (orderId: string) => Promise<string>;
  /** Same contract, for a scanned Challenge poster QR instead of a booking ticket. */
  onChallengeCheckIn?: (code: string) => Promise<string>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("scanning");
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState(false);
  const [manualId, setManualId] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const submit = useCallback(
    async (id: string, kind: "booking" | "challenge") => {
      if (lockRef.current) return;
      lockRef.current = true;
      stopCamera();
      setPhase("working");
      try {
        const msg = kind === "challenge" && onChallengeCheckIn ? await onChallengeCheckIn(id) : await onCheckIn(id);
        setMessage(msg);
        setPhase("done");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not check in this ticket.");
        setPhase("error");
      }
    },
    [onCheckIn, onChallengeCheckIn, stopCamera]
  );

  // Camera + decode loop. jsQR runs on frames pulled into an offscreen canvas.
  useEffect(() => {
    if (manual) return;
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        tick();
      } catch {
        // No camera / permission denied — manual entry is the fallback.
        setManual(true);
        setMessage("Camera unavailable. Enter the booking ID instead.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || cancelled) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const found = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
            if (found?.data) {
              const orderId = parseTicketQr(found.data);
              if (orderId) {
                void submit(orderId, "booking");
                return;
              }
              const challengeCode = parseChallengeQr(found.data);
              if (challengeCode) {
                void submit(challengeCode, "challenge");
                return;
              }
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [manual, submit, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  function handleClose() {
    stopCamera();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <QrCode size={16} className="text-emerald-600" />
            <h3 className="text-[13px] font-black text-slate-900">Scan Ticket</h3>
          </div>
          <button onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <X size={14} />
          </button>
        </div>

        <div className="p-5">
          {phase === "scanning" && !manual && (
            <>
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900">
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {/* Reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-2/3 w-2/3 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] font-medium text-slate-500">
                Point at the QR on the player&apos;s ticket. It scans automatically.
              </p>
              <button
                onClick={() => setManual(true)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-600"
              >
                <Keyboard size={12} /> Enter ID manually
              </button>
            </>
          )}

          {phase === "scanning" && manual && (
            <>
              {message && <p className="mb-2 text-center text-[10px] font-semibold text-amber-600">{message}</p>}
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Booking ID or Challenge Code</label>
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value.toUpperCase())}
                placeholder="BYV-XXXXXXXX-XXXXXX or CHALXXXX"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold outline-none focus:border-vibe-violet"
              />
              <button
                onClick={() => {
                  const challengeCode = parseChallengeQr(manualId);
                  if (challengeCode) {
                    void submit(challengeCode, "challenge");
                    return;
                  }
                  const id = parseTicketQr(manualId);
                  if (!id) {
                    setMessage("That doesn't look like a booking ID or challenge code.");
                    return;
                  }
                  void submit(id, "booking");
                }}
                className="mt-3 w-full rounded-xl bg-vibe-navy py-3 text-[11px] font-black uppercase tracking-wide text-white"
              >
                Check In
              </button>
            </>
          )}

          {phase === "working" && (
            <div className="py-10 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
              <p className="mt-3 text-[11px] font-bold text-slate-500">Checking in…</p>
            </div>
          )}

          {phase === "done" && (
            <div className="py-8 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <p className="mt-3 text-[13px] font-black text-slate-900">Checked In</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">{message}</p>
              <button onClick={handleClose} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-[11px] font-black uppercase tracking-wide text-white">
                Done
              </button>
            </div>
          )}

          {phase === "error" && (
            <div className="py-8 text-center">
              <AlertTriangle size={38} className="mx-auto text-rose-500" />
              <p className="mt-3 text-[13px] font-black text-slate-900">Couldn&apos;t check in</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">{message}</p>
              <button
                onClick={() => {
                  lockRef.current = false;
                  setMessage("");
                  setManualId("");
                  setPhase("scanning");
                }}
                className="mt-4 w-full rounded-xl bg-slate-100 py-3 text-[11px] font-black uppercase tracking-wide text-slate-600"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
