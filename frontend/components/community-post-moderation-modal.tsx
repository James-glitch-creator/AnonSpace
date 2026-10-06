"use client";

import { useState } from "react";
import { ApiError, communitiesApi, type CommunityRule, type Post } from "@/lib/api";

export function CommunityPostModerationModal({
  post,
  communityName,
  rules,
  onClose,
  onDeleted,
}: {
  post: Post;
  communityName: string;
  rules: CommunityRule[];
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(action: "warn" | "delete") {
    if (!reason || (reason === "other" && !details.trim()) || isSubmitting) return;
    if (action === "delete" && !window.confirm("Delete this post and its comments permanently?")) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await communitiesApi.moderatePost(post.communitySlug, post.id, action, reason, details);
      if (action === "delete") {
        onDeleted(post.id);
        onClose();
      } else {
        setSuccess("Warning sent. The post is still visible.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const options = [
    { value: "off_topic", label: "Off-topic or unrelated post" },
    { value: "explicit_content", label: "Explicit content" },
    ...rules.filter((rule) => rule.title.trim()).map((rule) => ({
      value: `rule:${rule.title}`,
      label: `Rule: ${rule.title}`,
    })),
    { value: "other", label: "Other" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Moderate community post"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Moderate post in {communityName}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{post.body}</p>

        {success ? (
          <div className="mt-4">
            <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
            <button type="button" onClick={onClose} className="mt-4 rounded-full bg-cyan-600 px-5 py-2 text-sm font-semibold text-white">Done</button>
          </div>
        ) : (
          <>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="community-moderation-reason">Reason</label>
            <select
              id="community-moderation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Choose a reason</option>
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="community-moderation-details">
              Details {reason === "other" ? "(required)" : "(optional)"}
            </label>
            <textarea
              id="community-moderation-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Explain what the member should change"
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">A warning leaves the post visible. Deleting removes it and its comments.</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
              <button type="button" onClick={() => submit("warn")} disabled={!reason || (reason === "other" && !details.trim()) || isSubmitting} className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Warn member</button>
              <button type="button" onClick={() => submit("delete")} disabled={!reason || (reason === "other" && !details.trim()) || isSubmitting} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Delete post</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
