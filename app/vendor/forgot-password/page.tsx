"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { vendorForgotPassword, vendorResetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function VendorForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) {
        setError("Enter your registered email address.");
        return;
      }
      setError("");
      setSubmitting(true);
      try {
        await vendorForgotPassword(email.trim());
        setStep("reset");
      } catch (err) {
        setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [email]
  );

  const submitReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (otp.trim().length !== 6) {
        setError("Enter the 6-digit code from your email.");
        return;
      }
      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setError("");
      setSubmitting(true);
      try {
        await vendorResetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
        setStep("done");
      } catch (err) {
        setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [email, otp, newPassword, confirmPassword]
  );

  return (
    <main className="min-h-screen bg-[#f6f3ea] px-6 py-12 text-[#10241a] sm:px-12">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#e4ded0] bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#3f7d3f]">Vendor Access</p>
        <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
          Reset your partner password
        </h1>

        {step === "done" ? (
          <>
            <p className="mt-3 text-sm leading-6 text-[#3f5449]">
              Your password has been reset. You can now log in with your new password.
            </p>
            <Link
              href="/vendor/login"
              className="mt-8 inline-flex rounded-full bg-[#0c1912] px-5 py-3 text-sm font-bold text-[#a6ff3c]"
            >
              Back to login
            </Link>
          </>
        ) : step === "reset" ? (
          <form onSubmit={submitReset} className="mt-6 space-y-4">
            <p className="text-sm text-[#3f5449]">We emailed a 6-digit code to {email}.</p>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[#3f5449]">6-digit code</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="mt-2 w-full rounded-xl border border-[#e4ded0] bg-white px-4 py-3 font-mono text-sm tracking-[0.3em] text-[#10241a] outline-none focus:border-[#a6ff3c]"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[#3f5449]">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl border border-[#e4ded0] bg-white px-4 py-3 text-sm text-[#10241a] outline-none focus:border-[#a6ff3c]"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[#3f5449]">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl border border-[#e4ded0] bg-white px-4 py-3 text-sm text-[#10241a] outline-none focus:border-[#a6ff3c]"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#0c1912] py-3 text-sm font-bold text-[#a6ff3c] transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Resetting…" : "Reset password"}
            </button>
            <button
              type="button"
              onClick={() => setStep("request")}
              className="w-full text-center text-xs font-bold text-[#3f5449]"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-[#3f5449]">
              Enter the email address on your vendor account and we&rsquo;ll send you a reset code.
            </p>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[#3f5449]">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="vendor@bookyourvibes.com"
                className="mt-2 w-full rounded-xl border border-[#e4ded0] bg-white px-4 py-3 text-sm text-[#10241a] outline-none focus:border-[#a6ff3c]"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#0c1912] py-3 text-sm font-bold text-[#a6ff3c] transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send reset code"}
            </button>
          </form>
        )}

        <div className="mt-8 flex items-center gap-3">
          <Link href="/vendor/login" className="rounded-full border border-[#0c1912] px-5 py-3 text-sm font-bold text-[#0c1912]">
            Back to login
          </Link>
          <Link href="/vendor/register" className="rounded-full border border-[#e4ded0] px-5 py-3 text-sm font-bold text-[#3f5449]">
            Register instead
          </Link>
        </div>
      </div>
    </main>
  );
}
