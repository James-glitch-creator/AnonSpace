"use client";

import { CircleCheck, Flag, X } from "lucide-react";
import { useState } from "react";
import { ApiError, reportsApi, type ReportTargetType } from "@/lib/api";

const REASONS = [
  "Spam or scam",
  "Harassment or hate speech",
  "Misinformation",
  "Illegal content",
  "Off-topic",
  "Other",
];

export function ReportButton({
  targetType,
  targetId,
  targetLabel,
  variant = "pill",
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  variant?: "pill" | "menu-item";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setReason(null);
    setDetails("");
    setError(null);
  }

  const needsDetails = reason === "Other";

  async function submit() {
    if (!reason || isSubmitting) return;
    if (needsDetails && details.trim() === "") return;
    setIsSubmitting(true);
    setError(null);
    try {
      await reportsApi.submit(targetType, targetId, reason, details);
      setSubmitted(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return variant === "menu-item" ? (
      <p className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <CircleCheck className="h-4 w-4" />
        Reported
      </p>
    ) : (
      <span className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CircleCheck className="h-4 w-4" />
        Reported
      </span>
    );
  }

  return (
    <>
      {variant === "menu-item" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Report this ${targetType}`}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Flag className="h-4 w-4" />
          Report
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Report this ${targetType}`}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
        >
          <Flag className="h-4 w-4" />
          Report
        </button>
      )}

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
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Report this {targetType}
              </h2>
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
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all duration-200 ${
                    reason === r
                      ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-cyan-500"
                  />
                  {r}
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={needsDetails ? "Describe the reason for this report..." : "Add any extra context (optional)"}
              rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
            {needsDetails && (
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Required when reporting for another reason.
              </p>
            )}

            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              Reports go to human moderators for a legality review only — this does not remove the
              content by itself. Ordinary downvotes still handle everything else.
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
                {isSubmitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
