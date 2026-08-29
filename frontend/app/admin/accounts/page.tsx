"use client";

import { Search as SearchIcon, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminApi, ApiError, getCurrentUser, type AdminAccountLogEntry, type PublicUser } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

export default function AdminAccountsPage() {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [accounts, setAccounts] = useState<PublicUser[]>([]);
  const [log, setLog] = useState<AdminAccountLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.handle.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    );
  }, [accounts, query]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.role !== "superadmin") {
        router.replace("/admin");
        return;
      }
      setMe(user);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    Promise.all([adminApi.listAccounts(), adminApi.getAccountLog()])
      .then(([{ accounts }, { log }]) => {
        setAccounts(accounts);
        setLog(log);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."))
      .finally(() => setIsLoading(false));
  }, [me]);

  async function revoke(account: PublicUser) {
    if (!window.confirm("Revoke admin access for this account? They'll go back to a regular user.")) return;
    setBusyId(account.id);
    setError(null);
    try {
      await adminApi.revokeAccount(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      // Mirrors what the backend just recorded - saves a round trip to see it reflected.
      setLog((prev) => [
        {
          id: `local-${account.id}-${Date.now()}`,
          action: "revoked",
          targetHandle: account.handle,
          performedByHandle: me?.handle ?? "You",
          at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (!me) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admins</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Superadmin-only — admin accounts can only be registered here, never through signup.
          </p>
        </div>
        <Link
          href="/admin/accounts/register"
          className="flex items-center gap-1.5 rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600"
        >
          <UserPlus className="h-4 w-4" />
          Register admin
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search admins by name or email..."
            className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {visibleAccounts.length} admin account{visibleAccounts.length === 1 ? "" : "s"}
          </h2>
        </div>

        {error && <p className="px-4 pt-3 text-xs font-medium text-red-500">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : visibleAccounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No admins match &ldquo;{query.trim()}&rdquo;.
                  </td>
                </tr>
              ) : (
                visibleAccounts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/accounts/${a.id}`}
                        className="font-medium text-slate-700 hover:text-cyan-600 hover:underline dark:text-slate-200 dark:hover:text-cyan-400"
                      >
                        {a.handle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{a.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          a.role === "superadmin"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                            : "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400"
                        }`}
                      >
                        {a.role === "superadmin" && <ShieldCheck className="h-3 w-3" />}
                        {a.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.role === "admin" && (
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => revoke(a)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recent activity</h2>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            Every admin account granted or revoked, most recent first.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Admin</th>
                <th className="px-4 py-2">By</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : log.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No activity yet.
                  </td>
                </tr>
              ) : (
                log.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          entry.action === "granted"
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                        }`}
                      >
                        {entry.action === "granted" ? (
                          <UserPlus className="h-3 w-3" />
                        ) : (
                          <UserMinus className="h-3 w-3" />
                        )}
                        {entry.action === "granted" ? "Granted" : "Revoked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                      {entry.targetHandle}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{entry.performedByHandle}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                      {formatRelativeTime(entry.at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
