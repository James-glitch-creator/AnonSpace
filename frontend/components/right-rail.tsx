"use client";

import { ChevronDown, Crown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CommunityAvatar } from "@/components/community-avatar";
import { communitiesApi, type Community } from "@/lib/api";
import { formatMemberCount } from "@/lib/format";

const TRENDING_PAGE_SIZE = 5;

// "public" is the implicit default posting destination, not a real user-created community —
// it shouldn't show up as something to discover/trend toward.
const NON_COMMUNITY_SLUGS = new Set(["public"]);

function CommunityRow({ c, ownerBadge = false }: { c: Community; ownerBadge?: boolean }) {
  return (
    <Link
      href={`/c/${c.slug}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <CommunityAvatar community={c} className="h-8 w-8" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
          {c.name}
          {ownerBadge && <Crown className="h-3 w-3 shrink-0 text-amber-500" />}
        </span>
        <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
          {formatMemberCount(c.memberCount)}
        </span>
      </span>
    </Link>
  );
}

export function RightRail() {
  const [trending, setTrending] = useState<Community[]>([]);
  const [trendingExpanded, setTrendingExpanded] = useState(false);
  const [created, setCreated] = useState<Community[]>([]);

  useEffect(() => {
    communitiesApi
      .list()
      .then(({ communities }) => setTrending(communities.filter((c) => !NON_COMMUNITY_SLUGS.has(c.slug))))
      .catch(() => {});

    communitiesApi
      .mine()
      .then(({ communities }) =>
        setCreated(communities.filter((c) => c.isOwner && !NON_COMMUNITY_SLUGS.has(c.slug)))
      )
      .catch(() => {});
  }, []);

  const visibleTrending = trendingExpanded ? trending : trending.slice(0, TRENDING_PAGE_SIZE);
  const hasMoreTrending = !trendingExpanded && trending.length > TRENDING_PAGE_SIZE;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {trending.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Trending Communities
              </h3>
              <div className="space-y-1">
                {visibleTrending.map((c) => (
                  <CommunityRow key={c.slug} c={c} />
                ))}
              </div>
              {hasMoreTrending && (
                <button
                  type="button"
                  onClick={() => setTrendingExpanded(true)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-cyan-600 transition-all duration-200 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  More
                </button>
              )}
            </div>
          )}

          {created.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                My Communities
              </h3>
              <div className="space-y-1">
                {created.map((c) => (
                  <CommunityRow key={c.slug} c={c} ownerBadge />
                ))}
              </div>
            </div>
          )}

          <Link
            href="/communities/new"
            className="block w-full rounded-full bg-cyan-500 px-3 py-2 text-center text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600"
          >
            + New Community
          </Link>
        </div>
      </div>
    </aside>
  );
}
