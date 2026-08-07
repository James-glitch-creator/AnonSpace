"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { CommentItem } from "@/components/comment-item";
import { PostCard } from "@/components/post-card";
import { ApiError, getCurrentUser, postsApi, type Comment, type Post } from "@/lib/api";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([postsApi.get(id), postsApi.listComments(id)])
      .then(([postRes, commentsRes]) => {
        setPost(postRes.post);
        setComments(commentsRes.comments);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    getCurrentUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, []);

  const childrenById = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const comment of comments) {
      if (comment.parentId === null) continue;
      const siblings = map.get(comment.parentId) ?? [];
      siblings.push(comment);
      map.set(comment.parentId, siblings);
    }
    return map;
  }, [comments]);

  const rootComments = useMemo(() => {
    const roots = comments.filter((c) => c.parentId === null);
    if (!currentUserId) return roots;
    return [...roots].sort((a, b) => {
      const aMine = a.authorId === currentUserId;
      const bMine = b.authorId === currentUserId;
      return aMine === bMine ? 0 : aMine ? -1 : 1;
    });
  }, [comments, currentUserId]);

  function handleCommentAdded(comment: Comment) {
    setComments((prev) => [...prev, comment]);
    setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev));
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { comment } = await postsApi.createComment(id, body);
      handleCommentAdded(comment);
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCommentKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitting && body.trim()) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  }

  if (isLoading) {
    return (
      <main className="col-span-1 space-y-4 lg:col-span-2">
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
      </main>
    );
  }

  if (notFound || !post) {
    return (
      <main className="col-span-1 space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          Post not found.
        </div>
      </main>
    );
  }

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <PostCard post={post} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          {comments.length} Comments
        </h2>

        <form onSubmit={handleAddComment} className="mb-4 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleCommentKeyDown}
            required
            minLength={1}
            maxLength={2000}
            rows={2}
            placeholder="Add a comment..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          {error && <p className="text-xs font-medium text-red-500">{error}</p>}
        </form>

        {rootComments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            No comments yet.
          </p>
        ) : (
          <div className="space-y-4">
            {rootComments.map((comment) => (
              <div
                key={comment.id}
                className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 dark:border-slate-800"
              >
                <CommentItem
                  comment={comment}
                  postId={id}
                  childrenById={childrenById}
                  onReplyAdded={handleCommentAdded}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
