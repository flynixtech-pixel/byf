"use client";

import { useCallback, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";
import { PrimaryButton } from "../ui";
import { FieldLabel, inputClass, ModalShell } from "./ModalShell";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { customerRequestLoginOtp } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const GOOGLE_SIGN_IN_ENABLED = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function LoginModal({
  onClose,
  onLoggedIn,
  onSwitchToSignup,
}: {
  onClose: () => void;
  onLoggedIn: () => void;
  onSwitchToSignup: () => void;
}) {
  const { login, loginWithGoogle, loginWithEmailOtp } = useCustomerAuth();
  const [method, setMethod] = useState<"otp" | "email">("email");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const sendOtp = useCallback(async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await customerRequestLoginOtp(otpEmail.trim());
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [otpEmail]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (method === "otp") {
        if (!otpSent) {
          await sendOtp();
          return;
        }
        if (otpCode.trim().length !== 6) {
          setError("Enter the 6-digit code from your email.");
          return;
        }
        setError("");
        setSubmitting(true);
        try {
          await loginWithEmailOtp(otpEmail.trim(), otpCode.trim());
          onLoggedIn();
        } catch (err) {
          setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
        } finally {
          setSubmitting(false);
        }
        return;
      }
      if (!emailVal || !password) {
        setError("Enter both email and password.");
        return;
      }
      setError("");
      setSubmitting(true);
      try {
        await login(emailVal, password);
        onLoggedIn();
      } catch (err) {
        setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [method, otpSent, otpCode, otpEmail, sendOtp, loginWithEmailOtp, emailVal, password, login, onLoggedIn]
  );

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        setError("Google didn't return a credential. Please try again.");
        return;
      }
      setError("");
      setSubmitting(true);
      try {
        await loginWithGoogle(credentialResponse.credential);
        onLoggedIn();
      } catch (err) {
        setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [loginWithGoogle, onLoggedIn]
  );

  if (forgotPasswordOpen) {
    return (
      <ForgotPasswordModal
        onClose={() => setForgotPasswordOpen(false)}
        onReset={() => {
          setForgotPasswordOpen(false);
          setMethod("email");
        }}
      />
    );
  }

  return (
    <ModalShell onClose={onClose} title="Welcome back" subtitle="Login to continue your vibe.">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {(["otp", "email"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMethod(m);
              setError("");
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              method === m ? "bg-white text-brand-600 shadow" : "text-slate-500"
            }`}
          >
            {m === "otp" ? "Email OTP" : "Email & Password"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {method === "otp" ? (
          <div>
            <FieldLabel>Email</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={otpEmail}
                onChange={(e) => {
                  setOtpEmail(e.target.value);
                  setOtpSent(false);
                }}
                type="email"
                placeholder="you@example.com"
                className={inputClass}
              />
              {otpSent && (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={submitting}
                  className="whitespace-nowrap rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Resend code
                </button>
              )}
            </div>
            {otpSent && (
              <div className="mt-3">
                <FieldLabel>6-digit code</FieldLabel>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className={`${inputClass} tracking-[0.3em]`}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                value={emailVal}
                onChange={(e) => setEmailVal(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="mt-1 text-right text-xs font-semibold text-brand-600"
              >
                Forgot password?
              </button>
            </div>
          </>
        )}

        {error && <p className="text-xs font-semibold text-accent-600">{error}</p>}

        <PrimaryButton type="submit" className="w-full" disabled={submitting}>
          {method === "otp"
            ? submitting
              ? otpSent
                ? "Verifying…"
                : "Sending…"
              : otpSent
              ? "Verify & Login"
              : "Send code"
            : submitting
            ? "Logging in…"
            : "Login"}
        </PrimaryButton>

        {GOOGLE_SIGN_IN_ENABLED && (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or continue with{" "}
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed. Please try again.")}
                shape="pill"
                theme="outline"
                size="large"
                text="continue_with"
              />
            </div>
          </>
        )}

        <p className="text-center text-sm text-slate-500">
          New to Book Your Vibe?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-semibold text-brand-600"
          >
            Create an account
          </button>
        </p>
      </form>
    </ModalShell>
  );
}
