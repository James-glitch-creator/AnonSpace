"use client";

import { Flag, LayoutGrid, Settings, ShieldBan } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Overview", href: "/admin", icon: LayoutGrid },
  { label: "Auto-ban Log", href: "/admin/auto-ban-log", icon: ShieldBan },
  { label: "Reports", href: "/admin/reports", icon: Flag },
  { label: "Setting", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:flex lg:flex-col lg:justify-between">
      <nav className="space-y-1 p-3">
        {links.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-cyan-600 text-xs font-bold text-slate-950">
          DK
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            Draven Kai
          </p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-500">Executive Admin</p>
        </div>
      </div>
    </aside>
  );
}
