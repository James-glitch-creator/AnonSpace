"use client";

import { ChevronDown, Search, SlidersHorizontal, VenetianMask } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const sortOptions = ["Newest", "Oldest", "Highest downvotes", "Highest reports"];

export function AdminNavbar() {
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState(sortOptions[0]);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30">
          <VenetianMask className="h-5 w-5 text-slate-950" strokeWidth={2.25} />
        </span>
        <span className="leading-tight">
          <span className="block text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
            Anon<span className="text-cyan-500 dark:text-cyan-400">Space</span>
          </span>
          <span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
            /admin
          </span>
        </span>
      </Link>

      <div className="relative mx-auto hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search contents..."
          className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="relative ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-all duration-200 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Sort by
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
        </button>
        {sortOpen && (
          <div className="absolute right-24 top-12 z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            {sortOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setSort(opt);
                  setSortOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-xs transition-all duration-200 ${
                  opt === sort
                    ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
