"use client";

import {
  ArrowBigDown,
  ArrowBigUp,
  ChevronRight,
  ChevronUp,
  MoreVertical,
  Reply as ReplyIcon,
  VenetianMask,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ApiError, commentsApi, getCurrentUser, isModerator, postsApi, type Comment } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { BanButton } from "./admin/ban-button";
import { ReportButton } from "./report-button";
import { UserHandleMenu } from "./user-handle-menu";

const REPLIES_PAGE_SIZE = 5;

export function CommentItem({
  comment,
  postId,
  childrenById,
  depth = 0,
  onReplyAdded,
}: {
  comment: Comment;
  postId: string;
  childrenById: Map<string, Comment[]>;
  depth?: number;
  onReplyAdded: (comment: Comment) => void;
}) {
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [downvotes, setDownvotes] = useState(comment.downvotes);
  const [myVote, setMyVote] = useState(comment.myVote);
  const [isVoting, setIsVoting] = useState(false);
  const [isOwnComment, setIsOwnComment] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [repliesOpen, setRepliesOpen] = useState(false);
  const [visibleReplyCount, setVisibleReplyCount] = useState(REPLIES_PAGE_SIZE);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setIsOwnComment(user?.id === comment.authorId);
      setIsMod(isModerator(user));
    });
  }, [comment.authorId]);

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

  async function castVote(direction: "up" | "down") {
    if (isVoting || isOwnComment || isMod) return;
    const nextVote = myVote === direction ? null : direction;
    setIsVoting(true);
    try {
      const result = await commentsApi.vote(comment.id, nextVote);
      setUpvotes(result.upvotes);
      setDownvotes(result.downvotes);
      setMyVote(result.myVote);
    } catch {
      // Leave counts as-is; the button simply doesn't reflect an unsent vote.
    } finally {
      setIsVoting(false);
    }
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    setReplyError(null);
    setIsSubmittingReply(true);
    try {
      const { comment: reply } = await postsApi.createComment(postId, replyBody, comment.id);
      onReplyAdded(reply);
      setReplyBody("");
      setIsReplying(false);
      setRepliesOpen(true);
      setVisibleReplyCount((v) => Math.max(v, replies.length + 1));
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmittingReply(false);
    }
  }

  function handleReplyKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmittingReply && replyBody.trim()) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  }

  function handleReplyBlur() {
    if (!replyBody.trim()) {
      setIsReplying(false);
      setReplyError(null);
    }
  }

  const replies = childrenById.get(comment.id) ?? [];
  const visibleReplies = replies.slice(0, visibleReplyCount);
  const hasMoreReplies = visibleReplyCount < replies.length;

  function showMoreReplies() {
    setVisibleReplyCount((v) => Math.min(v + REPLIES_PAGE_SIZE, replies.length));
  }

  function hideReplies() {
    setRepliesOpen(false);
    setVisibleReplyCount(REPLIES_PAGE_SIZE);
  }

  return (
    <div className={depth > 0 ? "mt-3 border-l border-slate-100 pl-4 dark:border-slate-800" : ""}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <VenetianMask className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        </span>
        <UserHandleMenu
          userId={comment.authorId}
          handle={comment.authorHandle}
          interactive={!isOwnComment}
          className="text-sm font-semibold text-slate-800 dark:text-slate-100"
        >
          {isOwnComment ? "Me" : comment.authorHandle}
        </UserHandleMenu>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {formatRelativeTime(comment.createdAt)}
        </p>
      </div>

      <p className="mt-1.5 pl-9 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {comment.body}
      </p>

      <div className="mt-1.5 flex items-center gap-2 pl-9">
        <div className="flex items-center gap-0.5 rounded-full bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
          <button
            type="button"
            aria-label="Upvote"
            disabled={isVoting || isOwnComment || isMod}
            title={isMod ? "Admins can't vote" : isOwnComment ? "You can't vote on your own comment" : undefined}
            onClick={() => castVote("up")}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed ${
              myVote === "up"
                ? "text-cyan-500"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            } ${isOwnComment || isMod ? "opacity-40 hover:bg-transparent dark:hover:bg-transparent" : ""}`}
          >
            <ArrowBigUp className={`h-3.5 w-3.5 ${myVote === "up" ? "fill-current" : ""}`} />
          </button>
          <span
            className={`min-w-5 text-center text-xs font-bold ${
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
            disabled={isVoting || isOwnComment || isMod}
            title={isMod ? "Admins can't vote" : isOwnComment ? "You can't vote on your own comment" : undefined}
            onClick={() => castVote("down")}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed ${
              myVote === "down"
                ? "text-rose-500"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            } ${isOwnComment || isMod ? "opacity-40 hover:bg-transparent dark:hover:bg-transparent" : ""}`}
          >
            <ArrowBigDown className={`h-3.5 w-3.5 ${myVote === "down" ? "fill-current" : ""}`} />
          </button>
        </div>

        <button
          type="button"
          disabled={isMod}
          title={isMod ? "Admins can't comment" : undefined}
          onClick={() => setIsReplying((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:disabled:hover:bg-transparent"
        >
          <ReplyIcon className="h-3.5 w-3.5" />
          Reply
        </button>

        {isMod && (
          <BanButton targetType="comment" targetId={comment.id} targetLabel={comment.body} variant="icon" />
        )}

        {!isOwnComment && !isMod && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label="Comment options"
              onClick={() => setIsMenuOpen((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 w-36 space-y-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                {/* No auto-close on click here: closing this dropdown on click would
                    unmount ReportButton (and its just-opened modal) in the same render.
                    It closes on its own via the outside-click handler, or a couple
                    seconds after a report goes through (onReported below). */}
                <ReportButton
                  targetType="comment"
                  targetId={comment.id}
                  targetLabel={comment.body}
                  variant="menu-item"
                  onReported={() => setIsMenuOpen(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {isReplying && (
        <form onSubmit={handleReply} className="mt-2 space-y-2 pl-9">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={handleReplyKeyDown}
            onBlur={handleReplyBlur}
            autoFocus
            required
            minLength={1}
            maxLength={2000}
            rows={2}
            placeholder={`Reply to ${isOwnComment ? "Me" : comment.authorHandle}...`}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          {replyError && <p className="text-xs font-medium text-red-500">{replyError}</p>}
        </form>
      )}

      {replies.length > 0 && !repliesOpen && (
        <button
          type="button"
          onClick={() => setRepliesOpen(true)}
          className="mt-2 flex items-center gap-1.5 pl-9 text-xs font-semibold text-cyan-600 transition-all duration-200 hover:underline dark:text-cyan-400"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </button>
      )}

      {repliesOpen && replies.length > 0 && (
        <div className="space-y-3">
          {visibleReplies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              childrenById={childrenById}
              depth={depth + 1}
              onReplyAdded={onReplyAdded}
            />
          ))}

          {hasMoreReplies ? (
            <button
              type="button"
              onClick={showMoreReplies}
              className="pl-9 text-xs font-semibold text-cyan-600 transition-all duration-200 hover:underline dark:text-cyan-400"
            >
              More ({replies.length - visibleReplyCount} more)
            </button>
          ) : (
            <button
              type="button"
              onClick={hideReplies}
              className="flex items-center gap-1.5 pl-9 text-xs font-semibold text-slate-500 transition-all duration-200 hover:underline dark:text-slate-400"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Hide
            </button>
          )}
        </div>
      )}
    </div>
  );
}
