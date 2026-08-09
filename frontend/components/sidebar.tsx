"use client";

import { Bookmark, Crown, LogOut, MessageCircle, Rss, Search, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi, chatApi, communitiesApi, type Community } from "@/lib/api";

const UNREAD_POLL_INTERVAL_MS = 15000;

const newsLinks = [
  { label: "Latest Posts", href: "/home", icon: Rss },
  { label: "Popular Posts", href: "/popular", icon: TrendingUp },
  { label: "Saved Posts", href: "/saved", icon: Bookmark },
  { label: "Search", href: "/search", icon: Search },
];

const messagingLinks = [{ label: "Private Chat", href: "/chat", icon: MessageCircle }];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  dot,
  notify,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  dot?: string;
  notify?: boolean;
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
        <span className="relative shrink-0">
          <Icon className="h-4.5 w-4.5" />
          {notify && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white dark:ring-slate-950" />
          )}
        </span>
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function LogoutButton() {
  async function handleLogout() {
    if (!window.confirm("Log out of AnonSpace?")) return;
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
  const [communities, setCommunities] = useState<Community[]>([]);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  useEffect(() => {
    communitiesApi
      .mine()
      .then(({ communities }) => setCommunities(communities))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function checkUnread() {
      chatApi
        .hasUnread()
        .then(({ hasUnread }) => setHasUnreadChat(hasUnread))
        .catch(() => {});
    }

    checkUnread();
    const interval = setInterval(checkUnread, UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

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
            <NavLink
              key={link.href}
              {...link}
              active={pathname === link.href}
              notify={link.href === "/chat" && hasUnreadChat}
            />
          ))}
        </nav>

        <nav className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            My Communities
          </p>
          {communities.length === 0 ? (
            <p className="px-3 text-xs text-slate-400 dark:text-slate-500">
              Join a community to see it here.
            </p>
          ) : (
            communities.map((c) => (
              <Link
                key={c.slug}
                href={`/c/${c.slug}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  pathname === `/c/${c.slug}`
                    ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.color} ${
                    c.isOwner ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-950" : ""
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">c/{c.name}</span>
                {c.isOwner && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
              </Link>
            ))
          )}
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
