"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentUser } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isMobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileNavOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      // A superadmin is an admin with additional staff-management capabilities, so both
      // roles can use every route in the admin panel. Individual superadmin-only pages
      // still enforce their narrower role requirement themselves and in the backend.
      if (user?.role === "admin" || user?.role === "superadmin") {
        setIsAllowed(true);
      } else {
        router.replace("/home");
      }
    });
  }, [router]);

  if (!isAllowed) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <AdminNavbar onOpenMenu={() => setIsMobileNavOpen(true)} />
      <div className="flex min-w-0 flex-1">
        <AdminSidebar isMobileOpen={isMobileNavOpen} onCloseMobile={() => setIsMobileNavOpen(false)} />
        <main className="min-w-0 flex-1 space-y-4 p-3 sm:p-4 md:space-y-5 md:p-6">{children}</main>
      </div>
    </div>
  );
}
