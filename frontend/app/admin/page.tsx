"use client";

import { Calendar, VenetianMask } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryFilter } from "@/components/admin/category-filter";
import { PaginationFooter } from "@/components/admin/pagination-footer";
import { StatCard } from "@/components/admin/stat-card";
import { TypeBadge } from "@/components/admin/type-badge";
import { categoryOptions, overviewStats, reviewQueue } from "@/lib/admin-data";

export default function AdminOverviewPage() {
  const [category, setCategory] = useState(categoryOptions[0]);

  const rows = useMemo(() => {
    if (category === "All Categories" || category === "Latest Posts" || category === "Popular Posts" || category === "Community") {
      return reviewQueue;
    }
    const type = category === "Posts" ? "Post" : "Comment";
    return reviewQueue.filter((r) => r.type === type);
  }, [category]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Server &amp; content oversight — no identity data ever surfaces here
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <CategoryFilter options={categoryOptions} value={category} onChange={setCategory} />
          <button className="ml-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5" />
            Today
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-2">Profile</th>
                <th className="px-4 py-2">About</th>
                <th className="px-4 py-2">Content</th>
                <th className="px-4 py-2">Upvote</th>
                <th className="px-4 py-2">Downvote</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <VenetianMask className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {row.handle}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-500 dark:text-slate-400">
                    {row.about}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={row.type} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    {row.upvotes}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    {row.downvotes}
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-cyan-500 dark:hover:text-cyan-400">
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationFooter from={1} to={rows.length} total={48} />
      </div>
    </div>
  );
}
