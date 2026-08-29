"use client";

import { Ban, ChevronDown, Flag, MousePointerClick, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { adminApi, ApiError, type AdminReport, type ReportTargetType } from "@/lib/api";

const rangeOptions = ["Today", "Last 7 days", "Last 30 days"];

const CATEGORY_LABELS: Record<ReportTargetType, string> = {
  post: "Posts",
  user: "Accounts",
  community: "Communities",
  comment: "Comments",
};

// Proper singular/plural per type - "1 open communities" reads wrong, and a flat "+s"
// suffix would too ("communitys").
const COUNT_LABELS: Record<ReportTargetType, { singular: string; plural: string }> = {
  post: { singular: "post", plural: "posts" },
  comment: { singular: "comment", plural: "comments" },
  community: { singular: "community", plural: "communities" },
  user: { singular: "account", plural: "accounts" },
};

function countLabel(type: ReportTargetType, count: number): string {
  const { singular, plural } = COUNT_LABELS[type];
  return count === 1 ? singular : plural;
}

// The "Community" column only means anything for posts/comments - an account or
// community report has nothing to put there, so it's dropped instead of showing "—"
// in every row.
function showsCommunityColumn(type: ReportTargetType): boolean {
  return type === "post" || type === "comment";
}

function isReportTargetType(value: string | null): value is ReportTargetType {
  return value === "post" || value === "comment" || value === "community" || value === "user";
}

/** Where clicking a report row's content leads - null when the target's gone and there's
 *  nowhere left to send the admin. */
function targetHref(row: AdminReport): string | null {
  switch (row.targetType) {
    case "post":
      return `/admin/posts/${row.targetId}`;
    case "comment":
      return row.postId ? `/admin/posts/${row.postId}` : null;
    case "community":
      return row.communitySlug ? `/admin/communities/${encodeURIComponent(row.communitySlug)}` : null;
    case "user":
      return row.preview !== "(deleted)" ? `/admin/users/${encodeURIComponent(row.preview)}` : null;
    default:
      return null;
  }
}

function ReportsPageInner() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const type = isReportTargetType(typeParam) ? typeParam : null;

  const [range, setRange] = useState(rangeOptions[0]);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listReports()
      .then(({ reports }) => setReports(reports))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."))
      .finally(() => setIsLoading(false));
  }, []);

  const rows = type ? reports.filter((r) => r.targetType === type) : [];

  async function review(id: string, action: "approve" | "dismiss", targetType: string) {
    if (action === "approve" && targetType === "user") {
      if (!window.confirm("Ban this account? They'll be logged out immediately and can't log back in.")) {
        return;
      }
    }
    if (action === "approve" && targetType === "community") {
      if (!window.confirm("Ban this community? It'll be hidden from listings/search and no one can post or join.")) {
        return;
      }
    }
    setBusyId(id);
    setError(null);
    try {
      await adminApi.reviewReport(id, action);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          Reports{type ? ` · ${CATEGORY_LABELS[type]}` : ""}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Content flagged by users for admin attention, separate from vote-based bans
        </p>
      </div>

      {!type ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <MousePointerClick className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Pick a report type to review
          </p>
          <p className="max-w-sm text-xs text-slate-400 dark:text-slate-500">
            Choose Posts, Accounts, Communities, or Comments from the Reports menu in the sidebar
            — each type shows on its own, never mixed together.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
            <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
              <Flag className="h-3.5 w-3.5" />
              {rows.length} open {countLabel(type, rows.length)}
            </span>

            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setRangeOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                {range.toUpperCase()}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${rangeOpen ? "rotate-180" : ""}`} />
              </button>
              {rangeOpen && (
                <div className="absolute right-0 top-11 z-40 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  {rangeOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setRange(opt);
                        setRangeOpen(false);
                      }}
                      className={`block w-full px-3.5 py-2 text-left text-xs transition-all duration-200 ${
                        opt === range
                          ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="px-4 pt-3 text-xs font-medium text-red-500">{error}</p>}

          <div className="overflow-x-auto">
            {/* table-fixed + an explicit width on the content column - without it, this is
                an `auto`-layout table, where a preview with no natural break point (e.g. a
                post that's just one huge unbroken run of characters) doesn't get contained
                by max-width at all; it just bleeds across the other columns instead of
                being clipped. */}
            <table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="w-2/5 px-4 py-2">Content &amp; reason</th>
                  {showsCommunityColumn(type) && <th className="px-4 py-2">Community</th>}
                  <th className="px-4 py-2">Reported by</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={showsCommunityColumn(type) ? 4 : 3}
                      className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500"
                    >
                      Loading reports...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showsCommunityColumn(type) ? 4 : 3}
                      className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500"
                    >
                      No open {countLabel(type, 0)} to review.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const href = targetHref(row);
                    return (
                    <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">
                        {href ? (
                          // `block`: an <a> is inline by default, and truncate's
                          // overflow/text-overflow are no-ops on an inline box - it has
                          // to be a block to actually have a width to clip against.
                          <Link
                            href={href}
                            className="block truncate font-medium text-slate-700 hover:text-cyan-600 hover:underline dark:text-slate-200 dark:hover:text-cyan-400"
                          >
                            {row.preview}
                          </Link>
                        ) : (
                          <p className="truncate font-medium text-slate-700 dark:text-slate-200">{row.preview}</p>
                        )}
                        <p className="truncate text-xs italic text-slate-400 dark:text-slate-500">
                          {row.reason}
                          {row.details ? ` — ${row.details}` : ""}
                        </p>
                      </td>
                      {showsCommunityColumn(type) && (
                        <td className="px-4 py-3 font-medium text-cyan-600 dark:text-cyan-400">
                          {row.communitySlug ?? "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.reporterHandle}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => review(row.id, "approve", row.targetType)}
                            title="Approve report - action the content"
                            className="flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => review(row.id, "dismiss", row.targetType)}
                            title="Dismiss report - no action"
                            className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <X className="h-3.5 w-3.5" />
                            Dismiss
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
            Approving a post/comment report bans the content; approving an account report bans that
            account entirely (they&apos;re logged out immediately and can&apos;t log back in);
            approving a community report bans the community (hidden from listings/search, no one
            can post or join). All three notify the reporter and whoever got banned. Dismissing
            notifies the reporter that no violation was found.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsPageInner />
    </Suspense>
  );
}
