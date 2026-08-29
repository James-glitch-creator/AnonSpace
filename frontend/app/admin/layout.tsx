"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentUser } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      // Superadmins get the /admin/accounts subtree, Overview, the /admin/users and
      // /admin/communities subtrees, and their own Settings - registering/revoking admins
      // is their main job, not moderation, but they're still an admin, so Overview,
      // looking up regular accounts/communities, and managing their own password stay
      // visible too. The proxy already enforces this at the routing layer; this is the
      // same check again for defense in depth.
      if (user?.role === "superadmin") {
        const allowed =
          pathname === "/admin" ||
          pathname === "/admin/accounts" ||
          pathname.startsWith("/admin/accounts/") ||
          pathname === "/admin/users" ||
          pathname.startsWith("/admin/users/") ||
          pathname === "/admin/communities" ||
          pathname.startsWith("/admin/communities/") ||
          pathname === "/admin/settings";
        if (allowed) {
          setIsAllowed(true);
        } else {
          router.replace("/admin/accounts");
        }
      } else if (user?.role === "admin") {
        setIsAllowed(true);
      } else {
        router.replace("/home");
      }
    });
  }, [router, pathname]);

  if (!isAllowed) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 space-y-5 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
