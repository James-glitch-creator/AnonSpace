"use client";

import { ArrowDownRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryFilter } from "@/components/admin/category-filter";
import { PaginationFooter } from "@/components/admin/pagination-footer";
import { TypeBadge } from "@/components/admin/type-badge";
import { autoBanCategoryOptions, autoBanLog } from "@/lib/admin-data";

export default function AutoBanLogPage() {
  const [category, setCategory] = useState(autoBanCategoryOptions[0]);

  const rows = useMemo(() => {
    if (category === "Post Only") return autoBanLog.filter((r) => r.type === "Post");
    if (category === "Comment Only") return autoBanLog.filter((r) => r.type === "Comment");
    return autoBanLog;
  }, [category]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Auto-ban Log</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Every removal the 25% threshold post that has triggered — admins cannot reverse these
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <CategoryFilter options={autoBanCategoryOptions} value={category} onChange={setCategory} />
          <div className="relative ml-auto">
            <input
              type="text"
              placeholder="Search categories..."
              className="w-56 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs text-slate-600 outline-none focus:border-cyan-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">About</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Community</th>
                <th className="px-4 py-2">Final Ratio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                    #{row.id}
                  </td>
                  <td className="max-w-md px-4 py-3 text-slate-500 dark:text-slate-400">
                    {row.about}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={row.type} />
                  </td>
                  <td className="px-4 py-3 font-medium text-cyan-600 dark:text-cyan-400">
                    {row.community}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                      {row.finalRatio}%
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationFooter from={1} to={rows.length} total={48} />

        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          This log is read-only. The auto-ban system evaluates every vote change in real time and
          removes the content the instant it crosses 25% downvoted — no admin approval is required
          or possible for these entries.
        </p>
      </div>
    </div>
  );
}
