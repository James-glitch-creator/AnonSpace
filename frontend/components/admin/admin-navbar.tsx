"use client";

import { LogOut, Menu, VenetianMask } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { authApi } from "@/lib/api";

export function AdminNavbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  async function handleLogout() {
    if (!window.confirm("Log out of AnonSpace?")) return;
    try {
      await authApi.logout();
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open admin navigation"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-cyan-600 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-cyan-400 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30">
          <VenetianMask className="h-5 w-5 text-slate-950" strokeWidth={2.25} />
        </span>
        <span className="hidden leading-tight sm:block">
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
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
          className="flex h-9 items-center gap-2 rounded-xl px-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 lg:hidden"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
}
