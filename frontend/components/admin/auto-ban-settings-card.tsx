"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminApi, ApiError, type AutoBanSettings } from "@/lib/api";

export function AutoBanSettingsCard() {
  const [saved, setSaved] = useState<AutoBanSettings | null>(null);
  const [threshold, setThreshold] = useState("");
  const [minVotes, setMinVotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi.getAutoBanSettings()
      .then(({ settings }) => {
        if (!active) return;
        setSaved(settings);
        setThreshold(String(settings.thresholdPercent));
        setMinVotes(String(settings.minVotes));
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Could not load auto-ban settings. Reload the page to try again.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!saved || isSaving) return;
    setError(null);
    setSuccess(false);
    const settings = { thresholdPercent: Number(threshold), minVotes: Number(minVotes) };
    if (!Number.isInteger(settings.thresholdPercent) || settings.thresholdPercent < 1 || settings.thresholdPercent > 100) {
      setError("Downvote threshold must be a whole number between 1 and 100.");
      return;
    }
    if (!Number.isInteger(settings.minVotes) || settings.minVotes < 1 || settings.minVotes > 1000000) {
      setError("Minimum votes must be a whole number between 1 and 1,000,000.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await adminApi.updateAutoBanSettings(settings);
      setSaved(result.settings);
      setThreshold(String(result.settings.thresholdPercent));
      setMinVotes(String(result.settings.minVotes));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save auto-ban settings.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200";
  const unchanged = saved?.thresholdPercent === Number(threshold) && saved?.minVotes === Number(minVotes);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Automatic bans</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Superadmin only. Set the downvote percentage and minimum total votes required to automatically ban a post or comment.
      </p>
      {isLoading && <p className="mt-3 text-sm text-slate-500" role="status">Loading settings...</p>}
      {saved && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Current rule: at least {saved.thresholdPercent}% downvotes after {saved.minVotes} total votes.
        </p>
      )}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <fieldset disabled={isLoading || isSaving || !saved} className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="auto-ban-threshold" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Downvote threshold (%)</label>
            <input id="auto-ban-threshold" type="number" required min={1} max={100} step={1} value={threshold}
              onChange={(event) => { setThreshold(event.target.value); setSuccess(false); }} className={inputClass} />
          </div>
          <div>
            <label htmlFor="auto-ban-min-votes" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Minimum total votes</label>
            <input id="auto-ban-min-votes" type="number" required min={1} max={1000000} step={1} value={minVotes}
              onChange={(event) => { setMinVotes(event.target.value); setSuccess(false); }} className={inputClass} />
          </div>
        </fieldset>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Total votes means upvotes plus downvotes. Changes apply on the next vote check; existing bans stay in place.
        </p>
        {error && <p role="alert" className="text-xs font-medium text-red-500">{error}</p>}
        {success && <p role="status" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Auto-ban settings saved.</p>}
        <button type="submit" disabled={!saved || isLoading || isSaving || unchanged}
          className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50">
          {isSaving ? "Saving..." : "Save auto-ban settings"}
        </button>
      </form>
    </section>
  );
}
