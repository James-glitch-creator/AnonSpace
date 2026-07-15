"use client";

import { useState } from "react";

const lockedRows = [
  {
    label: "Display usernames to admins",
    note: "Structurally disabled. No table or field in this system stores a reversible link between an account and its Gmail address.",
  },
  {
    label: "Password hashing algorithm",
    note: "bcrypt + Argon2id (double secrets). Changing this requires a full re-hash migration, not configurable.",
  },
  {
    label: "One account per Gmail address",
    note: "Enforced at the database level via a unique index on the hashed Gmail value.",
  },
];

export default function AdminSettingsPage() {
  const [threshold, setThreshold] = useState(25);
  const [minVotes, setMinVotes] = useState(18);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Platform-wide configuration — identity protections below are fixed, not editable
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">Moderation</h2>

        <div className="space-y-6">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Auto-ban downvote threshold
              </p>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                {threshold}%
              </span>
            </div>
            <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
              Content is automatically removed when its downvote share crosses this percentage of
              total votes.
            </p>
            <input
              type="range"
              min={5}
              max={60}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Minimum votes before auto-ban applies
              </p>
              <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">
                {minVotes}
              </span>
            </div>
            <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
              Prevents brand-new posts with only a couple of votes from being banned prematurely.
            </p>
            <input
              type="range"
              min={5}
              max={50}
              value={minVotes}
              onChange={(e) => setMinVotes(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
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
    </div>
  );
}
