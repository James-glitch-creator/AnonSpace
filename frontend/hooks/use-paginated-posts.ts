"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type Post } from "@/lib/api";

/** Matches every post-list endpoint's page size - see home/page.tsx, the original place
 *  this pattern shipped. Keeping it fixed (rather than a param) means every post-card list
 *  on the site loads and scrolls the same way. */
export const POSTS_PAGE_SIZE = 10;

/**
 * Powers every post-card list on the site: fetches POSTS_PAGE_SIZE posts at a time and
 * loads the next batch when a sentinel element scrolls into view, so a feed/community/
 * search with hundreds of posts never makes someone wait for all of them up front.
 *
 * `fetchPage` takes the 1-based page number and must ask the backend for POSTS_PAGE_SIZE
 * posts - getting back fewer than that is how this hook knows it has reached the end.
 * By default it fetches page 1 as soon as the component mounts; pass `auto: false` for a
 * page that already controls *when* the first fetch happens (e.g. debouncing a search
 * box) and have it call `reload()` itself instead.
 */
export function usePaginatedPosts(
  fetchPage: (page: number) => Promise<Post[]>,
  options?: { auto?: boolean; errorMessage?: string }
) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(1);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  // Always the latest closure, without forcing loadMore to change identity - callers that
  // rebuild fetchPage every render (most of them, since it closes over search/sort state)
  // shouldn't retrigger the mount effect or the sentinel's observer. Assigned in an effect,
  // not during render, per the rules of hooks (refs are for outside-render use only).
  const fetchPageRef = useRef(fetchPage);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  });

  const loadMore = useCallback(async (reset = false) => {
    if (isLoadingRef.current || (!reset && !hasMoreRef.current)) return;

    isLoadingRef.current = true;
    setError(null);
    if (reset) {
      pageRef.current = 1;
      hasMoreRef.current = true;
      setHasMore(true);
      setIsInitialLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const page = pageRef.current;
      const result = await fetchPageRef.current(page);

      setPosts((current) => {
        const base = reset ? [] : current;
        const seen = new Set(base.map((post) => post.id));
        return [...base, ...result.filter((post) => !seen.has(post.id))];
      });
      pageRef.current = page + 1;
      hasMoreRef.current = result.length === POSTS_PAGE_SIZE;
      setHasMore(result.length === POSTS_PAGE_SIZE);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : options?.errorMessage ?? "Something went wrong.");
    } finally {
      isLoadingRef.current = false;
      setIsInitialLoading(false);
      setIsLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (options?.auto === false) return;
    let cancelled = false;
    // Deferred a tick, not called synchronously in the effect body - same as the feed
    // page this pattern started in, so a mount doesn't set state within its own effect.
    queueMicrotask(() => {
      if (!cancelled) void loadMore(true);
    });
    return () => {
      cancelled = true;
    };
    // Mount-only - a page that wants to react to its own filters changing passes
    // auto:false and calls reload() itself instead of relying on this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentinelRef = useRef<HTMLDivElement>(null);
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

  return {
    posts,
    setPosts,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
    /** Loads the next page - what the sentinel calls; expose it for a manual "try again". */
    loadMore: () => loadMore(false),
    /** Restarts from page 1 - call this when a page's own filters (search text, sort,
     *  route param) change. */
    reload: () => loadMore(true),
  };
}
