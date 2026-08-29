"use client";

import { Ban, CircleCheck, X } from "lucide-react";
import { useState } from "react";
import { adminApi, ApiError, MODERATION_REASONS, type BanTargetType } from "@/lib/api";

const TARGET_LABELS: Record<BanTargetType, string> = {
  post: "post",
  comment: "comment",
  user: "account",
  community: "community",
};

/**
 * Bans a post, comment, account, or community straight from the admin panel - no report
 * needed first. Same reason list Report uses (see ReportButton), so a ban log always
 * reads in terms a user's report would have used too.
 */
export function BanButton({
  targetType,
  targetId,
  targetLabel,
  variant = "pill",
  onBanned,
}: {
  targetType: BanTargetType;
  /** The target's id, except for communities - see adminApi.ban. */
  targetId: string;
  targetLabel: string;
  variant?: "pill" | "menu-item" | "icon";
  /** Fired once the ban actually goes through, so the parent can drop the target from a
   *  list or update its status badge. */
  onBanned?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = TARGET_LABELS[targetType];
  const needsDetails = reason === "Other";

  function close() {
    setOpen(false);
    setReason(null);
    setDetails("");
    setError(null);
  }

  async function submit() {
    if (!reason || isSubmitting) return;
    if (needsDetails && details.trim() === "") return;
    setIsSubmitting(true);
    setError(null);
    try {
      await adminApi.ban(targetType, targetId, reason, details);
      setSubmitted(true);
      setOpen(false);
      onBanned?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return variant === "menu-item" ? (
      <p className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-rose-600 dark:text-rose-400">
        <CircleCheck className="h-4 w-4" />
        Banned
      </p>
    ) : (
      <span
        className={`flex items-center gap-1.5 text-rose-600 dark:text-rose-400 ${
          variant === "icon" ? "h-7 w-7 items-center justify-center" : "rounded-full px-3 py-1.5 text-xs font-medium"
        }`}
      >
        <CircleCheck className="h-4 w-4" />
        {variant !== "icon" && "Banned"}
      </span>
    );
  }

  const triggerClass =
    variant === "menu-item"
      ? "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition-all duration-200 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
      : variant === "icon"
        ? "flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
        : "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ban this ${label}`}
        title={variant === "icon" ? `Ban this ${label}` : undefined}
        className={triggerClass}
      >
        <Ban className="h-4 w-4" />
        {variant !== "icon" && "Ban"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Ban this {label}</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 truncate text-xs text-slate-400 dark:text-slate-500">
              &ldquo;{targetLabel}&rdquo;
            </p>

            <div className="space-y-1.5">
              {MODERATION_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all duration-200 ${
                    reason === r
                      ? "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-500/10 dark:text-rose-400"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="ban-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      if (r !== "Other") setDetails("");
                    }}
                    className="accent-rose-500"
                  />
                  {r}
                </label>
              ))}
            </div>

            {needsDetails && (
              <>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe the reason for this ban..."
                  rows={2}
                  className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Required when banning for another reason.
                </p>
              </>
            )}

            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              This bans the {label} immediately and can&apos;t be undone from the admin panel.
              {targetType === "user" && " They'll be logged out and can't log back in."}
            </p>

            {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-full border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason || isSubmitting || (needsDetails && details.trim() === "")}
                onClick={submit}
                className="flex-1 rounded-full bg-rose-500 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Banning..." : `Ban ${label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
