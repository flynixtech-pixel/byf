"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { getMpinStatus, setMpin, verifyMpin, requestMpinChange, confirmMpinChange } from "@/lib/api/vendor";

type PinMode = "loading" | "create" | "create_confirm" | "enter" | "unlocked" | "forgot_requesting" | "forgot_otp" | "forgot_create" | "forgot_create_confirm";

/** Session flag so the MPIN is entered once, not on every dashboard. See VendorAuth logout, which clears it. */
export const MPIN_SESSION_KEY = "byv_vendor_mpin_ok";

/** A 4-digit MPIN gate. Renders `children` only once unlocked. Reuses the shared
 * vendor MPIN endpoints, so the same PIN works across the turf and events dashboards. */
export function MpinGate({
  title = "Partner Dashboard",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const [pinMode, setPinMode] = useState<PinMode>(() =>
    typeof window !== "undefined" && sessionStorage.getItem(MPIN_SESSION_KEY) === "1" ? "unlocked" : "loading"
  );
  const [inputPin, setInputPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pinError, setPinError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Already unlocked this session (see the lazy initial state) — skip the check so a
    // multi-vertical vendor enters the MPIN once and can flip between all their
    // dashboards (turf/food/coaches/events) without being re-prompted. Cleared on logout.
    if (typeof window !== "undefined" && sessionStorage.getItem(MPIN_SESSION_KEY) === "1") return;
    getMpinStatus()
      .then(({ hasPin }) => setPinMode(hasPin ? "enter" : "create"))
      .catch(() => setPinMode("create"));
  }, []);

  function handleDigit(d: string) {
    const targetLength = pinMode === "forgot_otp" ? 6 : 4;
    if (inputPin.length < targetLength) {
      const newPin = inputPin + d;
      setInputPin(newPin);
      if (newPin.length === targetLength) void processPin(newPin);
    }
  }

  function handleBackspace() {
    setInputPin((prev) => prev.slice(0, -1));
    setPinError("");
  }

  function unlock() {
    if (typeof window !== "undefined") sessionStorage.setItem(MPIN_SESSION_KEY, "1");
    setPinMode("unlocked");
  }

  async function handleForgotPin() {
    if (submitting) return;
    setSubmitting(true);
    setPinError("");
    setPinMode("forgot_requesting");
    try {
      await requestMpinChange();
      setPinMode("forgot_otp");
      setInputPin("");
    } catch (error) {
      const e = error as { describe?: () => string; message?: string };
      setPinError(typeof e?.describe === "function" ? e.describe() : e?.message || "Failed to request OTP.");
      setPinMode("enter");
    } finally {
      setSubmitting(false);
    }
  }

  async function processPin(pin: string) {
    if (submitting) return;
    setSubmitting(true);
    setPinError("");
    try {
      if (pinMode === "create") {
        setFirstPin(pin);
        setInputPin("");
        setPinMode("create_confirm");
      } else if (pinMode === "create_confirm") {
        if (pin !== firstPin) {
          setPinError("PINs do not match. Try again.");
          setInputPin("");
          setPinMode("create");
        } else {
          await setMpin(pin);
          unlock();
        }
      } else if (pinMode === "enter") {
        await verifyMpin(pin);
        unlock();
      } else if (pinMode === "forgot_otp") {
        setOtpCode(pin);
        setInputPin("");
        setPinMode("forgot_create");
      } else if (pinMode === "forgot_create") {
        setFirstPin(pin);
        setInputPin("");
        setPinMode("forgot_create_confirm");
      } else if (pinMode === "forgot_create_confirm") {
        if (pin !== firstPin) {
          setPinError("PINs do not match. Try again.");
          setInputPin("");
          setPinMode("forgot_create");
        } else {
          await confirmMpinChange(otpCode, pin);
          unlock();
        }
      }
    } catch (error) {
      const e = error as { describe?: () => string; message?: string };
      const msg = typeof e?.describe === "function" ? e.describe() : e?.message || "Something went wrong. Try again.";
      setPinError(pinMode === "enter" ? "Incorrect MPIN" : msg);
      setInputPin("");
      // On OTP fail, allow re-entry of OTP. If confirm fails, they retry the new PIN.
      if (pinMode === "forgot_create_confirm") setPinMode("forgot_create");
    } finally {
      setSubmitting(false);
    }
  }

  if (pinMode === "loading") return null;
  if (pinMode === "unlocked") return <>{children}</>;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-white"
      style={{ background: "linear-gradient(to bottom, #3b1d6e, #1e1040)" }}
    >
      <div className="bg-white/10 p-3 rounded-2xl mb-6">
        <Lock size={28} className="text-vibe-lime" />
      </div>
      <h1 className="text-2xl font-extrabold mb-2">{title}</h1>
      <p className="text-white/70 text-sm text-center max-w-xs mb-6">
        {pinMode === "create" || pinMode === "forgot_create"
          ? "Create a 4-digit PIN to secure your business analytics and reports."
          : pinMode === "create_confirm" || pinMode === "forgot_create_confirm"
          ? "Confirm your 4-digit PIN."
          : pinMode === "forgot_otp"
          ? "Enter the 6-digit OTP sent to your email."
          : pinMode === "forgot_requesting"
          ? "Sending OTP to your email..."
          : "Enter your 4-digit PIN to securely access business analytics and reports."}
      </p>

      {pinMode === "enter" && (
        <button
          onClick={handleForgotPin}
          disabled={submitting}
          className="text-vibe-lime text-sm mb-6 hover:underline"
        >
          Forgot PIN?
        </button>
      )}

      {pinError && <p className="text-rose-300 text-sm mb-4">{pinError}</p>}

      <div className="flex gap-4 mb-12">
        {Array.from({ length: pinMode === "forgot_otp" ? 6 : 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
              inputPin.length > i ? "bg-vibe-lime border-vibe-lime" : "border-white/30"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-x-8 gap-y-6 max-w-[280px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleDigit(n.toString())}
            className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl font-bold hover:bg-white/10 transition active:scale-95"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit("0")}
          className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl font-bold hover:bg-white/10 transition active:scale-95"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="w-16 h-16 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5 transition active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>
        </button>
      </div>
    </div>
  );
}
