"use client";

import {
  Building2,
  ChevronDown,
  FileText,
  Flag,
  LayoutGrid,
  LogOut,
  Settings,
  ShieldBan,
  UserSearch,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { authApi, getCurrentUser, type PublicUser, type ReportTargetType } from "@/lib/api";

const overviewLink = { label: "Overview", href: "/admin", icon: LayoutGrid };

const otherAdminLinks = [
  { label: "Posts", href: "/admin/posts", icon: FileText },
  { label: "Users", href: "/admin/users", icon: UserSearch },
  { label: "Communities", href: "/admin/communities", icon: Building2 },
  { label: "Ban Log", href: "/admin/auto-ban-log", icon: ShieldBan },
  { label: "Setting", href: "/admin/settings", icon: Settings },
];

// Order the user asked for: posts, accounts, communities, comments.
const REPORT_CATEGORIES: { label: string; type: ReportTargetType }[] = [
  { label: "Posts", type: "post" },
  { label: "Accounts", type: "user" },
  { label: "Communities", type: "community" },
  { label: "Comments", type: "comment" },
];

// Superadmins get Overview too (they're still an admin), plus their own Admins link for
// registering/revoking admin accounts, the same account/community lookups admins get, and
// their own Settings - just none of the report-review/ban-log links, which are moderation,
// not their job.
const superAdminLinks = [
  { label: "Admins", href: "/admin/accounts", icon: Users },
  { label: "Users", href: "/admin/users", icon: UserSearch },
  { label: "Communities", href: "/admin/communities", icon: Building2 },
  { label: "Setting", href: "/admin/settings", icon: Settings },
];

function navLinkClass(active: boolean): string {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    active
      ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
  }`;
}

/** Split out only because it reads the URL - useSearchParams needs a Suspense boundary. */
function ReportsNavItem() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onReportsPage = pathname === "/admin/reports";
  const activeType = onReportsPage ? searchParams.get("type") : null;
  // Lazy init only - this component lives in the persistent sidebar and never remounts
  // on navigation, so landing on /admin/reports (fresh load or first click) is the only
  // moment that needs to force it open; after that the user's own toggle wins.
  const [manuallyOpen, setManuallyOpen] = useState<boolean | null>(null);
  const isOpen = manuallyOpen ?? onReportsPage;

  return (
    <div>
      <button
        type="button"
        onClick={() => setManuallyOpen(!isOpen)}
        className={`${navLinkClass(onReportsPage && !activeType)} w-full justify-between`}
      >
        <span className="flex items-center gap-3">
          <Flag className="h-4.5 w-4.5" />
          Reports
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-200 pl-3 dark:border-slate-800">
          {REPORT_CATEGORIES.map(({ label, type }) => (
            <Link
              key={type}
              href={`/admin/reports?type=${type}`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeType === type
                  ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const isSuperAdmin = user?.role === "superadmin";

  async function handleLogout() {
    if (!window.confirm("Log out of AnonSpace?")) return;
    try {
      await authApi.logout();
    } finally {
      // Full reload, not a client-side redirect - clears every cached client module
      // state (getCurrentUser's memoized identity included) so the next login never
      // inherits stale data from this session.
      window.location.href = "/";
    }
  }

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:flex lg:flex-col lg:justify-between">
      <nav className="space-y-1 p-3">
        <Link
          href={overviewLink.href}
          className={navLinkClass(pathname === overviewLink.href)}
        >
          <overviewLink.icon className="h-4.5 w-4.5" />
          {overviewLink.label}
        </Link>

        {isSuperAdmin ? (
          superAdminLinks.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={navLinkClass(pathname.startsWith(href))}>
              <Icon className="h-4.5 w-4.5" />
              {label}
            </Link>
          ))
        ) : (
          <>
            <Suspense fallback={<div className={navLinkClass(false)}>
              <Flag className="h-4.5 w-4.5" />
              Reports
            </div>}>
              <ReportsNavItem />
            </Suspense>
            {otherAdminLinks.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className={navLinkClass(pathname.startsWith(href))}>
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-cyan-600 text-xs font-bold text-slate-950">
            {user ? user.handle.slice(0, 2).toUpperCase() : "--"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {user?.handle ?? "Loading..."}
            </p>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {isSuperAdmin ? "Superadmin" : "Admin"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 pb-4 text-sm font-medium text-slate-600 transition-all duration-200 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
