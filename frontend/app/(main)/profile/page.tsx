"use client";

import { PostCard } from "@/components/post-card";
import { POSTS_PAGE_SIZE, usePaginatedPosts } from "@/hooks/use-paginated-posts";
import { postsApi } from "@/lib/api";

export default function ProfilePage() {
  const { posts, setPosts, isInitialLoading, isLoadingMore, hasMore, error, sentinelRef, loadMore } =
    usePaginatedPosts((page) => postsApi.mine({ page, limit: POSTS_PAGE_SIZE }).then((res) => res.posts));

  function handleDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Your Posts</h1>

      {isInitialLoading ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          You haven&apos;t posted anything yet.
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={handleDeleted} />
          ))}

          {error && (
            <div className="py-4 text-center">
              <p className="mb-2 text-sm text-rose-500">{error}</p>
              <button
                type="button"
                onClick={loadMore}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300"
              >
                Try again
              </button>
            </div>
          )}

          {isLoadingMore && (
            <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">Loading more...</p>
          )}
          {!hasMore && !error && (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">You&apos;re all caught up.</p>
          )}
        </>
      )}

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </main>
  );
}
