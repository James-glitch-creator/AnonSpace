"use client";

import { ArrowDownRight, Bot, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryFilter } from "@/components/admin/category-filter";
import { PaginationFooter } from "@/components/admin/pagination-footer";
import { TypeBadge } from "@/components/admin/type-badge";
import { adminApi, ApiError, type BanLogEntry } from "@/lib/api";

const CATEGORY_OPTIONS = ["All Categories", "Post Only", "Comment Only", "Account Only", "Community Only"];

export default function BanLogPage() {
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [logs, setLogs] = useState<BanLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listBanLogs()
      .then(({ banLogs }) => setLogs(banLogs))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."))
      .finally(() => setIsLoading(false));
  }, []);

  const rows = useMemo(() => {
    if (category === "Post Only") return logs.filter((r) => r.targetType === "Post");
    if (category === "Comment Only") return logs.filter((r) => r.targetType === "Comment");
    if (category === "Account Only") return logs.filter((r) => r.targetType === "User");
    if (category === "Community Only") return logs.filter((r) => r.targetType === "Community");
    return logs;
  }, [category, logs]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Ban Log</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Every post, comment, account, and community that&apos;s been banned — automatically
          by the downvote system, or by an admin acting directly or confirming a report.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <CategoryFilter options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        </div>

        {error && <p className="px-4 pt-3 text-xs font-medium text-red-500">{error}</p>}

        <div className="overflow-x-auto">
          {/* table-fixed + an explicit width on "About" - without it, this is an `auto`-
              layout table, where a preview with no natural break point (e.g. a post that's
              just one huge unbroken run of characters) doesn't get contained by max-width
              at all; it just bleeds across the other columns instead of being clipped. */}
          <table className="w-full min-w-[820px] table-fixed text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="w-2/5 px-4 py-2">About</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Community</th>
                <th className="px-4 py-2">Ratio</th>
                <th className="px-4 py-2">Banned by</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No bans yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      <p className="truncate">{row.preview}</p>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={row.targetType} />
                    </td>
                    <td className="px-4 py-3 font-medium text-cyan-600 dark:text-cyan-400">
                      {row.communitySlug ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.finalRatio !== null ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                          {row.finalRatio}%
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.bannedByHandle ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                          <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
                          {row.bannedByHandle}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                          <Bot className="h-3.5 w-3.5" />
                          Automatic
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter from={rows.length === 0 ? 0 : 1} to={rows.length} total={rows.length} />

        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Automatic bans trigger the instant a post or comment crosses 50% downvoted — no admin
          approval involved. Admin-confirmed bans come from the Reports queue and always record
          which admin approved them.
        </p>
      </div>
    </div>
  );
}
