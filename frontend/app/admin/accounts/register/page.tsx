"use client";

import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminApi, ApiError } from "@/lib/api";

type Step = "details" | "otp" | "password";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200";

export default function RegisterAdminPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
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
      await adminApi.requestSignupOtp(email);
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
      const { ticket } = await adminApi.verifySignupOtp(email, code);
      setTicket(ticket);
      setStep("password");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleComplete(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.completeSignup(ticket, fullName, password);
      router.push("/admin/accounts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link
        href="/admin/accounts"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Admins
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {step === "details" && (
          <>
            <h1 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <UserPlus className="h-5 w-5" />
              Register Admin
            </h1>
            <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
              We&apos;ll email a 6-digit code to verify the address before the account is created.
            </p>

            <form className="space-y-4" onSubmit={handleRequestOtp}>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="eg. Jordan Lee"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eg. admin@example.com"
                  className={inputClass}
                />
              </div>

              {error && <p className="text-xs font-medium text-red-500">{error}</p>}

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
            <h1 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Check Their Email</h1>
            <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
              Enter the 6-digit code sent to{" "}
              <span className="text-slate-600 dark:text-slate-300">{email}</span>.
            </p>

            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
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
                  className={`${inputClass} text-center text-lg tracking-[0.5em] placeholder:tracking-normal`}
                />
              </div>

              {error && <p className="text-xs font-medium text-red-500">{error}</p>}

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
                  setStep("details");
                }}
                className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Use a different email
              </button>
            </form>
          </>
        )}

        {step === "password" && (
          <>
            <h1 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Set a Password</h1>
            <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
              Email verified. Choose a password for {fullName}&apos;s admin account.
            </p>

            <form className="space-y-4" onSubmit={handleComplete}>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter the password"
                  className={inputClass}
                />
              </div>

              {error && <p className="text-xs font-medium text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-cyan-500 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating account..." : "Create Admin Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
