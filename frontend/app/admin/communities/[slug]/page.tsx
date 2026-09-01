"use client";

import { Lock, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminCommunitySidebar } from "@/components/admin/admin-community-sidebar";
import { PostCard } from "@/components/post-card";
import { POSTS_PAGE_SIZE, usePaginatedPosts } from "@/hooks/use-paginated-posts";
import { adminApi, API_BASE_URL, type AdminCommunityProfile, type CommunityPostSort } from "@/lib/api";

const SORT_OPTIONS: { value: CommunityPostSort; label: string }[] = [
  { value: "new", label: "Latest to oldest" },
  { value: "old", label: "Oldest to latest" },
  { value: "top", label: "Most liked" },
  { value: "bottom", label: "Most disliked" },
];

export default function AdminCommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<AdminCommunityProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [postQuery, setPostQuery] = useState("");
  const [postSort, setPostSort] = useState<CommunityPostSort>("new");

  const {
    posts,
    isInitialLoading: isLoadingPosts,
    isLoadingMore,
    hasMore,
    error: postsError,
    sentinelRef,
    loadMore,
    reload: reloadPosts,
  } = usePaginatedPosts(
    (page) =>
      adminApi
        .listCommunityPosts(slug, { q: postQuery.trim() || undefined, sort: postSort, page, limit: POSTS_PAGE_SIZE })
        .then((res) => res.posts),
    { auto: false }
  );

  useEffect(() => {
    adminApi
      .getCommunity(slug)
      .then(({ community }) => setCommunity(community))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [slug]);

  // No debounce on the first load of a given slug (an admin landing on the page shouldn't
  // wait an extra beat to see it) - only a search/sort edit after that debounces.
  const loadedSlugRef = useRef<string | null>(null);
  useEffect(() => {
    const isNewSlug = loadedSlugRef.current !== slug;
    loadedSlugRef.current = slug;
    const timeout = setTimeout(() => reloadPosts(), isNewSlug ? 0 : 300);
    return () => clearTimeout(timeout);
    // reloadPosts always reads the latest slug/query/sort (see usePaginatedPosts) - it
    // doesn't need to be a dep itself, only the filters that should restart the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, postQuery, postSort]);

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>;
  }

  if (notFound || !community) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
        Community not found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <main className="min-w-0 space-y-4">
        {/* Same header a regular user's community page shows - banner, icon, name - just
            without Create Post/Join/the owner options menu, none of which apply here:
            admins investigate a community, they don't participate in it. */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className={`h-28 sm:h-40 ${community.bannerUrl ? "" : community.color}`}>
            {community.bannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${API_BASE_URL}${community.bannerUrl}`} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          <div className="px-4 pb-4">
            <div className="-mt-10 flex items-end gap-3 sm:-mt-12">
              <span className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm dark:border-slate-900 dark:bg-slate-800 sm:h-24 sm:w-24">
                {community.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API_BASE_URL}${community.iconUrl}`} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span
                    className={`flex h-full w-full items-center justify-center text-2xl font-bold text-white ${community.color}`}
                  >
                    {community.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <div className="pb-1">
                <h1 className="flex items-center gap-1.5 text-xl font-bold text-slate-800 dark:text-slate-100">
                  {community.name}
                  {community.visibility === "private" && (
                    <Lock className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  )}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={postQuery}
              onChange={(e) => setPostQuery(e.target.value)}
              type="text"
              placeholder={`Search posts in ${community.name}...`}
              className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
            />
          </div>
          <select
            value={postSort}
            onChange={(e) => setPostSort(e.target.value as CommunityPostSort)}
            className="rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-cyan-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isLoadingPosts ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            {postQuery.trim() ? `No posts match "${postQuery.trim()}".` : `No posts in ${community.name} yet.`}
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {postsError && (
              <div className="py-4 text-center">
                <p className="mb-2 text-sm text-rose-500">{postsError}</p>
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
            {!hasMore && !postsError && (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                That&apos;s everything.
              </p>
            )}
          </>
        )}

        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      </main>

      <AdminCommunitySidebar
        community={community}
        onBanned={() => setCommunity((prev) => (prev ? { ...prev, status: "banned" } : prev))}
      />
    </div>
  );
}
