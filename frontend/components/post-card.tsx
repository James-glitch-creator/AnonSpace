"use client";

import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  MessageSquare,
  MoreVertical,
  Pin,
  PinOff,
  Repeat2,
  Trash2,
  VenetianMask,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, ApiError, communitiesApi, getCurrentUser, isModerator, postsApi, type Post } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { BanButton } from "./admin/ban-button";
import { PhotoCarousel } from "./photo-carousel";
import { ReportButton } from "./report-button";
import { RepostModal } from "./repost-modal";
import { ShareMenu } from "./share-menu";
import { UserHandleMenu } from "./user-handle-menu";

// A "line" here is whatever the author actually pressed Enter to create, not a CSS-wrapped
// visual row - counting real newlines instead of relying on the browser's line-wrapping is
// what makes this predictable across card widths and font sizes.
const PREVIEW_MAX_LINES = 5;
const PREVIEW_MAX_WORDS_PER_LINE = 40;
// Guards the pathological case a plain word cap can't: a "word" that's actually one huge
// unbroken run of characters (no spaces at all) still counts as a single word, so on its
// own a word cap wouldn't shorten it. Any individual word gets hard-capped too.
const PREVIEW_MAX_WORD_CHARS = 60;

function truncateLine(line: string): { text: string; isTruncated: boolean } {
  const words = line.split(/\s+/).filter(Boolean);
  let isTruncated = words.length > PREVIEW_MAX_WORDS_PER_LINE;

  const kept = words.slice(0, PREVIEW_MAX_WORDS_PER_LINE).map((word) => {
    if (word.length <= PREVIEW_MAX_WORD_CHARS) return word;
    isTruncated = true;
    return word.slice(0, PREVIEW_MAX_WORD_CHARS);
  });

  return { text: kept.join(" "), isTruncated };
}

/** Feed-card preview of a post body: capped to the author's first 5 lines (plus a
 *  per-line word/word-length cap) so the card's width and height stay predictable no
 *  matter what was posted, while still preserving the line breaks they actually typed. */
function previewBody(body: string): { text: string; isTruncated: boolean } {
  const rawLines = body.split("\n");
  const isTooManyLines = rawLines.length > PREVIEW_MAX_LINES;
  const lines = rawLines.slice(0, PREVIEW_MAX_LINES).map(truncateLine);

  return {
    text: lines.map((l) => l.text).join("\n"),
    isTruncated: isTooManyLines || lines.some((l) => l.isTruncated),
  };
}

