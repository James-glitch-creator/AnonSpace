"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/post-card";
import { RightRail } from "@/components/right-rail";
import { ApiError, postsApi, type Post } from "@/lib/api";

const PAGE_SIZE = 10;

export default function NewsFeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadMore = useCallback(async (reset = false) => {
    if (isLoadingRef.current || (!reset && !hasMoreRef.current)) return;

    isLoadingRef.current = true;
    setError(null);
    if (reset) {
      nextCursorRef.current = null;
      hasMoreRef.current = true;
      setHasMore(true);
      setIsInitialLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await postsApi.feed({
        cursor: reset ? undefined : nextCursorRef.current ?? undefined,
        limit: PAGE_SIZE,
      });

      // No id-based dedup here, unlike the shared usePaginatedPosts hook - this feed is
      // meant to loop once it runs out of fresh candidates (see PersonalizedFeed::page),
      // so the same post legitimately reappears later on. Filtering repeats out would
      // silently drop everything from every lap after the first, making the feed look
      // like it stalls forever instead of actually being endless.
      setPosts((current) => (reset ? result.posts : [...current, ...result.posts]));
      nextCursorRef.current = result.nextCursor;
      hasMoreRef.current = result.nextCursor !== null;
      setHasMore(result.nextCursor !== null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your feed.");
    } finally {
      isLoadingRef.current = false;
      setIsInitialLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadMore(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadMore]);

  useEffect(() => {
    if (isInitialLoading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isInitialLoading, loadMore]);

  return (
    <>
      <main className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">For You</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Every public post, ranked by communities and creators you interact with.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadMore(true)}
            disabled={isInitialLoading || isLoadingMore}
            aria-label="Refresh feed"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-cyan-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          >
            <RefreshCw className={`h-4 w-4 ${isInitialLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isInitialLoading ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            {error ? error : "No posts are available yet. Be the first to post!"}
          </div>
        ) : (
          <>
            {/* Index in the key, not just post.id - a repeated post from a later lap (see
                loadMore above) needs its own component instance, not to collide with its
                first appearance and get silently deduped by React's key matching. */}
            {posts.map((post, index) => <PostCard key={`${post.id}-${index}`} post={post} />)}

            {error && (
              <div className="py-4 text-center">
                <p className="mb-2 text-sm text-rose-500">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300"
                >
                  Try again
                </button>
              </div>
            )}

            {isLoadingMore && <FeedSkeleton count={2} />}
            {!hasMore && !error && (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                You&apos;re all caught up.
              </p>
            )}
          </>
        )}

        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      </main>
      <RightRail />
    </>
  );
}

function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-label="Loading posts">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
          </div>
          <div className="mt-4 h-3 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
          <div className="mt-2 h-3 w-4/5 rounded bg-slate-100 dark:bg-slate-800/70" />
          <div className="mt-5 h-7 w-44 rounded-full bg-slate-100 dark:bg-slate-800/70" />
        </div>
      ))}
    </div>
  );
}
