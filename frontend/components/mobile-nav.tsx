"use client";

import { MessageCircle, Rss, Search, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Latest", href: "/", icon: Rss },
  { label: "Popular", href: "/popular", icon: TrendingUp },
  { label: "Search", href: "/search", icon: Search },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "Setting", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white/95 py-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
      {links.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all duration-200 ${
              active
                ? "text-cyan-600 dark:text-cyan-400"
                : "text-slate-400 hover:text-cyan-600 dark:text-slate-500 dark:hover:text-cyan-400"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
