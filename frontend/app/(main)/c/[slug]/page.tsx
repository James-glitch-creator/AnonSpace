import { notFound } from "next/navigation";
import { PostCard } from "@/components/post-card";
import { communities, posts, trendingCommunities } from "@/lib/data";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = [...communities, ...trendingCommunities].find((c) => c.slug === slug);

  if (!community) notFound();

  const communityPosts = posts.filter(
    (p) => p.community.toLowerCase() === `c/${community.name}`.toLowerCase()
  );

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className={`h-12 w-12 shrink-0 rounded-full ${community.color}`} />
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              c/{community.name}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">{community.members}</p>
          </div>
          <button className="ml-auto rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600">
            Join
          </button>
        </div>
      </div>

      {communityPosts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          No posts yet in c/{community.name}.
        </div>
      ) : (
        communityPosts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </main>
  );
}
