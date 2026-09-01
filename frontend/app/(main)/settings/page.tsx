"use client";

import { Ban, Flag, LogOut, Moon, RefreshCw, ShieldCheck, ShieldX, Sun, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ApiError,
  authApi,
  getCurrentUser,
  notificationsApi,
  usersApi,
  type BlockedUser,
  type NotificationType,
  type PublicUser,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { setTheme, useIsDarkTheme } from "@/components/theme-toggle";

const NOTIFICATION_TYPES: { type: NotificationType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "reported", label: "Someone reports my post, comment, or account", icon: Flag },
  { type: "content_banned", label: "My post or comment gets banned", icon: Ban },
  { type: "account_banned", label: "My account gets banned", icon: UserX },
  { type: "report_approved", label: "A report I filed gets approved", icon: ShieldCheck },
  { type: "report_dismissed", label: "A report I filed gets dismissed", icon: ShieldX },
];

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function eligibleAfter(handleChangedAt: string | null): string | null {
  if (!handleChangedAt) return null;
  const next = new Date(handleChangedAt);
  next.setMonth(next.getMonth() + 6);
  return next.toISOString();
}

function AppearanceCard() {
  const isDark = useIsDarkTheme();

  const optionClass = (active: boolean) =>
    `flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
      active
        ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400"
        : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
    }`;

  return (
    <Card title="Appearance" subtitle="Choose how AnonSpace looks on this device.">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setTheme(false)} aria-pressed={!isDark} className={optionClass(!isDark)}>
          <Sun className="h-4 w-4" />
          Light
        </button>
        <button type="button" onClick={() => setTheme(true)} aria-pressed={isDark} className={optionClass(isDark)}>
          <Moon className="h-4 w-4" />
          Dark
        </button>
      </div>
    </Card>
  );
}

function AccountCard({ user, onHandleChange }: { user: PublicUser; onHandleChange: (handle: string) => void }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null means "derive from the user prop"; only set once the refresh call itself returns a
  // fresher date, so a change here doesn't need to round-trip through the parent's user object.
  const [refreshedEligibleAt, setRefreshedEligibleAt] = useState<string | null>(null);
  const nextEligibleAt = refreshedEligibleAt ?? eligibleAfter(user.handleChangedAt);

  const isEligible = !nextEligibleAt || new Date(nextEligibleAt) <= new Date();

  async function refreshHandle() {
    if (!window.confirm("Roll a new anonymous name? Your past posts and comments will keep showing your old one.")) {
      return;
    }
    setIsRefreshing(true);
    setError(null);
    try {
      const { handle, nextEligibleAt } = await authApi.refreshHandle();
      onHandleChange(handle);
      setRefreshedEligibleAt(nextEligibleAt);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Card title="Account" subtitle="Your identity on AnonSpace.">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Anonymous name</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.handle}</p>
          </div>
          <button
            type="button"
            onClick={refreshHandle}
            disabled={!isEligible || isRefreshing}
            title={isEligible ? "Roll a new name" : `Available again ${nextEligibleAt ? formatRelativeTime(nextEligibleAt) : ""}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {!isEligible && nextEligibleAt && (
          <p className="px-1 text-[11px] text-slate-400 dark:text-slate-500">
            You can refresh your name again on {new Date(nextEligibleAt).toLocaleDateString()} — once every 6
            months.
          </p>
        )}
        {error && <p className="px-1 text-xs font-medium text-red-500">{error}</p>}

        <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">Email</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.email}</p>
        </div>
      </div>
    </Card>
  );
}

function PasswordCard({ email }: { email?: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200";

  return (
    <Card title="Password" subtitle="Change the password used to log in.">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Current password
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            New password
          </label>
          <input
            type="password"
            required
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Confirm new password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
        {success && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Password updated.</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
          <Link
            href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
            className="text-xs font-medium text-slate-500 hover:text-cyan-600 hover:underline dark:text-slate-400 dark:hover:text-cyan-400"
          >
            Forgot your current password?
          </Link>
        </div>
      </form>
    </Card>
  );
}

function NotificationPreferencesCard({ user }: { user: PublicUser }) {
  const [muted, setMuted] = useState<Set<NotificationType>>(new Set(user.mutedNotificationTypes));
  const [error, setError] = useState<string | null>(null);

  function toggle(type: NotificationType) {
    const next = new Set(muted);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setMuted(next);
    setError(null);
    notificationsApi.updatePreferences(Array.from(next)).catch((err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setMuted(muted);
    });
  }

  return (
    <Card title="Notifications" subtitle="Choose which alerts you want to receive.">
      <div className="space-y-1.5">
        {NOTIFICATION_TYPES.map(({ type, label, icon: Icon }) => {
          const isOn = !muted.has(type);
          return (
            <div
              key={type}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                onClick={() => toggle(type)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-all duration-200 ${
                  isOn ? "bg-cyan-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-200 ${
                    isOn ? "left-4.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </Card>
  );
}

function BlockedAccountsCard() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyHandle, setBusyHandle] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .listBlocked()
      .then(({ users }) => setBlocked(users))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."))
      .finally(() => setIsLoading(false));
  }, []);

  async function unblock(handle: string) {
    setBusyHandle(handle);
    setError(null);
    try {
      await usersApi.unblock(handle);
      setBlocked((prev) => prev.filter((u) => u.handle !== handle));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusyHandle(null);
    }
  }

  return (
    <Card title="Blocked accounts" subtitle="Accounts you won't see or hear from.">
      {error && <p className="mb-2 text-xs font-medium text-red-500">{error}</p>}
      {isLoading ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">Loading...</p>
      ) : blocked.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">You haven&apos;t blocked anyone.</p>
      ) : (
        <div className="space-y-1.5">
          {blocked.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <UserX className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{u.handle}</span>
              </span>
              <button
                type="button"
                disabled={busyHandle === u.handle}
                onClick={() => unblock(u.handle)}
                className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function LogoutCard() {
  async function handleLogout() {
    if (!window.confirm("Log out of AnonSpace?")) return;
    try {
      await authApi.logout();
    } finally {
      // Full page navigation, not router.push - clears all client-side state so the
      // next visitor to this tab never sees a stale, previously-logged-in render.
      window.location.href = "/";
    }
  }

  return (
    <Card title="Session" subtitle="Sign out of AnonSpace on this device.">
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
      >
        <LogOut className="h-3.5 w-3.5" />
        Log Out
      </button>
    </Card>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Setting</h1>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Appearance and account preferences.</p>
      </div>

      <AppearanceCard />

      {user && <AccountCard user={user} onHandleChange={(handle) => setUser({ ...user, handle })} />}

      <PasswordCard email={user?.email} />

      {user && <NotificationPreferencesCard user={user} />}

      <BlockedAccountsCard />

      <LogoutCard />
    </main>
  );
}
