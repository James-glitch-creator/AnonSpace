"use client";

import { ChevronRight, Crown, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { communitiesApi, type Community } from "@/lib/api";
import { formatMemberCount } from "@/lib/format";

const TRENDING_LIMIT = 5;

// "public" is the implicit default posting destination, not a real user-created community —
// it shouldn't show up as something to discover/trend toward.
const NON_COMMUNITY_SLUGS = new Set(["public"]);

function CommunityRow({
  c,
  onNavigate,
}: {
  c: Community;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={`/c/${c.slug}`}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <span className={`h-7 w-7 shrink-0 rounded-full ${c.color}`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
          {c.name}
          {c.isOwner && <Crown className="h-3 w-3 shrink-0 text-amber-500" />}
        </span>
        <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
          {formatMemberCount(c.memberCount)}
        </span>
      </span>
    </Link>
  );
}

export function MobileMenu({ handle }: { handle: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [trending, setTrending] = useState<Community[]>([]);
  const [mine, setMine] = useState<Community[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    communitiesApi
      .list()
      .then(({ communities }) =>
        setTrending(
          communities.filter((c) => !NON_COMMUNITY_SLUGS.has(c.slug)),
        ),
      )
      .catch(() => {});
    communitiesApi
      .mine()
      .then(({ communities }) => setMine(communities.filter((c) => !NON_COMMUNITY_SLUGS.has(c.slug))))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-cyan-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-400 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            <div className="relative flex h-full w-64 max-w-[65%] flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <Link
                href="/profile"
                className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-200 hover:border-cyan-400 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white">
                  <User className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {handle ?? "Anonymous"}
                  </span>
                  <span className="block text-xs text-slate-400 dark:text-slate-500">
                    View your posts
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
              </Link>

              {trending.length > 0 && (
                <div className="mb-5">
                  <h3 className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Trending Communities
                  </h3>
                  <div className="space-y-1">
                    {trending.slice(0, TRENDING_LIMIT).map((c) => (
                      <CommunityRow
                        key={c.slug}
                        c={c}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5">
                <h3 className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  My Communities
                </h3>
                {mine.length === 0 ? (
                  <p className="px-2 text-xs text-slate-400 dark:text-slate-500">
                    Join a community to see it here.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {mine.map((c) => (
                      <CommunityRow
                        key={c.slug}
                        c={c}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/communities/new"
                className="mt-auto block w-full rounded-full bg-cyan-500 px-3 py-2 text-center text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600"
              >
                + New Community
              </Link>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
