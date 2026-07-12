"use client";

import { Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { PostCard } from "@/components/post-card";
import { posts } from "@/lib/data";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) => p.body.toLowerCase().includes(q) || p.community.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Search</h1>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search posts and communities..."
            className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
          />
        </div>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          No results for &ldquo;{query}&rdquo;.
        </div>
      ) : (
        results.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </main>
  );
}
