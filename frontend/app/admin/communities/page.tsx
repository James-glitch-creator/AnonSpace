"use client";

import { Lock, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminApi, ApiError, type AdminCommunitySearchResult } from "@/lib/api";
import { formatMemberCount } from "@/lib/format";

// Kept outside the component (like the Users search page's own cache) so the search
// survives no matter how you get back to this page - browser back, or just clicking
// "Communities" in the sidebar again, neither of which carries a URL query param.
let cachedQuery = "";
let cachedResults: AdminCommunitySearchResult[] | null = null;

export default function AdminCommunitiesPage() {
  const [query, setQuery] = useState(cachedQuery);
  const [results, setResults] = useState<AdminCommunitySearchResult[] | null>(cachedResults);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cachedQuery = query;
  }, [query]);

  useEffect(() => {
    cachedResults = results;
  }, [results]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    const timeout = setTimeout(() => {
      adminApi
        .searchCommunities(q)
        .then(({ communities }) => setResults(communities))
        .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const hasSearched = query.trim() !== "" && results !== null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Communities</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Look up any community to review its posts and activity — includes private
          communities, unlike the regular Communities page.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search communities by name or slug..."
            className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
          />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      {hasSearched && results && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No communities match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/communities/${encodeURIComponent(c.slug)}`}
                  className="flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className={`h-9 w-9 shrink-0 rounded-full ${c.color}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                      {c.name}
                      {c.visibility === "private" && (
                        <Lock className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                      )}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500">
                      {formatMemberCount(c.memberCount)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
