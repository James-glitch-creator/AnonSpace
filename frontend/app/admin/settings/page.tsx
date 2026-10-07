"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import PasswordInput from "@/components/password-input";
import { AutoBanSettingsCard } from "@/components/admin/auto-ban-settings-card";
import { ApiError, authApi, getCurrentUser } from "@/lib/api";
import { setLanguage, useLanguage, useTranslate } from "@/lib/language";

function PasswordCard({ email }: { email?: string }) {
  const t = useTranslate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t("New passwords don't match."));
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("Password")}</h2>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
        {t("Change the password used to log in to this admin account.")}
      </p>

      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("Current password")}
          </label>
          <PasswordInput
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("New password")}
          </label>
          <PasswordInput
            required
            placeholder={t("At least 8 characters")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("Confirm new password")}
          </label>
          <PasswordInput
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
        {success && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("Password updated.")}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t(isSubmitting ? "Updating..." : "Update password")}
          </button>
          <Link
            href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
            className="text-xs font-medium text-slate-500 hover:text-cyan-600 hover:underline dark:text-slate-400 dark:hover:text-cyan-400"
          >
            {t("Forgot your current password?")}
          </Link>
        </div>
      </form>
    </div>
  );
}

function AdminLanguageCard() {
  const language = useLanguage();
  const t = useTranslate();
  const optionClass = (active: boolean) => `flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold ${active ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`;
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("Language")}</h2>
    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{t("Choose the language used in AnonSpace on this device.")}</p>
    <div className="mt-3 flex gap-2">
      <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")} className={optionClass(language === "en")}>{t("English")}</button>
      <button type="button" lang="my" aria-pressed={language === "my"} onClick={() => setLanguage("my")} className={optionClass(language === "my")}>{t("Burmese")}</button>
    </div>
  </div>;
}

export default function AdminSettingsPage() {
  const t = useTranslate();
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setEmail(user?.email);
      setIsSuperAdmin(user?.role === "superadmin");
    });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t("Settings")}</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t(isSuperAdmin ? "Manage your account and platform moderation rules" : "Manage your admin account")}
        </p>
      </div>

      {isSuperAdmin && <AutoBanSettingsCard />}
      <AdminLanguageCard />
      <PasswordCard email={email} />
    </div>
  );
}
