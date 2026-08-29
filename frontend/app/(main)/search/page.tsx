"use client";

import { Lock, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/post-card";
import { searchApi, type Community, type Post } from "@/lib/api";
import { formatMemberCount } from "@/lib/format";

// "public" is the implicit default posting destination, not a real user-created
// community — it shouldn't turn up as a discoverable search result.
const NON_COMMUNITY_SLUGS = new Set(["public"]);

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{ posts: Post[]; communities: Community[] } | null>(null);
  const lastSyncedQuery = useRef(initialQuery);

  // Picks up query changes that came from outside this page (e.g. the navbar search),
  // while ignoring the URL updates this page makes for itself below.
  useEffect(() => {
    const urlQuery = searchParams.get("q") ?? "";
    if (urlQuery !== lastSyncedQuery.current) {
      lastSyncedQuery.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    const timeout = setTimeout(() => {
      searchApi
        .search(q)
        .then((res) => setResults(res))
        .catch(() => {});

      if (lastSyncedQuery.current !== q) {
        lastSyncedQuery.current = q;
        const params = new URLSearchParams(searchParams.toString());
        params.set("q", q);
        router.replace(`/search?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasSearched = query.trim() !== "" && results !== null;
  const posts = hasSearched ? results.posts : [];
  const communities = hasSearched ? results.communities.filter((c) => !NON_COMMUNITY_SLUGS.has(c.slug)) : [];
  const hasResults = posts.length > 0 || communities.length > 0;

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      {/* Only shown below md: the navbar has its own search bar at md+, and duplicating
          it here would show two search boxes on the same page. Below md the navbar
          collapses to just a search icon that links here, so this is the only input. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:hidden">
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

      {hasSearched && communities.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Communities
          </h2>
          <div className="space-y-1">
            {communities.map((c) => (
              <Link
                key={c.slug}
                href={`/c/${c.slug}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className={`h-8 w-8 shrink-0 rounded-full ${c.color}`} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {c.name}
                    {c.visibility === "private" && (
                      <Lock className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                    {formatMemberCount(c.memberCount)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasSearched && !hasResults ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          No results for &ldquo;{query}&rdquo;.
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
