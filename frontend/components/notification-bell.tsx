"use client";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api";

const POLL_INTERVAL_MS = 20000;

/** A toggle, not a plain link: the actual notification list lives at /notifications, in
 *  the main column, rather than a dropdown anchored to this button. While that page is
 *  open the bell stays in its "hover" look to show it's the active view; tapping it again
 *  is what closes the page (back to wherever you were) and reverts the icon. */
export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === "/notifications";
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function refresh() {
      notificationsApi
        .list()
        .then(({ unreadCount }) => setUnreadCount(unreadCount))
        .catch(() => {});
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  function toggle() {
    if (isActive) {
      router.back();
    } else {
      router.push("/notifications");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Notifications"
      aria-pressed={isActive}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
        isActive
          ? "bg-slate-100 text-cyan-600 dark:bg-slate-800 dark:text-cyan-400"
          : "text-slate-500 hover:bg-slate-100 hover:text-cyan-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-400"
      }`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white dark:ring-slate-950" />
      )}
    </button>
  );
}
