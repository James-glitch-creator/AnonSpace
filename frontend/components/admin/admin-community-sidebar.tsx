"use client";

import { Ban, Calendar, ChevronDown, Globe, Lock, ScrollText, ShieldCheck, TrendingDown, Users } from "lucide-react";
import { useState } from "react";
import type { AdminCommunityProfile } from "@/lib/api";
import { formatDate, formatMemberCount } from "@/lib/format";
import { BanButton } from "./ban-button";

const PERIOD_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]["value"];

/** Same info a regular user's CommunitySidebar shows (about, created date, visibility,
 *  member count, rules) plus what only an admin needs: who runs it, how much of what's
 *  been posted got banned, and posting activity over a period they pick. No "Message
 *  Mods" - admins can't message anyone. */
export function AdminCommunitySidebar({
  community,
  onBanned,
}: {
  community: AdminCommunityProfile;
  /** Fired once this community is actually banned, so the page can flip its status badge. */
  onBanned?: () => void;
}) {
  const [period, setPeriod] = useState<Period>("7d");
  const { stats } = community;

  const postCount =
    period === "24h"
      ? stats.postsLast24h
      : period === "7d"
        ? stats.postsLast7d
        : period === "30d"
          ? stats.postsLast30d
          : stats.totalPosts;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{community.name}</h2>
            {community.status === "banned" ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                <Ban className="h-3 w-3" />
                Banned
              </span>
            ) : (
              <BanButton targetType="community" targetId={community.slug} targetLabel={community.name} onBanned={onBanned} />
            )}
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {community.description || community.topic || "This community hasn't added an about description yet."}
          </p>

          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {community.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                Created {formatDate(community.createdAt)}
              </div>
            )}
            <div className="flex items-center gap-2">
              {community.visibility === "private" ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              ) : (
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              {community.visibility === "private" ? "Private" : "Public"}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              {formatMemberCount(community.memberCount)}
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
              Admin: {community.creatorHandle ?? "— (no creator on record)"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Post Activity
          </h3>

          <div className="flex items-center justify-between gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {postCount.toLocaleString()}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              Banned rate
            </span>
            <span className="text-xs font-semibold text-rose-500">
              {stats.bannedPercent}%{" "}
              <span className="font-normal text-slate-400 dark:text-slate-500">
                ({stats.bannedPosts.toLocaleString()}/{stats.totalPosts.toLocaleString()})
              </span>
            </span>
          </div>
        </div>

        {community.rules.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <ScrollText className="h-3.5 w-3.5" />
              {community.name} Rules
            </h3>
            <div className="space-y-0.5">
              {community.rules.map((rule, i) => (
                <details key={i} className="group rounded-lg px-2 py-1.5 open:bg-slate-50 dark:open:bg-slate-800">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span className="shrink-0 text-slate-400 dark:text-slate-500">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate">{rule.title}</span>
                    {rule.body && (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180 dark:text-slate-500" />
                    )}
                  </summary>
                  {rule.body && (
                    <p className="mt-1 pl-4.5 text-xs text-slate-500 dark:text-slate-400">{rule.body}</p>
                  )}
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
