"use client";

import { ArrowLeft, Ban, Check, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TypeBadge } from "@/components/admin/type-badge";
import { adminApi, ApiError, type AdminAction, type PublicUser } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

const TYPE_BADGE: Record<AdminAction["targetType"], "Post" | "Comment" | "User" | "Community"> = {
  post: "Post",
  comment: "Comment",
  user: "User",
  community: "Community",
};

export default function AdminAccountActionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [admin, setAdmin] = useState<PublicUser | null>(null);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getAccountActions(id)
      .then(({ admin, actions }) => {
        setAdmin(admin);
        setActions(actions);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
      ) : admin ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <ShieldCheck className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">{admin.handle}</h1>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">{admin.email}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {actions.length} action{actions.length === 1 ? "" : "s"}
              </h2>
            </div>

            <div className="overflow-x-auto">
              {/* table-fixed + explicit widths on the two free-text columns - without it,
                  this is an `auto`-layout table, where a preview/reason with no natural
                  break point (e.g. a post that's just one huge unbroken run of characters)
                  doesn't get contained by max-width at all; it just bleeds across the other
                  columns instead of being clipped. */}
              <table className="w-full min-w-[640px] table-fixed text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <th className="px-4 py-2">Action</th>
                    <th className="w-1/3 px-4 py-2">Content</th>
                    <th className="w-1/3 px-4 py-2">Reason</th>
                    <th className="px-4 py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        {admin.handle} hasn&apos;t taken any actions yet.
                      </td>
                    </tr>
                  ) : (
                    actions.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
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
                            {/* min-w-0: a flex item defaults to a minimum size no smaller
                                than its own content, which would push the row wider
                                instead of letting truncate actually clip it. */}
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
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          Admin not found.
        </div>
      )}
    </div>
  );
}
