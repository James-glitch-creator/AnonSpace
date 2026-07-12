"use client";

import { ThemeToggle } from "@/components/theme-toggle";

const lockedRows = [
  { label: "Display usernames to admins", note: "Structurally disabled. No table or field in this system stores a reversible link between an account and its Gmail address." },
  { label: "Password hashing algorithm", note: "bcrypt + Argon2id (double secrets). Changing this requires a full re-hash migration, not configurable." },
  { label: "One account per Gmail address", note: "Enforced at the database level via a unique index on the hashed Gmail value." },
];

export default function SettingsPage() {
  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Setting</h1>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Appearance and account preferences.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          Identity &amp; privacy — locked
        </h2>
        <div className="space-y-3">
          {lockedRows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
            >
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {row.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{row.note}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Not configurable
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
