"use client";

import { ChevronDown, Flag } from "lucide-react";
import { useState } from "react";
import { PaginationFooter } from "@/components/admin/pagination-footer";
import { reports } from "@/lib/admin-data";

const rangeOptions = ["Today", "Last 7 days", "Last 30 days"];

export default function ReportsPage() {
  const [range, setRange] = useState(rangeOptions[0]);
  const [rangeOpen, setRangeOpen] = useState(false);

  const totalOpen = reports.reduce((sum, r) => sum + r.reports, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Content flagged by users for admin attention, separate from vote-based bans
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Flag className="h-3.5 w-3.5" />
            {totalOpen} open reports
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Content &amp; reason</th>
                <th className="px-4 py-2">Community</th>
                <th className="px-4 py-2">Reports</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                    #{row.id}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{row.content}</p>
                    <p className="text-xs italic text-slate-400 dark:text-slate-500">{row.reason}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-cyan-600 dark:text-cyan-400">
                    {row.community}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-100 px-2 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                      {row.reports}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationFooter from={1} to={reports.length} total={24} />

        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Reports surface content for human review of legality — they do not, themselves, remove
          anything. Only confirmed illegal content can be deleted from here; everything else is
          left to the vote system.
        </p>
      </div>
    </div>
  );
}
