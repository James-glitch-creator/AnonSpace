"use client";

import { Ban, Search as SearchIcon, ShieldCheck, VenetianMask } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminApi, ApiError, type AdminUserSearchResult } from "@/lib/api";

// Kept outside the component (like getCurrentUser's cache in lib/api.ts) so the search
// survives no matter how you get back to this page - browser back, or just clicking
// "Users" in the sidebar again, neither of which carries a URL query param.
let cachedQuery = "";
let cachedResults: AdminUserSearchResult[] | null = null;

export default function AdminUsersPage() {
  const [query, setQuery] = useState(cachedQuery);
  const [results, setResults] = useState<AdminUserSearchResult[] | null>(cachedResults);
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
        .searchUsers(q)
        .then(({ users }) => setResults(users))
        .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const hasSearched = query.trim() !== "" && results !== null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Accounts</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Look up any account to review its post history — admin-only, not available to regular
          users.
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
            placeholder="Search accounts by handle..."
            className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
          />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      {hasSearched && results && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No accounts match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${encodeURIComponent(u.handle)}`}
                  className="flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <VenetianMask className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                      {u.handle}
                    </span>
                    <span className="block text-xs capitalize text-slate-400 dark:text-slate-500">
                      {u.role}
                    </span>
                  </span>
                  {u.status === "banned" && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                      <Ban className="h-3 w-3" />
                      Banned
                    </span>
                  )}
                  {(u.role === "admin" || u.role === "superadmin") && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                      <ShieldCheck className="h-3 w-3" />
                      {u.role}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
