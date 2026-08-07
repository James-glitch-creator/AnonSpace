"use client";

import { Lock, Search, UserX } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ManageMembersModal } from "@/components/manage-members-modal";
import { PostCard } from "@/components/post-card";
import { ReportButton } from "@/components/report-button";
import { communitiesApi, type Community, type CommunityPostSort, type Post } from "@/lib/api";
import { formatMemberCount } from "@/lib/format";

const SORT_OPTIONS: { value: CommunityPostSort; label: string }[] = [
  { value: "new", label: "Latest to oldest" },
  { value: "old", label: "Oldest to latest" },
  { value: "top", label: "Most liked" },
  { value: "bottom", label: "Most disliked" },
];

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [postQuery, setPostQuery] = useState("");
  const [postSort, setPostSort] = useState<CommunityPostSort>("new");
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  useEffect(() => {
    communitiesApi
      .get(slug)
      .then((communityRes) => {
        setCommunity(communityRes.community);
        const canSeePosts = communityRes.community.visibility === "public" || communityRes.community.isJoined;
        if (canSeePosts) {
          return communitiesApi.listPosts(slug).then((postsRes) => setPosts(postsRes.posts));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const canSeePosts = community ? community.visibility === "public" || community.isJoined : false;

  useEffect(() => {
    if (isLoading || !canSeePosts) return;

    const timeout = setTimeout(() => {
      setIsLoadingPosts(true);
      communitiesApi
        .listPosts(slug, { q: postQuery.trim() || undefined, sort: postSort })
        .then(({ posts }) => setPosts(posts))
        .catch(() => {})
        .finally(() => setIsLoadingPosts(false));
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, postQuery, postSort, canSeePosts]);

  async function toggleMembership() {
    if (!community || isJoining) return;
    setIsJoining(true);
    try {
      const result = community.isJoined
        ? await communitiesApi.leave(community.slug)
        : await communitiesApi.join(community.slug);
      setCommunity((prev) =>
        prev
          ? {
              ...prev,
              isJoined: result.isJoined,
              memberCount: prev.memberCount + (result.isJoined ? 1 : -1),
            }
          : prev
      );
    } catch {
      // Leave membership state unchanged on failure.
    } finally {
      setIsJoining(false);
    }
  }

  function handlePostDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  if (isLoading) {
    return (
      <main className="col-span-1 space-y-4 lg:col-span-2">
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
      </main>
    );
  }

  if (notFound || !community) {
    return (
      <main className="col-span-1 space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          Community not found.
        </div>
      </main>
    );
  }

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className={`h-12 w-12 shrink-0 rounded-full ${community.color}`} />
          <div>
            <h1 className="flex items-center gap-1.5 text-lg font-bold text-slate-800 dark:text-slate-100">
              c/{community.name}
              {community.visibility === "private" && (
                <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              )}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatMemberCount(community.memberCount)}
            </p>
            {community.topic && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{community.topic}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {community.isOwner ? (
              <button
                type="button"
                onClick={() => setIsManagingMembers(true)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <UserX className="h-3.5 w-3.5" />
                Kick Member
              </button>
            ) : (
              <>
                <ReportButton
                  targetType="community"
                  targetId={community.id}
                  targetLabel={community.name}
                />
                <button
                  type="button"
                  disabled={isJoining}
                  onClick={toggleMembership}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                    community.isJoined
                      ? "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      : "bg-cyan-500 text-white hover:bg-cyan-600"
                  }`}
                >
                  {community.isJoined ? "Joined" : "Join"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isManagingMembers && community && (
        <ManageMembersModal
          slug={community.slug}
          onClose={() => setIsManagingMembers(false)}
          onKicked={() =>
            setCommunity((prev) => (prev ? { ...prev, memberCount: prev.memberCount - 1 } : prev))
          }
        />
      )}

      {!canSeePosts ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Lock className="h-6 w-6 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            c/{community.name} is a private community.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Join to see its posts.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={postQuery}
                onChange={(e) => setPostQuery(e.target.value)}
                type="text"
                placeholder={`Search posts in c/${community.name}...`}
                className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
              />
            </div>
            <select
              value={postSort}
              onChange={(e) => setPostSort(e.target.value as CommunityPostSort)}
              className="rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-cyan-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {isLoadingPosts ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
              {postQuery.trim()
                ? `No posts match "${postQuery.trim()}".`
                : `No posts yet in c/${community.name}.`}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handlePostDeleted}
                canModerate={community.isOwner}
              />
            ))
          )}
        </>
      )}
    </main>
  );
}
