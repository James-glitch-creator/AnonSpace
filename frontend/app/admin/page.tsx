"use client";

import { Ban, Check, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryFilter } from "@/components/admin/category-filter";
import { PaginationFooter } from "@/components/admin/pagination-footer";
import { RangeDropdown } from "@/components/admin/range-dropdown";
import { StatCard } from "@/components/admin/stat-card";
import { TypeBadge } from "@/components/admin/type-badge";
import { adminApi, ApiError, type AdminAction, type AdminStats, type AdminStatsRange } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

const CATEGORY_OPTIONS = ["All Actions", "Bans", "Dismissals"];

const RANGE_OPTIONS: { value: AdminStatsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

// What the range-scoped cards' "note" line says for each choice.
const RANGE_NOTE: Record<AdminStatsRange, string> = {
  today: "since midnight UTC",
  "7d": "in the last 7 days",
  "30d": "in the last 30 days",
};

const TYPE_BADGE: Record<AdminAction["targetType"], "Post" | "Comment" | "User" | "Community"> = {
  post: "Post",
  comment: "Comment",
  user: "User",
  community: "Community",
};

export default function AdminOverviewPage() {
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [range, setRange] = useState<AdminStatsRange>("today");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .overview(range)
      .then(({ stats, adminActions }) => {
        setStats(stats);
        setActions(adminActions);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."))
      .finally(() => setIsLoading(false));
  }, [range]);

  // Setting isLoading lives in the event handler, not the effect above - keeps the effect
  // itself limited to "sync with the range that's already changed" rather than doing a
  // synchronous setState of its own before that.
  function handleRangeChange(next: AdminStatsRange) {
    setIsLoading(true);
    setRange(next);
  }

  const rows = useMemo(() => {
    if (category === "Bans") return actions.filter((a) => a.action === "ban");
    if (category === "Dismissals") return actions.filter((a) => a.action === "dismiss");
    return actions;
  }, [category, actions]);

  const rangeNote = RANGE_NOTE[range];

  const statCards = stats
    ? [
        { label: "Registered accounts", value: stats.accountCount.toLocaleString(), note: "across the platform" },
        { label: "New signups", value: stats.newAccounts.toLocaleString(), note: rangeNote },
        { label: "New posts & comments", value: stats.newContent.toLocaleString(), note: rangeNote },
        { label: "Auto-bans", value: stats.autoBans.toLocaleString(), note: rangeNote },
        { label: "Pending reports", value: stats.pendingReports.toLocaleString(), note: "awaiting review" },
        { label: "Content near 50% line", value: stats.nearThresholdCount.toLocaleString(), note: "awaiting outcome" },
        { label: "Active communities", value: stats.activeCommunities.toLocaleString(), note: "on the platform" },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Server &amp; content oversight — no identity data ever surfaces here
          </p>
        </div>
        <RangeDropdown value={range} options={RANGE_OPTIONS} onChange={handleRangeChange} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60"
              />
            ))
          : statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Admin Actions</h2>
          <CategoryFilter options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        </div>

        {error && <p className="px-4 pt-3 text-xs font-medium text-red-500">{error}</p>}

        <div className="overflow-x-auto">
          {/* table-fixed + explicit widths on the two free-text columns - without it, this
              is an `auto`-layout table, where a preview/reason with no natural break point
              (e.g. a post that's just one huge unbroken run of characters) doesn't get
              contained by max-width at all; it just bleeds across the other columns
              instead of being clipped. */}
          <table className="w-full min-w-[760px] table-fixed text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-2">Admin</th>
                <th className="px-4 py-2">Action</th>
                <th className="w-1/4 px-4 py-2">Content</th>
                <th className="w-1/4 px-4 py-2">Reason</th>
                <th className="px-4 py-2">When</th>
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
                    No admin activity yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                          <ShieldCheck className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{row.adminHandle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          row.action === "ban"
                            ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {row.action === "ban" ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        {row.action === "ban" ? "Banned" : "Dismissed"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={TYPE_BADGE[row.targetType]} />
                        {/* min-w-0: a flex item defaults to a minimum size no smaller than
                            its own content, which would push the row wider instead of
                            letting truncate actually clip it. */}
                        <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">
                          {row.preview}
                        </span>
                      </div>
                    </td>
                    <td className="truncate px-4 py-3 text-xs italic text-slate-400 dark:text-slate-500">
                      {row.reason}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                      {formatRelativeTime(row.at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter from={rows.length === 0 ? 0 : 1} to={rows.length} total={rows.length} />

        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Every ban an admin approved and every report an admin dismissed, most recent first.
          Automatic downvote-ratio bans aren&apos;t shown here — see the Ban Log for those.
        </p>
      </div>
    </div>
  );
}