export function PostCard({
  post,
  onDelete,
  onBanned,
  canModerate = false,
  onPinChange,
  truncate = true,
}: {
  post: Post;
  onDelete?: (id: string) => void;
  /** Admin-only - fired once this post is actually banned, so a list (e.g. the admin
   *  posts browser) can drop it. */
  onBanned?: (id: string) => void;
  /** Lets a community owner delete someone else's post from this card. */
  canModerate?: boolean;
  /** Lets a community owner pin/unpin this post to the community's highlights strip. */
  onPinChange?: (id: string, isPinned: boolean) => void;
  /** Clamp the body to 5 lines and tap through to the full post. Off for the post-thread
   *  page's own copy of this card, which is the full post view already. */
  truncate?: boolean;
}) {
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [downvotes, setDownvotes] = useState(post.downvotes);
  const [myVote, setMyVote] = useState(post.myVote);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOwnPost, setIsOwnPost] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinned, setIsPinned] = useState(post.isPinned);
  const [isPinning, setIsPinning] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [justReposted, setJustReposted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setIsOwnPost(user?.id === post.authorId);
      setIsMod(isModerator(user));
    });
  }, [post.authorId]);

  useEffect(() => {
    if (!justReposted) return;
    const timeout = setTimeout(() => setJustReposted(false), 2000);
    return () => clearTimeout(timeout);
  }, [justReposted]);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Cheap to compute unconditionally - only actually rendered when `truncate` is set.
  const preview = previewBody(post.body);

  async function toggleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await postsApi.toggleSave(post.id);
      setIsSaved(result.isSaved);
    } catch {
      // Leave saved state as-is on failure.
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePin() {
    if (isPinning) return;
    setIsPinning(true);
    setPinError(null);
    try {
      const { post: updated } = await communitiesApi.pinPost(post.communitySlug, post.id);
      setIsPinned(updated.isPinned);
      onPinChange?.(post.id, updated.isPinned);
    } catch (err) {
      setPinError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsPinning(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setIsDeleting(true);
    try {
      await postsApi.delete(post.id);
      onDelete?.(post.id);
    } catch {
      setIsDeleting(false);
    }
  }

  async function castVote(direction: "up" | "down") {
    if (isVoting) return;
    const nextVote = myVote === direction ? null : direction;
    setIsVoting(true);
    try {
      const result = await postsApi.vote(post.id, nextVote);
      setUpvotes(result.upvotes);
      setDownvotes(result.downvotes);
      setMyVote(result.myVote);
    } catch {
      // Leave counts as-is; the button simply doesn't reflect an unsent vote.
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <VenetianMask className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center text-sm font-semibold text-slate-800 dark:text-slate-100">
              {/* Not `truncate`: overflow-hidden here would clip the dropdown that
                  UserHandleMenu pops open below the name, making it silently invisible. */}
              <UserHandleMenu userId={post.authorId} handle={post.authorHandle} interactive={!isOwnPost}>
                {post.authorHandle}
              </UserHandleMenu>
            </div>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {post.isRepost && (
                <span className="mr-1.5 inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Repeat2 className="h-3 w-3" />
                  Reposted
                </span>
              )}
              {isPinned && (
                <span className="mr-1.5 inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Pin className="h-3 w-3 fill-current" />
                  Pinned
                </span>
              )}
              {/* "public" is the implicit default posting destination, not a real
                  community - only name-drop where the post actually belongs somewhere. */}
              {post.communitySlug !== "public" && (
                <>
                  {isMod ? (
                    // Same reasoning as the comments link below - /c/[slug] is outside the
                    // admin panel, so this stays plain text instead of a dead-end link.
                    <span>{post.communitySlug}</span>
                  ) : (
                    <Link
                      href={`/c/${post.communitySlug}`}
                      className="hover:text-cyan-600 hover:underline dark:hover:text-cyan-400"
                    >
                      {post.communitySlug}
                    </Link>
                  )}{" "}
                  &middot;{" "}
                </>
              )}
              {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>

        {isMod && (
          <BanButton
            targetType="post"
            targetId={post.id}
            targetLabel={post.body}
            variant="icon"
            onBanned={() => onBanned?.(post.id)}
          />
        )}

        {!isMod && (!isOwnPost || canModerate) && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label="Post options"
              onClick={() => setIsMenuOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 space-y-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    toggleSave();
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Saved" : "Save"}
                </button>
                {canModerate && (
                  <button
                    type="button"
                    disabled={isPinning}
                    onClick={() => {
                      togglePin();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    {isPinned ? "Unpin" : "Pin to highlights"}
                  </button>
                )}
                {!isOwnPost && (
                  <ReportButton
                    targetType="post"
                    targetId={post.id}
                    targetLabel={post.body}
                    variant="menu-item"
                    onReported={() => setIsMenuOpen(false)}
                  />
                )}
                {/* No auto-close on click here: closing this dropdown on click would
                    unmount ReportButton (and its just-opened modal) in the same render.
                    It closes on its own via the outside-click handler, or a couple
                    seconds after a report goes through (onReported above). */}
              </div>
            )}
          </div>
        )}
      </div>

      {pinError && <p className="mt-2 text-xs font-medium text-red-500">{pinError}</p>}

      {/* Truncating the text itself (see previewBody) rather than a CSS line-clamp: the
          card's width has to hold no matter what was posted, and line-clamp's
          `display: -webkit-box` sizes like a flex container (shrink-to-fit) instead of a
          normal block, so it kept growing to fit each unwrapped "line" instead of
          actually wrapping at the card's width. overflow-wrap:anywhere - rather than
          break-words/overflow-wrap:break-word, which doesn't count toward an element's
          *minimum* size - is still here as a backstop against min-content grid blowout. */}
      {truncate ? (
        <Link href={isMod ? `/admin/posts/${post.id}` : `/post/${post.id}`} className="mt-3 block">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">
            {preview.text}
            {preview.isTruncated && <span className="text-slate-400 dark:text-slate-500">&hellip;</span>}
          </p>
        </Link>
      ) : (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">
          {post.body}
        </p>
      )}

      {/* A repost's own mediaType is always "none" (RepostModal only takes a caption) -
          whatever was originally posted shows inside this embed instead. */}
      {post.isRepost && (
        <Link
          href={post.repostOf ? `/post/${post.repostOf.id}` : "#"}
          onClick={(e) => {
            if (!post.repostOf) e.preventDefault();
          }}
          className={`mt-3 block rounded-xl border border-slate-200 p-3 dark:border-slate-800 ${
            post.repostOf ? "transition-all duration-200 hover:border-cyan-300 dark:hover:border-cyan-800" : ""
          }`}
        >
          {post.repostOf ? (
            <>
              <p className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <VenetianMask className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                {post.repostOf.authorHandle}
                {post.repostOf.communitySlug !== "public" && (
                  <span className="font-normal text-slate-400 dark:text-slate-500">
                    &middot; {post.repostOf.communitySlug}
                  </span>
                )}
              </p>
              {post.repostOf.body && (
                <p className="mt-1 w-full whitespace-pre-wrap break-words text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                  {previewBody(post.repostOf.body).text}
                </p>
              )}
              {post.repostOf.mediaType === "photos" && post.repostOf.mediaUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${API_BASE_URL}${post.repostOf.mediaUrls[0]}`}
                  alt=""
                  className="mt-2 max-h-48 w-full rounded-lg object-cover"
                />
              )}
              {post.repostOf.mediaType === "video" && post.repostOf.videoUrl && (
                <video
                  src={`${API_BASE_URL}${post.repostOf.videoUrl}`}
                  controls
                  className="mt-2 max-h-48 w-full rounded-lg"
                />
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">Original post is no longer available.</p>
          )}
        </Link>
      )}

      {post.mediaType === "photos" && post.mediaUrls.length > 0 && (
        <PhotoCarousel urls={post.mediaUrls} />
      )}

      {post.mediaType === "video" && post.videoUrl && (
        <video
          src={`${API_BASE_URL}${post.videoUrl}`}
          controls
          className="mt-3 max-h-96 w-full rounded-xl bg-black"
        />
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-0.5 rounded-full bg-slate-100 px-1 py-1 dark:bg-slate-800">
          <button
            type="button"
            aria-label="Upvote"
            disabled={isVoting || isOwnPost || isMod}
            title={isMod ? "Admins can't vote" : isOwnPost ? "You can't vote on your own post" : undefined}
            onClick={() => castVote("up")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed ${
              myVote === "up"
                ? "text-cyan-500"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            } ${isOwnPost || isMod ? "opacity-40 hover:bg-transparent dark:hover:bg-transparent" : ""}`}
          >
            <ArrowBigUp className={`h-4 w-4 ${myVote === "up" ? "fill-current" : ""}`} />
          </button>
          <span
            className={`min-w-6 text-center text-xs font-bold ${
              myVote === "up"
                ? "text-cyan-500"
                : myVote === "down"
                  ? "text-rose-500"
                  : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {(upvotes - downvotes).toLocaleString()}
          </span>
          <button
            type="button"
            aria-label="Downvote"
            disabled={isVoting || isOwnPost || isMod}
            title={isMod ? "Admins can't vote" : isOwnPost ? "You can't vote on your own post" : undefined}
            onClick={() => castVote("down")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed ${
              myVote === "down"
                ? "text-rose-500"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            } ${isOwnPost || isMod ? "opacity-40 hover:bg-transparent dark:hover:bg-transparent" : ""}`}
          >
            <ArrowBigDown className={`h-4 w-4 ${myVote === "down" ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Admins can't reach /post/[id] - they're confined to the admin panel - so this
            points at the admin panel's own copy of the same thread view instead. */}
        <Link
          href={isMod ? `/admin/posts/${post.id}` : `/post/${post.id}`}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <MessageSquare className="h-4 w-4" />
          {post.commentCount}
        </Link>
        <button
          type="button"
          disabled={isMod || (post.isRepost && !post.repostOf)}
          title={
            isMod
              ? "Admins can't repost"
              : post.isRepost && !post.repostOf
                ? "The original post is no longer available"
                : undefined
          }
          onClick={() => setIsReposting(true)}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400 dark:disabled:hover:bg-transparent"
        >
          <Repeat2 className={`h-4 w-4 ${justReposted ? "text-emerald-500" : ""}`} />
          {justReposted ? "Reposted!" : "Repost"}
        </button>
        <ShareMenu postId={post.id} disabled={isMod} disabledReason="Admins can't share" />
        {onDelete && (isOwnPost || canModerate) && (
          <button
            type="button"
            aria-label="Delete post"
            disabled={isDeleting}
            onClick={handleDelete}
            className="ml-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {isReposting && (
        <RepostModal
          post={post}
          onClose={() => setIsReposting(false)}
          onReposted={() => {
            setIsReposting(false);
            setJustReposted(true);
          }}
        />
      )}
    </article>
  );
}
