import Link from "next/link";
import { trendingCommunities } from "@/lib/data";

export function RightRail() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            Trending Communities
          </h3>
          <div className="space-y-1">
            {trendingCommunities.map((c) => (
              <Link
                key={c.slug}
                href={`/c/${c.slug}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className={`h-8 w-8 shrink-0 rounded-full ${c.color}`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    c/{c.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                    {c.members}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/search"
            className="mt-2 block rounded-lg px-2 py-1.5 text-center text-xs font-semibold text-cyan-600 transition-all duration-200 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
          >
            See More
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            Start a Community
          </h3>
          <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
            Create your own anonymous community around a shared topic.
          </p>
          <Link
            href="/settings"
            className="block rounded-full bg-cyan-500 px-3 py-2 text-center text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600"
          >
            + New Community
          </Link>
        </div>
      </div>
    </aside>
  );
}
