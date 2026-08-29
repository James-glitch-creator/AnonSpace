"use client";

import { Lock, MoreHorizontal, Pin, PinOff, Plus, Search, Settings, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CommunitySidebar } from "@/components/community-sidebar";
import { EditCommunityModal } from "@/components/edit-community-modal";
import { ManageMembersModal } from "@/components/manage-members-modal";
import { PostCard } from "@/components/post-card";
import { ReportButton } from "@/components/report-button";
import { API_BASE_URL, communitiesApi, type Community, type CommunityPostSort, type Post } from "@/lib/api";

const SORT_OPTIONS: { value: CommunityPostSort; label: string }[] = [
  { value: "new", label: "Latest to oldest" },
  { value: "old", label: "Oldest to latest" },
  { value: "top", label: "Most liked" },
  { value: "bottom", label: "Most disliked" },
];

function PinnedPostCard({
  post,
  canModerate,
  onUnpinned,
}: {
  post: Post;
  canModerate: boolean;
  onUnpinned: (id: string) => void;
}) {
  const [isUnpinning, setIsUnpinning] = useState(false);

  async function unpin() {
    if (isUnpinning) return;
    setIsUnpinning(true);
    try {
      await communitiesApi.pinPost(post.communitySlug, post.id);
      onUnpinned(post.id);
    } catch {
      setIsUnpinning(false);
    }
  }

  return (
    <Link
      href={`/post/${post.id}`}
      className="group relative flex w-56 shrink-0 flex-col gap-2 rounded-xl border border-slate-200 p-3 transition-all duration-200 hover:border-cyan-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-cyan-800"
    >
      {canModerate && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            unpin();
          }}
          disabled={isUnpinning}
          aria-label="Unpin post"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-400 opacity-0 shadow transition-all duration-200 hover:text-rose-500 group-hover:opacity-100 disabled:cursor-not-allowed dark:bg-slate-900/90"
        >
          <PinOff className="h-3.5 w-3.5" />
        </button>
      )}
      {post.mediaType === "photos" && post.mediaUrls[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${API_BASE_URL}${post.mediaUrls[0]}`} alt="" className="h-24 w-full rounded-lg object-cover" />
      )}
      <p className="line-clamp-3 text-xs font-medium text-slate-700 dark:text-slate-200">{post.body}</p>
      <span className="mt-auto text-[11px] text-slate-400 dark:text-slate-500">
        {(post.upvotes - post.downvotes).toLocaleString()} pts &middot; {post.commentCount} comments
      </span>
    </Link>
  );
}

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [highlightsExpanded, setHighlightsExpanded] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [postQuery, setPostQuery] = useState("");
  const [postSort, setPostSort] = useState<CommunityPostSort>("new");
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    communitiesApi
      .get(slug)
      .then((communityRes) => {
        setCommunity(communityRes.community);
        const canSeePosts = communityRes.community.visibility === "public" || communityRes.community.isJoined;
        if (canSeePosts) {
          communitiesApi
            .listPosts(slug, { pinned: true, limit: 4 })
            .then(({ posts }) => setPinnedPosts(posts))
            .catch(() => {});
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

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

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
    setPinnedPosts((prev) => prev.filter((p) => p.id !== id));
  }

  function handlePinChange() {
    // Simplest way to keep the highlights strip correct (add/reorder/remove) without
    // hand-reconciling two lists - pinning is an infrequent owner-only action.
    communitiesApi
      .listPosts(slug, { pinned: true, limit: 4 })
      .then(({ posts }) => setPinnedPosts(posts))
      .catch(() => {});
  }

  function handleUnpinnedFromHighlights(id: string) {
    setPinnedPosts((prev) => prev.filter((p) => p.id !== id));
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, isPinned: false } : p)));
  }

  if (isLoading) {
    return (
      <main className="col-span-1 space-y-4">
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
      </main>
    );
  }

  if (notFound || !community) {
    return (
      <main className="col-span-1 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          Community not found.
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="col-span-1 space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className={`h-28 sm:h-40 ${community.bannerUrl ? "" : community.color}`}>
            {community.bannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${API_BASE_URL}${community.bannerUrl}`} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          <div className="px-4 pb-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="-mt-10 flex items-end gap-3 sm:-mt-12">
                <span className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm dark:border-slate-900 dark:bg-slate-800 sm:h-24 sm:w-24">
                  {community.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${API_BASE_URL}${community.iconUrl}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className={`flex h-full w-full items-center justify-center text-2xl font-bold text-white ${community.color}`}
                    >
                      {community.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <div className="pb-1">
                  <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{community.name}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 pb-1">
                <Link
                  href={`/submit?c=${community.slug}`}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Post
                </Link>

                {/* "public" is the implicit default posting destination, not a real
                    user-created community — there's nothing to join, own, or report here. */}
                {community.slug !== "public" && (
                  <>
                    {!community.isOwner && (
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
                    )}

                    <div className="relative" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() => setIsMenuOpen((v) => !v)}
                        aria-label="Community options"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 space-y-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                          {community.isOwner ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditing(true);
                                  setIsMenuOpen(false);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <Settings className="h-4 w-4" />
                                Edit community
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsManagingMembers(true);
                                  setIsMenuOpen(false);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <UserX className="h-4 w-4" />
                                Manage members
                              </button>
                            </>
                          ) : (
                            <ReportButton
                              targetType="community"
                              targetId={community.id}
                              targetLabel={community.name}
                              variant="menu-item"
                              onReported={() => setIsMenuOpen(false)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {isManagingMembers && (
          <ManageMembersModal
            slug={community.slug}
            onClose={() => setIsManagingMembers(false)}
            onKicked={() =>
              setCommunity((prev) => (prev ? { ...prev, memberCount: prev.memberCount - 1 } : prev))
            }
          />
        )}

        {isEditing && (
          <EditCommunityModal
            community={community}
            onClose={() => setIsEditing(false)}
            onSaved={(updated) => {
              setCommunity(updated);
              setIsEditing(false);
            }}
          />
        )}

        {!canSeePosts ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Lock className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {community.name} is a private community.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Join to see its posts.</p>
          </div>
        ) : (
          <>
            {pinnedPosts.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setHighlightsExpanded((v) => !v)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left"
                >
                  <Pin className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Community highlights
                  </span>
                  <span
                    className={`ml-auto text-xs text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
                      highlightsExpanded ? "rotate-180" : ""
                    }`}
                  >
                    &#9660;
                  </span>
                </button>
                {highlightsExpanded && (
                  <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-4">
                    {pinnedPosts.map((post) => (
                      <PinnedPostCard
                        key={post.id}
                        post={post}
                        canModerate={community.isOwner}
                        onUnpinned={handleUnpinnedFromHighlights}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={postQuery}
                  onChange={(e) => setPostQuery(e.target.value)}
                  type="text"
                  placeholder={`Search posts in ${community.name}...`}
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
                  : `No posts yet in ${community.name}.`}
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handlePostDeleted}
                  canModerate={community.isOwner}
                  onPinChange={handlePinChange}
                />
              ))
            )}
          </>
        )}
      </main>

      <CommunitySidebar community={community} />
    </>
  );
}
