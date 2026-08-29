"use client";

import { Search, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/post-card";
import { adminApi, ApiError, type Post } from "@/lib/api";

type Sort = "new" | "top";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "new", label: "Latest" },
  { value: "top", label: "Popular" },
];

/** Site-wide post browser - latest or most-upvoted, optionally searched by body text.
 *  Unlike the reports/ban-log pages, this isn't about content someone flagged - it's how
 *  an admin looks around the platform on their own and bans something directly. */
export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(true);
      setError(null);
      adminApi
        .listPosts({ q: query.trim() || undefined, sort })
        .then(({ posts }) => setPosts(posts))
        .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."))
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, sort]);

  function handleBanned(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Posts</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Every visible post on AnonSpace, latest or most upvoted - search or ban directly, no report needed.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search posts..."
            className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-950">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSort(opt.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                sort === opt.value
                  ? "bg-white text-cyan-700 shadow-sm dark:bg-slate-800 dark:text-cyan-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {opt.value === "top" && <TrendingUp className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          {query.trim() ? `No posts match "${query.trim()}".` : "No posts yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onBanned={handleBanned} />
          ))}
        </div>
      )}
    </div>
  );
}
