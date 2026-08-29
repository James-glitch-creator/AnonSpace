"use client";

import { Ban, Building2, Check, CheckCheck, Flag, ShieldCheck, ShieldX, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { RightRail } from "@/components/right-rail";
import { notificationsApi, type Notification, type NotificationType } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  reported: Flag,
  content_banned: Ban,
  account_banned: UserX,
  community_banned: Building2,
  report_approved: ShieldCheck,
  report_dismissed: ShieldX,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    notificationsApi
      .list()
      .then(({ notifications }) => setNotifications(notifications))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    notificationsApi.markRead(id).catch(() => {});
  }

  function markAllRead() {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    notificationsApi.markAllRead().catch(() => {});
  }

  return (
    <>
      <main className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Notifications</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-cyan-600 transition-all duration-200 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              Nothing yet — reports and moderation updates will show up here.
            </p>
          ) : (
            notifications.map((n) => {
              const Icon = ICONS[n.type];
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800/60 ${
                    n.isRead ? "" : "bg-cyan-50/60 dark:bg-cyan-500/5"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      n.isRead
                        ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                        : "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm ${
                        n.isRead
                          ? "text-slate-500 dark:text-slate-400"
                          : "font-medium text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {n.message}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </span>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-cyan-600 transition-all duration-200 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark as read
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
      <RightRail />
    </>
  );
}
