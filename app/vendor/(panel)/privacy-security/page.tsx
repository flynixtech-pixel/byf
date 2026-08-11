"use client";

import { useState } from "react";
import { Lock, Shield, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { requestMpinChange, confirmMpinChange } from "@/lib/api/vendor";

export default function PrivacySecurityPage() {
  const [step, setStep] = useState<"initial" | "otp" | "success">("initial");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  async function handleRequestOtp() {
    setLoading(true);
    setError("");
    try {
      await requestMpinChange();
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
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
      setError(err.message || "Invalid OTP or failed to change PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Shield className="text-vibe-violet" /> Privacy & Security
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account security and authentication methods.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
            <Lock size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Dashboard MPIN</h2>
            <p className="text-sm text-slate-500 mt-1">
              Your 4-digit MPIN protects your sensitive business reports and analytics. You can change it anytime using email OTP verification.
            </p>
          </div>
        </div>

        {step === "initial" && (
          <div>
            {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold mb-4">{error}</div>}
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="bg-vibe-violet hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-sm font-bold transition flex items-center gap-2 disabled:opacity-50"
            >
              <Mail size={16} /> {loading ? "Sending OTP..." : "Change MPIN"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <form onSubmit={handleChangePin} className="max-w-xs space-y-4">
            {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold">{error}</div>}
            
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Enter OTP from Email</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-vibe-violet"
                placeholder="6-digit code"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">New 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.5em] font-bold text-center outline-none focus:border-vibe-violet"
                placeholder="••••"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Confirm New PIN</label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.5em] font-bold text-center outline-none focus:border-vibe-violet"
                placeholder="••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-vibe-violet hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update MPIN"} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {step === "success" && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3">
            <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-800">MPIN Updated Successfully</h3>
              <p className="text-sm text-emerald-600 mt-1">Your new MPIN is now active. Use it the next time you access the dashboard.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
