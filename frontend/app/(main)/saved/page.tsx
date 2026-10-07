"use client";

import { PostCard } from "@/components/post-card";
import { RightRail } from "@/components/right-rail";
import { POSTS_PAGE_SIZE, usePaginatedPosts } from "@/hooks/use-paginated-posts";
import { useFeedScrollRestoration } from "@/hooks/feed-state-cache";
import { postsApi } from "@/lib/api";
import { useTranslate } from "@/lib/language";

export default function SavedPostsPage() {
  const t = useTranslate();
  const { posts, isInitialLoading, isLoadingMore, hasMore, error, sentinelRef, loadMore } = usePaginatedPosts(
    (page) => postsApi.saved({ page, limit: POSTS_PAGE_SIZE }).then((res) => res.posts),
    { cacheKey: "saved" }
  );
  useFeedScrollRestoration("saved", !isInitialLoading);

  return (
    <>
      <main className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("Saved Posts")}</h1>

        {isInitialLoading ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t("Loading...")}</p>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            {t("You haven't saved any posts yet.")}
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {error && (
              <div className="py-4 text-center">
                <p className="mb-2 text-sm text-rose-500">{error}</p>
                <button
                  type="button"
                  onClick={loadMore}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {t("Try again")}
                </button>
              </div>
            )}

            {isLoadingMore && (
              <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">{t("Loading more...")}</p>
            )}
            {!hasMore && !error && (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                {t("You're all caught up.")}
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
