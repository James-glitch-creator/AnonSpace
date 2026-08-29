"use client";

import { Plus, Search, VenetianMask } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authApi } from "@/lib/api";
import { MobileMenu } from "./mobile-menu";
import { NotificationBell } from "./notification-bell";

export function Navbar() {
  const router = useRouter();
  const [handle, setHandle] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setHandle(user.handle))
      .catch(() => {});
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4">
        <MobileMenu handle={handle} />

        {/* Logo */}
        <Link href="/home" className="group flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30 ring-1 ring-white/20 transition-all duration-200 group-hover:scale-105">
            <VenetianMask className="h-5 w-5 text-slate-950" strokeWidth={2.25} />
          </span>
          <span className="text-lg font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
            Anon
            <span className="text-cyan-500 dark:text-cyan-400">Space</span>
          </span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mx-auto hidden max-w-md flex-1 md:block">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find anything..."
              className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500 dark:focus:bg-slate-900 dark:focus:ring-cyan-500/10"
            />
          </div>
        </form>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <Link
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-cyan-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-400 md:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/submit"
            className="flex items-center gap-1.5 rounded-full bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Post</span>
          </Link>
          <NotificationBell />
          <Link
            href="/profile"
            className="ml-1 hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100 py-1.5 pl-2.5 pr-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-cyan-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 sm:flex"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {handle ?? "Anonymous"}
          </Link>
        </div>
      </div>
    </header>
  );
}
