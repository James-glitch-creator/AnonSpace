/**
 * Falls back to whatever hostname the browser actually used to load the page (e.g. a
 * LAN IP when opened from another device), rather than a hardcoded "localhost" that
 * only resolves back to this machine. Explicit NEXT_PUBLIC_API_URL always wins, e.g. to
 * point at a different port/domain than the default backend port.
 */
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `http://${window.location.hostname}:8000`;
  return "http://localhost:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError("Could not reach the server. Please try again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new ApiError(data.error ?? "Something went wrong. Please try again.");
  }

  return data as T;
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    throw new ApiError("Could not reach the server. Please try again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new ApiError(data.error ?? "Something went wrong. Please try again.");
  }

  return data as T;
}

function withQuery(path: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export type PublicUser = {
  id: string;
  email: string;
  handle: string;
  fullName: string | null;
  role: "user" | "admin" | "superadmin";
  createdAt: string | null;
  handleChangedAt: string | null;
  mutedNotificationTypes: NotificationType[];
};

let currentUserPromise: Promise<PublicUser | null> | null = null;

/** Memoized across the session so multiple components can ask "who am I" without duplicate requests. */
export function getCurrentUser(): Promise<PublicUser | null> {
  if (!currentUserPromise) {
    currentUserPromise = authApi.me().then(({ user }) => user).catch(() => null);
  }
  return currentUserPromise;
}

/**
 * Drops the cached identity so the next getCurrentUser() call re-fetches from the
 * server. Must run on every login/logout/signup - without it, a client-side navigation
 * (no full page reload) after switching accounts leaves every component still seeing
 * the *previous* account's role/handle, e.g. an admin who logs out and back in as a
 * regular user would still be treated as an admin until a hard refresh.
 */
export function resetCurrentUser(): void {
  currentUserPromise = null;
}

export const authApi = {
  requestSignupOtp: (email: string) =>
    request<{ success: true; message: string }>("/api/auth/register/request-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifySignupOtp: (email: string, code: string) =>
    request<{ success: true; ticket: string }>("/api/auth/register/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  completeSignup: (ticket: string, password: string) =>
    request<{ success: true; user: PublicUser }>("/api/auth/register/complete", {
      method: "POST",
      body: JSON.stringify({ ticket, password }),
    }).then((res) => {
      resetCurrentUser();
      return res;
    }),

  login: (email: string, password: string) =>
    request<{ success: true; user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).then((res) => {
      resetCurrentUser();
      return res;
    }),

  logout: () =>
    request<{ success: true }>("/api/auth/logout", { method: "POST" }).then((res) => {
      resetCurrentUser();
      return res;
    }),

  me: () => request<{ success: true; user: PublicUser }>("/api/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: true; message: string }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  /** Rolls a brand-new random anonymous name. Rate-limited server-side to once every 6 months. */
  refreshHandle: () =>
    request<{ success: true; handle: string; nextEligibleAt: string }>("/api/auth/handle/refresh", {
      method: "POST",
    }),
};

/** Admins and superadmins moderate; they don't vote, comment, share, or message. */
export function isModerator(user: PublicUser | null): boolean {
  return user?.role === "admin" || user?.role === "superadmin";
}

export type Vote = "up" | "down" | null;

export type MediaType = "none" | "photos" | "video";

/** Minimal snapshot of a reposted post, resolved live at render time - see
 *  PostView::renderEmbedded on the backend. Present only while the original is still up. */
export type RepostPreview = {
  id: string;
  communitySlug: string;
  authorHandle: string;
  body: string;
  mediaType: MediaType;
  mediaUrls: string[];
  videoUrl: string | null;
  createdAt: string;
};

export type Post = {
  id: string;
  communitySlug: string;
  authorId: string;
  authorHandle: string;
  body: string;
  mediaType: MediaType;
  mediaUrls: string[];
  videoUrl: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  /** Featured by the community's creator in its "highlights" strip. */
  isPinned: boolean;
  createdAt: string;
  myVote: Vote;
  isSaved: boolean;
  isRepost: boolean;
  /** Null if this isn't a repost, or if it is but the original is no longer available. */
  repostOf: RepostPreview | null;
};

export type Comment = {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorHandle: string;
  body: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  myVote: Vote;
};

export type ReportTargetType = "post" | "comment" | "community" | "user";

export type CommunityVisibility = "public" | "private";

/** new = latest first, old = oldest first, top = most liked, bottom = most disliked. */
export type CommunityPostSort = "new" | "old" | "top" | "bottom";

export type CommunityRule = {
  title: string;
  body: string;
};

export type Community = {
  id: string;
  slug: string;
  name: string;
  topic: string;
  /** Longer-form "About Community" text, distinct from the one-line topic. */
  description: string;
  visibility: CommunityVisibility;
  status: "active" | "banned";
  memberCount: number;
  color: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  rules: CommunityRule[];
  /** Null for communities created before this was tracked (e.g. the seeded "public" one). */
  creatorHandle: string | null;
  createdAt: string | null;
  isJoined: boolean;
  isOwner: boolean;
};

export type CommunityMember = {
  id: string;
  handle: string;
  isOwner: boolean;
  joinedAt: string | null;
};

type VoteResult = { success: true; upvotes: number; downvotes: number; myVote: Vote; banned: boolean };

export const postsApi = {
  list: (params?: { sort?: "new" | "top"; page?: number; limit?: number }) =>
    request<{ success: true; posts: Post[]; page: number }>(withQuery("/api/posts", params)),

  mine: (params?: { page?: number; limit?: number }) =>
    request<{ success: true; posts: Post[]; page: number }>(withQuery("/api/posts/mine", params)),

  saved: (params?: { page?: number; limit?: number }) =>
    request<{ success: true; posts: Post[]; page: number }>(withQuery("/api/posts/saved", params)),

  get: (id: string) => request<{ success: true; post: Post }>(`/api/posts/${id}`),

  delete: (id: string) =>
    request<{ success: true; deleted: true }>(`/api/posts/${id}`, { method: "DELETE" }),

  toggleSave: (id: string) =>
    request<{ success: true; isSaved: boolean }>(`/api/posts/${id}/save`, { method: "POST" }),

  create: (input: {
    communitySlug: string;
    body: string;
    photos?: File[];
    video?: File;
    repostOfId?: string;
  }) => {
    const formData = new FormData();
    formData.append("communitySlug", input.communitySlug);
    formData.append("body", input.body);
    if (input.repostOfId) formData.append("repostOfId", input.repostOfId);

    if (input.photos && input.photos.length > 0) {
      for (const photo of input.photos) formData.append("photos[]", photo);
    } else if (input.video) {
      formData.append("video", input.video);
    }

    return requestForm<{ success: true; post: Post }>("/api/posts", formData);
  },

  vote: (id: string, direction: Vote) =>
    request<VoteResult>(`/api/posts/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),

  listComments: (id: string, params?: { page?: number; limit?: number }) =>
    request<{ success: true; comments: Comment[] }>(withQuery(`/api/posts/${id}/comments`, params)),

  createComment: (id: string, body: string, parentId?: string | null) =>
    request<{ success: true; comment: Comment }>(`/api/posts/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parentId: parentId ?? null }),
    }),
};

export const commentsApi = {
  vote: (id: string, direction: Vote) =>
    request<VoteResult>(`/api/comments/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),
};

export const reportsApi = {
  submit: (targetType: ReportTargetType, targetId: string, reason: string, details?: string) =>
    request<{ success: true; message: string }>("/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType, targetId, reason, details: details || undefined }),
    }),
};

export const communitiesApi = {
  list: () => request<{ success: true; communities: Community[] }>("/api/communities"),

  mine: () => request<{ success: true; communities: Community[] }>("/api/communities/mine"),

  get: (slug: string) => request<{ success: true; community: Community }>(`/api/communities/${slug}`),

  listPosts: (
    slug: string,
    params?: { page?: number; limit?: number; q?: string; sort?: CommunityPostSort; pinned?: boolean }
  ) =>
    request<{ success: true; posts: Post[] }>(
      withQuery(`/api/communities/${slug}/posts`, { ...params, pinned: params?.pinned ? "true" : undefined })
    ),

  create: (input: { name: string; topic?: string; visibility?: CommunityVisibility }) =>
    request<{ success: true; community: Community }>("/api/communities", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Owner-only. `icon`/`banner` of `null` clears an existing image; `undefined` leaves it alone. */
  update: (
    slug: string,
    input: {
      description?: string;
      rules?: CommunityRule[];
      icon?: File | null;
      banner?: File | null;
    }
  ) => {
    const formData = new FormData();
    if (input.description !== undefined) formData.append("description", input.description);
    if (input.rules !== undefined) formData.append("rules", JSON.stringify(input.rules));
    if (input.icon) formData.append("icon", input.icon);
    else if (input.icon === null) formData.append("removeIcon", "1");
    if (input.banner) formData.append("banner", input.banner);
    else if (input.banner === null) formData.append("removeBanner", "1");

    return requestForm<{ success: true; community: Community }>(`/api/communities/${slug}`, formData);
  },

  join: (slug: string) =>
    request<{ success: true; isJoined: true }>(`/api/communities/${slug}/join`, { method: "POST" }),

  leave: (slug: string) =>
    request<{ success: true; isJoined: false }>(`/api/communities/${slug}/leave`, { method: "POST" }),

  members: (slug: string) =>
    request<{ success: true; members: CommunityMember[] }>(`/api/communities/${slug}/members`),

  kick: (slug: string, userId: string) =>
    request<{ success: true; kicked: true }>(`/api/communities/${slug}/members/${userId}/kick`, {
      method: "POST",
    }),

  pinPost: (slug: string, postId: string) =>
    request<{ success: true; post: Post }>(`/api/communities/${slug}/posts/${postId}/pin`, {
      method: "POST",
    }),
};

export const searchApi = {
  search: (q: string) =>
    request<{ success: true; posts: Post[]; communities: Community[] }>(withQuery("/api/search", { q })),
};

export type ChatThread = {
  id: string;
  handle: string;
  lastMessageAt: string;
  lastMessageBody: string | null;
  lastMessageSentByMe: boolean;
  isBlocked: boolean;
  isUnread: boolean;
};

export type ChatMediaType = "none" | "photo" | "video";

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  mediaType: ChatMediaType;
  mediaUrl: string | null;
  createdAt: string;
};

export const chatApi = {
  listThreads: () => request<{ success: true; threads: ChatThread[] }>("/api/chat/threads"),

  startThread: (recipientHandle: string) =>
    request<{ success: true; thread: ChatThread }>("/api/chat/threads", {
      method: "POST",
      body: JSON.stringify({ recipientHandle }),
    }),

  listMessages: (threadId: string, params?: { after?: string }) =>
    request<{ success: true; messages: ChatMessage[] }>(
      withQuery(`/api/chat/threads/${threadId}/messages`, params)
    ),

  sendMessage: (threadId: string, input: { body: string; photo?: File; video?: File }) => {
    const formData = new FormData();
    formData.append("body", input.body);
    if (input.photo) {
      formData.append("photo", input.photo);
    } else if (input.video) {
      formData.append("video", input.video);
    }

    return requestForm<{ success: true; message: ChatMessage }>(
      `/api/chat/threads/${threadId}/messages`,
      formData
    );
  },

  markRead: (threadId: string) =>
    request<{ success: true; read: true }>(`/api/chat/threads/${threadId}/read`, { method: "POST" }),

  hasUnread: () => request<{ success: true; hasUnread: boolean }>("/api/chat/unread"),
};

export type UserSearchResult = {
  id: string;
  handle: string;
  isBlocked: boolean;
};

export type BlockedUser = { id: string; handle: string };

export const usersApi = {
  search: (q: string) =>
    request<{ success: true; users: UserSearchResult[] }>(withQuery("/api/users/search", { q })),

  listBlocked: () => request<{ success: true; users: BlockedUser[] }>("/api/users/blocked"),

  block: (handle: string) =>
    request<{ success: true; isBlocked: true }>("/api/users/block", {
      method: "POST",
      body: JSON.stringify({ handle }),
    }),

  unblock: (handle: string) =>
    request<{ success: true; isBlocked: false }>("/api/users/unblock", {
      method: "POST",
      body: JSON.stringify({ handle }),
    }),
};

export type NotificationType =
  | "reported"
  | "content_banned"
  | "account_banned"
  | "community_banned"
  | "report_approved"
  | "report_dismissed";

export type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  targetType: ReportTargetType | null;
  targetId: string | null;
  isRead: boolean;
  createdAt: string;
};

export const notificationsApi = {
  list: () =>
    request<{ success: true; notifications: Notification[]; unreadCount: number }>("/api/notifications"),

  markRead: (id: string) =>
    request<{ success: true; read: true }>(`/api/notifications/${id}/read`, { method: "POST" }),

  markAllRead: () =>
    request<{ success: true; read: true }>("/api/notifications/read-all", { method: "POST" }),

  updatePreferences: (mutedTypes: NotificationType[]) =>
    request<{ success: true; mutedTypes: NotificationType[] }>("/api/notifications/preferences", {
      method: "POST",
      body: JSON.stringify({ mutedTypes }),
    }),
};

export type AdminReport = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  /** Only set for comment reports - the post the comment actually lives in. */
  postId: string | null;
  preview: string;
  /** For post/comment reports, the community they're in; for community reports, its own slug. */
  communitySlug: string | null;
  reason: string;
  details: string | null;
  reporterHandle: string;
  createdAt: string;
};

export type BanLogTargetType = "Post" | "Comment" | "User" | "Community";

export type BanLogEntry = {
  id: string;
  targetType: BanLogTargetType;
  targetId: string;
  preview: string;
  communitySlug: string | null;
  finalRatio: number | null;
  reason: string;
  /** Null means the automatic downvote-ratio system did this, not a person. */
  bannedByHandle: string | null;
  createdAt: string;
};

/** 'today' is the calendar day so far (midnight UTC); '7d'/'30d' are rolling windows from
 *  right now - same vocabulary as the Reports page's own range picker. */
export type AdminStatsRange = "today" | "7d" | "30d";

export type AdminStats = {
  accountCount: number;
  /** New accounts within the selected range. */
  newAccounts: number;
  /** New posts + comments within the selected range. */
  newContent: number;
  /** Automatic downvote-ratio bans within the selected range. */
  autoBans: number;
  /** Reports awaiting review right now - not range-scoped, it's a queue size. */
  pendingReports: number;
  nearThresholdCount: number;
  activeCommunities: number;
};

export type AdminAction = {
  id: string;
  action: "ban" | "dismiss";
  targetType: ReportTargetType;
  preview: string;
  reason: string;
  adminHandle: string;
  at: string;
};

/** One entry in a superadmin's own audit trail - granting or revoking admin access.
 *  Separate from AdminAction, which is moderation (ban/dismiss) history. */
export type AdminAccountLogEntry = {
  id: string;
  action: "granted" | "revoked";
  targetHandle: string;
  performedByHandle: string;
  at: string;
};

export type AdminUserSearchResult = {
  id: string;
  handle: string;
  role: "user" | "admin" | "superadmin";
  status: "active" | "banned";
};

export type AdminUserProfile = AdminUserSearchResult & {
  createdAt: string | null;
};

// Same shape as Comment, plus a bit of extra context so the admin panel can render it
// through the exact same CommentItem component regular users see.
export type AdminUserComment = Comment & {
  /** Null if the parent post was deleted. */
  postPreview: string | null;
  communitySlug: string | null;
};

export type AdminCommunityStats = {
  /** Every post ever made here, any status - the denominator for bannedPercent, not just
   *  what's currently visible. */
  totalPosts: number;
  bannedPosts: number;
  bannedPercent: number;
  postsLast24h: number;
  postsLast7d: number;
  postsLast30d: number;
};

// creatorHandle already lives on Community; AdminGetCommunity just fills it in with a
// live lookup for older communities that predate the field being denormalized.
export type AdminCommunityProfile = Community & { stats: AdminCommunityStats };

export type AdminCommunitySearchResult = {
  id: string;
  slug: string;
  name: string;
  memberCount: number;
  visibility: CommunityVisibility;
  color: string;
};

/** What Report and the direct-ban dialog both offer - a ban always records one of these,
 *  same vocabulary the reporting flow uses. */
export const MODERATION_REASONS = [
  "Spam or scam",
  "Harassment or hate speech",
  "Misinformation",
  "Illegal content",
  "Off-topic",
  "Other",
];

export type BanTargetType = "post" | "comment" | "user" | "community";

const BAN_PATHS: Record<BanTargetType, (idOrSlug: string) => string> = {
  post: (id) => `/api/admin/posts/${id}/ban`,
  comment: (id) => `/api/admin/comments/${id}/ban`,
  user: (id) => `/api/admin/users/${id}/ban`,
  community: (slug) => `/api/admin/communities/${encodeURIComponent(slug)}/ban`,
};

export const adminApi = {
  overview: (range: AdminStatsRange = "today") =>
    request<{ success: true; stats: AdminStats; adminActions: AdminAction[] }>(
      withQuery("/api/admin/overview", { range })
    ),

  /** Account lookup - admin/moderation tool, not available to regular users. */
  searchUsers: (q: string) =>
    request<{ success: true; users: AdminUserSearchResult[] }>(withQuery("/api/admin/users/search", { q })),

  getUserProfile: (handle: string) =>
    request<{ success: true; user: AdminUserProfile }>(`/api/users/${encodeURIComponent(handle)}`),

  listUserPosts: (handle: string, params?: { page?: number; limit?: number }) =>
    request<{ success: true; posts: Post[]; page: number }>(
      withQuery(`/api/users/${encodeURIComponent(handle)}/posts`, params)
    ),

  listUserComments: (handle: string, params?: { page?: number; limit?: number }) =>
    request<{ success: true; comments: AdminUserComment[]; page: number }>(
      withQuery(`/api/users/${encodeURIComponent(handle)}/comments`, params)
    ),

  /** Community lookup - admin/moderation tool, not available to regular users. Matches
   *  by name or slug, and includes private communities. */
  searchCommunities: (q: string) =>
    request<{ success: true; communities: AdminCommunitySearchResult[] }>(
      withQuery("/api/admin/communities/search", { q })
    ),

  /** Community lookup - unlike communitiesApi, works for private communities regardless
   *  of the admin's own membership. */
  getCommunity: (slug: string) =>
    request<{ success: true; community: AdminCommunityProfile }>(
      `/api/admin/communities/${encodeURIComponent(slug)}`
    ),

  listCommunityPosts: (
    slug: string,
    params?: { page?: number; limit?: number; q?: string; sort?: CommunityPostSort; pinned?: boolean }
  ) =>
    request<{ success: true; posts: Post[] }>(
      withQuery(`/api/admin/communities/${encodeURIComponent(slug)}/posts`, {
        ...params,
        pinned: params?.pinned ? "true" : undefined,
      })
    ),

  listPosts: (params?: { q?: string; sort?: "new" | "top"; page?: number; limit?: number }) =>
    request<{ success: true; posts: Post[] }>(withQuery("/api/admin/posts", params)),

  /** Bans a post, comment, account, or community straight from the admin panel - no
   *  report needed first. `idOrSlug` is the target's id, except for communities, which
   *  are addressed by slug the same way the rest of the admin community endpoints are. */
  ban: (targetType: BanTargetType, idOrSlug: string, reason: string, details?: string) =>
    request<{ success: true; banned: true }>(BAN_PATHS[targetType](idOrSlug), {
      method: "POST",
      body: JSON.stringify({ reason, details }),
    }),

  listReports: () => request<{ success: true; reports: AdminReport[] }>("/api/admin/reports"),

  reviewReport: (id: string, action: "approve" | "dismiss") =>
    request<{ success: true; status: "reviewed" | "dismissed" }>(`/api/admin/reports/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  listBanLogs: () => request<{ success: true; banLogs: BanLogEntry[] }>("/api/admin/ban-logs"),

  /** Superadmin only - admin accounts have no self-signup path. */
  listAccounts: () => request<{ success: true; accounts: PublicUser[] }>("/api/admin/accounts"),

  revokeAccount: (id: string) =>
    request<{ success: true; revoked: true }>(`/api/admin/accounts/${id}/revoke`, { method: "POST" }),

  /** Superadmin only - the grant/revoke history behind the Admins page. */
  getAccountLog: () => request<{ success: true; log: AdminAccountLogEntry[] }>("/api/admin/accounts/log"),

  /** Superadmin only - one admin's ban/dismissal history, for the page reached by
   *  tapping their name on the Admins list. */
  getAccountActions: (id: string) =>
    request<{ success: true; admin: PublicUser; actions: AdminAction[] }>(
      `/api/admin/accounts/${id}/actions`
    ),

  // Admin registration - same OTP-verified flow as regular signup, but superadmin-gated
  // at every step and collects a full name.
  requestSignupOtp: (email: string) =>
    request<{ success: true; message: string }>("/api/admin/accounts/request-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifySignupOtp: (email: string, code: string) =>
    request<{ success: true; ticket: string }>("/api/admin/accounts/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  completeSignup: (ticket: string, fullName: string, password: string) =>
    request<{ success: true; user: PublicUser }>("/api/admin/accounts/complete", {
      method: "POST",
      body: JSON.stringify({ ticket, fullName, password }),
    }),
};
