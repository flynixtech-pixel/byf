"use client";

import { useState } from "react";
import { requestMpinChange, confirmMpinChange } from "@/lib/api/vendor";

type Step = "idle" | "requesting" | "otp" | "create" | "confirm" | "success";

export function ProfileMpinResetModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    setLoading(true);
    setError("");
    try {
      await requestMpinChange();
      setStep("otp");
    } catch (err: any) {
      setError(typeof err?.describe === "function" ? err.describe() : err?.message || "Failed to request OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    if (newPin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await confirmMpinChange(otp, newPin);
      setStep("success");
    } catch (err: any) {
      setError(typeof err?.describe === "function" ? err.describe() : err?.message || "Failed to reset PIN.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-display font-bold text-ink mb-2">Reset mPIN</h2>

        {step === "idle" && (
          <>
            <p className="text-sm text-ink-soft mb-6">
              We'll send a 6-digit OTP to your registered email to verify your identity.
            </p>
            {error && <p className="text-rose-500 text-xs mb-4">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-200 rounded-lg">Cancel</button>
              <button onClick={handleRequest} disabled={loading} className="px-4 py-2 text-sm font-semibold text-white bg-vibe-violet hover:bg-vibe-violetSoft rounded-lg">
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </>
        )}

        {(step === "otp" || step === "create" || step === "confirm") && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">6-digit OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
                placeholder="000000"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">New 4-digit PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
                placeholder="****"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">Confirm 4-digit PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
                placeholder="****"
              />
            </div>

            {error && <p className="text-rose-500 text-xs">{error}</p>}

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-200 rounded-lg">Cancel</button>
              <button onClick={handleConfirm} disabled={loading || otp.length !== 6 || newPin.length !== 4 || confirmPin.length !== 4} className="px-4 py-2 text-sm font-semibold text-white bg-vibe-violet hover:bg-vibe-violetSoft rounded-lg disabled:opacity-50">
                {loading ? "Resetting..." : "Reset mPIN"}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-vibe-lime/20 mb-4">
              <svg className="h-6 w-6 text-vibe-limeDark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-ink-soft mb-6">Your dashboard mPIN has been successfully reset.</p>
            <button onClick={onClose} className="w-full px-4 py-2 text-sm font-semibold text-white bg-vibe-violet hover:bg-vibe-violetSoft rounded-lg">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
