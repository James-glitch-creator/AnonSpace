"use client";

import { VenetianMask } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function AdminNavbar() {
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

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
