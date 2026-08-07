"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/post-card";
import { RightRail } from "@/components/right-rail";
import { postsApi, type Post } from "@/lib/api";

export default function LatestPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    postsApi
      .list({ sort: "new" })
      .then(({ posts }) => setPosts(posts))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <main className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Latest Posts</h1>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            No posts yet. Be the first to post!
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </main>
      <RightRail />
    </>
  );
}
