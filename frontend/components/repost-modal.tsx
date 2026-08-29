"use client";

import { Repeat2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiError, communitiesApi, postsApi, type Community, type Post } from "@/lib/api";

const PUBLIC_SLUG = "public";

export function RepostModal({
  post,
  onClose,
  onReposted,
}: {
  post: Post;
  onClose: () => void;
  onReposted: () => void;
}) {
  const [joined, setJoined] = useState<Community[]>([]);
  const [communitySlug, setCommunitySlug] = useState(PUBLIC_SLUG);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    communitiesApi
      .mine()
      .then(({ communities }) => setJoined(communities))
      .catch(() => {});
  }, []);

  const options = useMemo(
    () => [
      { slug: PUBLIC_SLUG, name: "Public" },
      ...joined.filter((c) => c.slug !== PUBLIC_SLUG).map((c) => ({ slug: c.slug, name: c.name })),
    ],
    [joined]
  );

  // Reposting a repost attaches to the primary post it already points to, not the
  // intermediate repost itself - no nested reposts. Also what gets previewed below, so
  // what you see here is what actually gets attached (the backend enforces this too).
  const target = post.repostOf ?? post;

  // A private community's posts can only ever be reshared back into that same community -
  // the backend rejects anything else, so lock the picker here too rather than let people
  // hit an error after filling out the form.
  const originCommunity = joined.find((c) => c.slug === target.communitySlug);
  const originIsPrivate = originCommunity?.visibility === "private";

  useEffect(() => {
    if (originIsPrivate) setCommunitySlug(target.communitySlug);
  }, [originIsPrivate, target.communitySlug]);

  async function handleRepost() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await postsApi.create({ communitySlug, body: caption.trim(), repostOfId: target.id });
      onReposted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Repost"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Repeat2 className="h-4 w-4 text-emerald-500" />
            Repost
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={4000}
          rows={2}
          placeholder="Add a caption (optional)..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
        />

        <div className="mt-2.5 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
          <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{target.authorHandle}</p>
          <p className="mt-0.5 line-clamp-3 w-full text-xs text-slate-500 dark:text-slate-400">
            {target.body || "(no caption)"}
          </p>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-500">Repost to</label>
          <select
            value={communitySlug}
            onChange={(e) => setCommunitySlug(e.target.value)}
            disabled={originIsPrivate}
            className="w-full rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            {originIsPrivate ? (
              <option value={target.communitySlug}>{originCommunity?.name ?? target.communitySlug}</option>
            ) : (
              options.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))
            )}
          </select>
          {originIsPrivate && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              This post is from a private community, so it can only be reposted within it.
            </p>
          )}
        </div>

        {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleRepost}
          disabled={isSubmitting}
          className="mt-3 w-full rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Reposting..." : "Repost"}
        </button>
      </div>
    </div>
  );
}
