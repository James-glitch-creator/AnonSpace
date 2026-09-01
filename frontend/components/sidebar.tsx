"use client";

import { Bookmark, LogOut, Rss, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CommunityAvatar } from "@/components/community-avatar";
import { authApi, communitiesApi, type Community } from "@/lib/api";

const newsLinks = [
  { label: "For You", href: "/home", icon: Rss },
  { label: "Popular Posts", href: "/popular", icon: TrendingUp },
  { label: "Saved Posts", href: "/saved", icon: Bookmark },
];

// "public" is the implicit default posting destination, not a real user-created
// community — it shouldn't show up as something the user has joined.
const NON_COMMUNITY_SLUGS = new Set(["public"]);

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

  useEffect(() => {
    communitiesApi
      .mine()
      .then(({ communities }) =>
        // Joined, not created - communitiesApi.mine() returns every community the user
        // belongs to, which includes ones they own (creating one auto-joins you to it).
        setCommunities(communities.filter((c) => !NON_COMMUNITY_SLUGS.has(c.slug) && !c.isOwner))
      )
      .catch(() => {});
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
            Joined Communities
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
                <CommunityAvatar community={c} className="h-6 w-6" />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
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
