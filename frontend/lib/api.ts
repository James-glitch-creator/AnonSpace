export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  role: "user" | "admin";
  createdAt: string | null;
};

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
    }),

  login: (email: string, password: string) =>
    request<{ success: true; user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ success: true }>("/api/auth/logout", { method: "POST" }),

  me: () => request<{ success: true; user: PublicUser }>("/api/auth/me"),
};

let currentUserPromise: Promise<PublicUser | null> | null = null;

/** Memoized across the session so multiple components can ask "who am I" without duplicate requests. */
export function getCurrentUser(): Promise<PublicUser | null> {
  if (!currentUserPromise) {
    currentUserPromise = authApi.me().then(({ user }) => user).catch(() => null);
  }
  return currentUserPromise;
}

export type Vote = "up" | "down" | null;

export type MediaType = "none" | "photos" | "video";

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
  createdAt: string;
  myVote: Vote;
  isSaved: boolean;
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

export type Community = {
  id: string;
  slug: string;
  name: string;
  topic: string;
  visibility: CommunityVisibility;
  memberCount: number;
  color: string;
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

  create: (input: { communitySlug: string; body: string; photos?: File[]; video?: File }) => {
    const formData = new FormData();
    formData.append("communitySlug", input.communitySlug);
    formData.append("body", input.body);

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
    params?: { page?: number; limit?: number; q?: string; sort?: CommunityPostSort }
  ) => request<{ success: true; posts: Post[] }>(withQuery(`/api/communities/${slug}/posts`, params)),

  create: (input: { name: string; topic?: string; visibility?: CommunityVisibility }) =>
    request<{ success: true; community: Community }>("/api/communities", {
      method: "POST",
      body: JSON.stringify(input),
    }),

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

export const usersApi = {
  search: (q: string) =>
    request<{ success: true; users: UserSearchResult[] }>(withQuery("/api/users/search", { q })),

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
