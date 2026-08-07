"use client";

import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  MessageSquare,
  MoreVertical,
  Share2,
  Trash2,
  VenetianMask,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, getCurrentUser, postsApi, type Post } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { PhotoCarousel } from "./photo-carousel";
import { ReportButton } from "./report-button";
import { UserHandleMenu } from "./user-handle-menu";

export function PostCard({
  post,
  onDelete,
  canModerate = false,
}: {
  post: Post;
  onDelete?: (id: string) => void;
  /** Lets a community admin delete someone else's post from this card. */
  canModerate?: boolean;
}) {
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [downvotes, setDownvotes] = useState(post.downvotes);
  const [myVote, setMyVote] = useState(post.myVote);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOwnPost, setIsOwnPost] = useState(false);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser().then((user) => setIsOwnPost(user?.id === post.authorId));
  }, [post.authorId]);

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

  const totalVotes = upvotes + downvotes;
  const upvotePercent = totalVotes === 0 ? 100 : Math.round((upvotes / totalVotes) * 100);

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
              <span className="ml-1 truncate text-xs font-normal text-slate-400 dark:text-slate-500">
                &middot; {upvotePercent}% Upvoted
              </span>
            </div>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              <Link
                href={`/c/${post.communitySlug}`}
                className="hover:text-cyan-600 hover:underline dark:hover:text-cyan-400"
              >
                c/{post.communitySlug}
              </Link>{" "}
              &middot; {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>

        {!isOwnPost && (
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
              <div className="absolute right-0 top-full z-10 mt-1 w-40 space-y-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
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
                <ReportButton
                  targetType="post"
                  targetId={post.id}
                  targetLabel={post.body}
                  variant="menu-item"
                />
                {/* No auto-close here: closing this dropdown on click would unmount
                    ReportButton (and its just-opened modal) in the same render. It
                    closes on its own via the outside-click handler once you're done. */}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {post.body}
      </p>

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
        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-1 dark:bg-slate-800">
          <button
            type="button"
            aria-label="Upvote"
            disabled={isVoting || isOwnPost}
            title={isOwnPost ? "You can't vote on your own post" : undefined}
            onClick={() => castVote("up")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed ${
              myVote === "up"
                ? "bg-cyan-500 text-white"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            } ${isOwnPost ? "opacity-40 hover:bg-transparent dark:hover:bg-transparent" : ""}`}
          >
            <ArrowBigUp className="h-4 w-4" />
          </button>
          <span className="min-w-6 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
            {upvotes.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-1 dark:bg-slate-800">
          <button
            type="button"
            aria-label="Downvote"
            disabled={isVoting || isOwnPost}
            title={isOwnPost ? "You can't vote on your own post" : undefined}
            onClick={() => castVote("down")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed ${
              myVote === "down"
                ? "bg-rose-500 text-white"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            } ${isOwnPost ? "opacity-40 hover:bg-transparent dark:hover:bg-transparent" : ""}`}
          >
            <ArrowBigDown className="h-4 w-4" />
          </button>
          <span className="min-w-6 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
            {downvotes.toLocaleString()}
          </span>
        </div>

        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <MessageSquare className="h-4 w-4" />
          {post.commentCount}
        </Link>
        <button className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
          <Share2 className="h-4 w-4" />
          Share
        </button>
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
    </article>
  );
}
