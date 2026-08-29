"use client";

import { Ban, ShieldCheck, VenetianMask } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BanButton } from "@/components/admin/ban-button";
import { PostCard } from "@/components/post-card";
import { adminApi, type AdminUserProfile, type Post } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

export default function AdminUserProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getUserProfile(handle), adminApi.listUserPosts(handle)])
      .then(([profileRes, postsRes]) => {
        setProfile(profileRes.user);
        setPosts(postsRes.posts);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [handle]);

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>;
  }

  if (notFound || !profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
        Account not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <VenetianMask className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">
              {profile.handle}
            </h1>
            {profile.createdAt && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Joined {formatRelativeTime(profile.createdAt)}
              </p>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {profile.status === "banned" && (
              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                <Ban className="h-3 w-3" />
                Banned
              </span>
            )}
            {(profile.role === "admin" || profile.role === "superadmin") && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                <ShieldCheck className="h-3 w-3" />
                {profile.role}
              </span>
            )}
            {/* Admin/superadmin accounts can't be banned this way - see AccountModeration -
                so the button only shows for regular users who aren't already banned. */}
            {profile.role === "user" && profile.status !== "banned" && (
              <BanButton
                targetType="user"
                targetId={profile.id}
                targetLabel={profile.handle}
                onBanned={() => setProfile((prev) => (prev ? { ...prev, status: "banned" } : prev))}
              />
            )}
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          {profile.handle} hasn&apos;t posted anything.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
