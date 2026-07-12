import { PostCard } from "@/components/post-card";
import { RightRail } from "@/components/right-rail";
import { posts } from "@/lib/data";

export default function PopularPostsPage() {
  const sorted = [...posts].sort(
    (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
  );

  return (
    <>
      <main className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Popular Posts</h1>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            Sorted by upvotes across all communities.
          </p>
        </div>
        {sorted.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </main>
      <RightRail />
    </>
  );
}
