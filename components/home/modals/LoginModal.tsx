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
    <ModalShell
      onClose={onClose}
      title={
        <>
          Vibe Check <span className="text-brand-600">Passed</span> ✅
        </>
      }
      subtitle={
        <span className="relative inline-block">
          Time to get back on the court.
          <svg className="animate-draw-line absolute -bottom-2.5 left-0 w-20 h-3" preserveAspectRatio="none" viewBox="0 0 100 20">
            <defs>
              <linearGradient id="swoosh-gradient-login" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <path d="M0,15 Q50,20 100,5" fill="none" stroke="url(#swoosh-gradient-login)" strokeWidth="8" strokeLinecap="round"/>
          </svg>
        </span>
      }
      imagePanel={{ src: "/images/loginimage.png", alt: "Play. Book. Vibe." }}
    >
      <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1.5 backdrop-blur-sm">
        {(["otp", "email"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMethod(m);
              setError("");
            }}
            className={`rounded-xl py-2.5 text-sm font-bold transition-all duration-200 ${
              method === m ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
            }`}
          >
            {m === "otp" ? "Email OTP" : "Email & Password"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
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
                  className="whitespace-nowrap rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:bg-slate-900"
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
          <div className="mt-3 sm:mt-4">
            <div className="relative mb-4 sm:mb-6 flex items-center justify-center gap-4">
              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-slate-200 to-slate-200"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Or continue with</span>
              <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent via-slate-200 to-slate-200"></div>
            </div>
            <div className="flex w-full justify-center transform transition-transform hover:-translate-y-0.5">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed. Please try again.")}
                shape="pill"
                theme="outline"
                size="large"
                text="continue_with"
                width="100%"
              />
            </div>
          </div>
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
