"use client";

import { useCallback, useState } from "react";
import { PrimaryButton } from "../ui";
import { FieldLabel, inputClass, ModalShell } from "./ModalShell";
import { customerForgotPassword, customerResetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export function ForgotPasswordModal({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
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
        setError("Enter your email address.");
        return;
      }
      setError("");
      setSubmitting(true);
      try {
        await customerForgotPassword(email.trim());
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
        await customerResetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
        setStep("done");
      } catch (err) {
        setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [email, otp, newPassword, confirmPassword]
  );

  if (step === "done") {
    return (
      <ModalShell onClose={onClose} title="Password reset" subtitle="You can now log in with your new password.">
        <PrimaryButton className="w-full" onClick={onReset}>
          Back to login
        </PrimaryButton>
      </ModalShell>
    );
  }

  if (step === "reset") {
    return (
      <ModalShell onClose={onClose} title="Enter the code" subtitle={`We emailed a 6-digit code to ${email}.`}>
        <form onSubmit={submitReset} className="flex flex-col gap-4">
          <div>
            <FieldLabel>6-digit code</FieldLabel>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className={`${inputClass} tracking-[0.3em]`}
            />
          </div>
          <div>
            <FieldLabel>New password</FieldLabel>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Confirm new password</FieldLabel>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
          {error && <p className="text-xs font-semibold text-accent-600">{error}</p>}
          <PrimaryButton type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Resetting…" : "Reset password"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setStep("request")}
            className="text-center text-xs font-semibold text-slate-500"
          >
            Use a different email
          </button>
        </form>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Forgot password?" subtitle="Enter your email and we'll send you a reset code.">
      <form onSubmit={requestCode} className="flex flex-col gap-4">
        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
        {error && <p className="text-xs font-semibold text-accent-600">{error}</p>}
        <PrimaryButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset code"}
        </PrimaryButton>
      </form>
    </ModalShell>
  );
}
