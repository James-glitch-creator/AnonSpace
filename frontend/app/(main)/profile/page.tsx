"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/post-card";
import { postsApi, type Post } from "@/lib/api";

export default function ProfilePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    postsApi
      .mine()
      .then(({ posts }) => setPosts(posts))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  function handleDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Your Posts</h1>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          You haven&apos;t posted anything yet.
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} onDelete={handleDeleted} />)
      )}
    </main>
  );
}
