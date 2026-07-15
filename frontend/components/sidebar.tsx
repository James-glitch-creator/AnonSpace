"use client";

import { LogOut, MessageCircle, Rss, Search, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { communities } from "@/lib/data";
import { authApi } from "@/lib/api";

const newsLinks = [
  { label: "Latest Posts", href: "/home", icon: Rss },
  { label: "Popular Posts", href: "/popular", icon: TrendingUp },
  { label: "Search", href: "/search", icon: Search },
];

const messagingLinks = [{ label: "Private Chat", href: "/chat", icon: MessageCircle }];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  dot,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      }`}
    >
      {dot ? (
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      ) : (
        <Icon className="h-4.5 w-4.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function LogoutButton() {
  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <LogOut className="h-4.5 w-4.5 shrink-0" />
      <span className="truncate">Log Out</span>
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-6">
        <nav className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            News
          </p>
          {newsLinks.map((link) => (
            <NavLink key={link.href} {...link} active={pathname === link.href} />
          ))}
        </nav>

        <nav className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Messaging
          </p>
          {messagingLinks.map((link) => (
            <NavLink key={link.href} {...link} active={pathname === link.href} />
          ))}
        </nav>

        <nav className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            My Communities
          </p>
          {communities.map((c) => (
            <NavLink
              key={c.slug}
              href={`/c/${c.slug}`}
              label={`c/${c.name}`}
              icon={Rss}
              dot={c.color}
              active={pathname === `/c/${c.slug}`}
            />
          ))}
        </nav>

        <div className="space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800">
          <NavLink
            href="/settings"
            label="Setting"
            icon={Settings}
            active={pathname === "/settings"}
          />
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
