"use client";

import { Lock, ShieldCheck, VenetianMask } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, authApi } from "@/lib/api";

type Step = "email" | "otp" | "password";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.requestSignupOtp(email);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { ticket } = await authApi.verifySignupOtp(email, code);
      setTicket(ticket);
      setStep("password");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.completeSignup(ticket, password);
      router.push("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl md:grid-cols-2">
        <div className="flex flex-col justify-center gap-6 p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30">
            <VenetianMask className="h-6 w-6 text-slate-950" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight text-white">
              Speak Freely.
              <br />
              <span className="text-cyan-400">Stay Anonymous.</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Join millions who trust AnonSpace to protect their identity while sharing what
              matters most.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-cyan-500" /> End-to-end encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" /> Zero-knowledge
            </span>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/60 p-8 md:border-l md:border-t-0">
          {step === "email" && (
            <>
              <h2 className="mb-1 text-lg font-bold text-white">Create Your Account</h2>
              <p className="mb-6 text-xs text-slate-500">
                We&apos;ll email you a 6-digit code to verify it&apos;s really you. You&apos;ll
                get a random anonymous name automatically &mdash; no need to pick one.
              </p>

              <form className="space-y-4" onSubmit={handleRequestOtp}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="eg. hi@gmail.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  />
                </div>

                {error && <p className="text-xs font-medium text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-cyan-500 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Sending code..." : "Send Verification Code"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="mb-1 text-lg font-bold text-white">Check Your Email</h2>
              <p className="mb-6 text-xs text-slate-500">
                Enter the 6-digit code we sent to <span className="text-slate-300">{email}</span>.
              </p>

              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-center text-lg tracking-[0.5em] text-slate-200 outline-none placeholder:tracking-normal placeholder:text-slate-600 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  />
                </div>

                {error && <p className="text-xs font-medium text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-cyan-500 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Verifying..." : "Verify Code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCode("");
                    setStep("email");
                  }}
                  className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-300"
                >
                  Use a different email
                </button>
              </form>
            </>
          )}

          {step === "password" && (
            <>
              <h2 className="mb-1 text-lg font-bold text-white">Set Your Password</h2>
              <p className="mb-6 text-xs text-slate-500">
                Email verified. Choose a password to finish creating your account.
              </p>

              <form className="space-y-4" onSubmit={handleCompleteSignup}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 8 characters"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  />
                </div>

                {error && <p className="text-xs font-medium text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-cyan-500 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-cyan-400 hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
