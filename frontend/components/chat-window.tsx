"use client";

import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  ShieldOff,
  UserX,
  VenetianMask,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  API_BASE_URL,
  ApiError,
  chatApi,
  getCurrentUser,
  isModerator,
  usersApi,
  type ChatMessage,
  type ChatThread as ChatThreadSummary,
  type UserSearchResult,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { useChat } from "./chat-context";

const POLL_INTERVAL_MS = 3000;
const CHAT_UNREAD_POLL_INTERVAL_MS = 15000;

export function ChatWindow() {
  const { activeHandle } = useChat();
  const isDesktop = useIsDesktop();

  // Desktop always has somewhere to dock (the trending-community column), so the panel
  // is always mounted — but it starts collapsed to a small tab and only slides open once
  // clicked, showing the thread list until a conversation is picked. Below `lg` there's
  // no column to dock to, so we fall back to a full-screen takeover, and only when a
  // conversation is active.
  if (isDesktop) return <DesktopChatDock />;

  if (!activeHandle) return null;
  return <MobileChatPanel key={activeHandle} handle={activeHandle} />;
}

function useChatThread(handle: string) {
  const { takePendingShareBody } = useChat();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Lazy initializer, not a plain default: this reads (and clears) a link stashed by the
  // post-card Share button exactly once, when this conversation first mounts - not on
  // every re-render, and not leaking into whichever conversation opens next.
  const [body, setBody] = useState(() => takePendingShareBody() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File; kind: "photo" | "video"; previewUrl: string } | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | undefined>(undefined);
  const attachInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrentUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    chatApi
      .startThread(handle)
      .then(({ thread }) => {
        setThreadId(thread.id);
        setIsBlocked(thread.isBlocked);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."));
  }, [handle]);

  async function toggleBlock() {
    if (!isBlocked && !window.confirm(`Block ${handle}? You won't be able to message each other until you unblock them.`)) {
      return;
    }
    setError(null);
    try {
      if (isBlocked) {
        await usersApi.unblock(handle);
        setIsBlocked(false);
      } else {
        await usersApi.block(handle);
        setIsBlocked(true);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;

    function poll() {
      if (!threadId) return;
      chatApi
        .listMessages(threadId, { after: lastMessageIdRef.current })
        .then(({ messages: incoming }) => {
          if (cancelled || incoming.length === 0) return;
          lastMessageIdRef.current = incoming[incoming.length - 1].id;
          setMessages((prev) => [...prev, ...incoming]);
        })
        .catch(() => {});
      // While this window is open, keep the thread marked read — covers both the
      // initial open and any message that arrives while you're actively viewing it.
      chatApi.markRead(threadId).catch(() => {});
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Revoke the object URL whenever the attachment changes or the panel unmounts, so we
  // don't leak blob URLs while the window stays open across several picks.
  useEffect(() => {
    return () => {
      if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment]);

  function pickAttachment(file: File | undefined) {
    if (!file) return;
    const kind = file.type.startsWith("video/") ? "video" : "photo";
    if (kind === "photo" && !file.type.startsWith("image/")) {
      setError("Only photos and videos can be attached.");
      return;
    }
    setAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, kind, previewUrl: URL.createObjectURL(file) };
    });
  }

  function clearAttachment() {
    setAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (attachInputRef.current) attachInputRef.current.value = "";
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if ((!text && !attachment) || !threadId || isSending) return;

    setIsSending(true);
    setError(null);
    try {
      const { message } = await chatApi.sendMessage(threadId, {
        body: text,
        photo: attachment?.kind === "photo" ? attachment.file : undefined,
        video: attachment?.kind === "video" ? attachment.file : undefined,
      });
      lastMessageIdRef.current = message.id;
      setMessages((prev) => [...prev, message]);
      setBody("");
      clearAttachment();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  }

  // Refs are returned separately from plain state (rather than folded into one object)
  // so consumers can pass each down as its own prop — an object mixing refs with regular
  // values makes it impossible for anything reading a field off it during render to tell
  // the two apart.
  return {
    state: {
      threadId,
      messages,
      currentUserId,
      body,
      setBody,
      error,
      isSending,
      isBlocked,
      attachment,
      toggleBlock,
      pickAttachment,
      clearAttachment,
      handleSend,
    },
    scrollRef,
    attachInputRef,
  };
}

type ChatState = ReturnType<typeof useChatThread>["state"];

function ChatHeader({
  handle,
  isBlocked,
  onToggleBlock,
  onClose,
  onBack,
  backLabel = "Back to conversations",
  onCollapse,
}: {
  handle: string;
  isBlocked: boolean;
  onToggleBlock: () => void;
  onClose?: () => void;
  onBack?: () => void;
  backLabel?: string;
  onCollapse?: () => void;
}) {
  return (
    <div className="flex shrink-0 select-none items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          title="Back"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <VenetianMask className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
        {handle}
      </span>
      <button
        type="button"
        onClick={onToggleBlock}
        aria-label={isBlocked ? `Unblock ${handle}` : `Block ${handle}`}
        title={isBlocked ? "Unblock" : "Block"}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400"
      >
        {isBlocked ? <ShieldOff className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
      </button>
      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Minimize chat"
          title="Minimize"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ChatMessages({
  handle,
  messages,
  currentUserId,
  scrollRef,
}: {
  handle: string;
  messages: ChatState["messages"];
  currentUserId: ChatState["currentUserId"];
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      {messages.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">Say hello to {handle}.</p>
      ) : (
        messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm ${
              m.senderId === currentUserId
                ? "ml-auto rounded-tr-sm bg-cyan-500 text-white"
                : "rounded-tl-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {m.mediaType === "photo" && m.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${API_BASE_URL}${m.mediaUrl}`}
                alt="Attachment"
                className={`max-h-56 w-full rounded-lg object-cover ${m.body ? "mb-1.5" : ""}`}
              />
            )}
            {m.mediaType === "video" && m.mediaUrl && (
              <video
                src={`${API_BASE_URL}${m.mediaUrl}`}
                controls
                className={`max-h-56 w-full rounded-lg ${m.body ? "mb-1.5" : ""}`}
              />
            )}
            {m.body ? (
              <p className="min-w-0 whitespace-pre-wrap break-all">
                {linkifyMessageBody(m.body, m.senderId === currentUserId)}
              </p>
            ) : null}
            <span
              className={`mt-0.5 block text-[10px] ${
                m.senderId === currentUserId ? "text-cyan-50/80" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {formatRelativeTime(m.createdAt)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/** A message body straight off the wire is plain text - this is what makes a link
 *  someone shared (e.g. via the post-card Share button) actually clickable rather than
 *  inert text the recipient has to copy by hand. Splitting on a *capturing* group means
 *  String.split hands back the matched URLs interleaved with the surrounding text, so
 *  which parts are links falls out of the index parity - no separate, stateful re-test
 *  against the same `g`-flagged regex needed. */
function linkifyMessageBody(body: string, isMine: boolean) {
  const parts = body.split(URL_PATTERN);
  if (parts.length === 1) return body;

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`break-all underline underline-offset-2 ${isMine ? "text-white" : "text-cyan-600 dark:text-cyan-400"}`}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

function ChatFooter({
  state,
  attachInputRef,
}: {
  state: ChatState;
  attachInputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      {state.error && <p className="shrink-0 px-3 pb-1 text-xs font-medium text-red-500">{state.error}</p>}

      {state.isBlocked ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 p-2.5 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">You&apos;ve blocked this account.</p>
          <button
            type="button"
            onClick={state.toggleBlock}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-cyan-600 transition-all duration-200 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
          >
            Unblock
          </button>
        </div>
      ) : (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">
          {state.attachment && (
            <div className="flex items-center gap-2 px-2.5 pt-2.5">
              <div className="relative">
                {state.attachment.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.attachment.previewUrl}
                    alt="Selected attachment"
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <video src={state.attachment.previewUrl} className="h-14 w-14 rounded-lg object-cover" />
                )}
                <button
                  type="button"
                  onClick={state.clearAttachment}
                  aria-label="Remove attachment"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white shadow hover:bg-slate-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
          <form onSubmit={state.handleSend} className="flex items-center gap-2 p-2.5">
            <input
              ref={attachInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => state.pickAttachment(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => attachInputRef.current?.click()}
              disabled={!state.threadId}
              aria-label="Attach a photo or video"
              title="Attach a photo or video"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={state.body}
              onChange={(e) => state.setBody(e.target.value)}
              disabled={!state.threadId}
              placeholder="Send an anonymous message..."
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
            <button
              type="submit"
              disabled={!state.threadId || state.isSending || (!state.body.trim() && !state.attachment)}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// A proper full-screen takeover — used below the `lg` breakpoint, where there's no
// trending-community column for a docked panel to live in and a small floating widget
// is an awkward fit for touch (drag-to-move, drag-to-resize are mouse paradigms). This
// matches the familiar mobile DM pattern: the conversation replaces the screen, with a
// back arrow to return to whatever was open underneath.
function MobileChatPanel({ handle }: { handle: string }) {
  const { closeChat } = useChat();
  const { state, scrollRef, attachInputRef } = useChatThread(handle);

  // Lock background scroll while the takeover is open, since it sits on top of the page
  // rather than replacing it in the DOM.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    // z-[60]: above both the sticky navbar and the fixed bottom nav (each z-50) - this is
    // a full-screen takeover, so it needs to sit over both, not underneath them.
    <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-900">
      <ChatHeader
        handle={handle}
        isBlocked={state.isBlocked}
        onToggleBlock={state.toggleBlock}
        onBack={closeChat}
        backLabel="Close chat"
      />
      <ChatMessages handle={handle} messages={state.messages} currentUserId={state.currentUserId} scrollRef={scrollRef} />
      <ChatFooter state={state} attachInputRef={attachInputRef} />
    </div>
  );
}

// A single open conversation, shown inside the desktop dock once a thread is picked
// from the list (or a "Message" action elsewhere in the app sets the active handle).
function ConversationPanel({
  handle,
  onBack,
  onCollapse,
}: {
  handle: string;
  onBack: () => void;
  onCollapse: () => void;
}) {
  const { state, scrollRef, attachInputRef } = useChatThread(handle);
  return (
    <>
      <ChatHeader
        handle={handle}
        isBlocked={state.isBlocked}
        onToggleBlock={state.toggleBlock}
        onBack={onBack}
        onCollapse={onCollapse}
      />
      <ChatMessages handle={handle} messages={state.messages} currentUserId={state.currentUserId} scrollRef={scrollRef} />
      <ChatFooter state={state} attachInputRef={attachInputRef} />
    </>
  );
}

function useThreadList() {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMod, setIsMod] = useState(false);

  useEffect(() => {
    chatApi
      .listThreads()
      .then(({ threads }) => setThreads(threads))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    getCurrentUser().then((user) => setIsMod(isModerator(user)));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    const timeout = setTimeout(() => {
      usersApi
        .search(q)
        .then(({ users }) => setResults(users))
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  async function toggleBlock(handle: string, isBlocked: boolean) {
    if (!isBlocked && !window.confirm(`Block ${handle}? You won't be able to message each other until you unblock them.`)) {
      return;
    }
    setError(null);
    try {
      if (isBlocked) {
        await usersApi.unblock(handle);
      } else {
        await usersApi.block(handle);
      }
      setResults((prev) =>
        prev ? prev.map((u) => (u.handle === handle ? { ...u, isBlocked: !isBlocked } : u)) : prev
      );
      setThreads((prev) => prev.map((t) => (t.handle === handle ? { ...t, isBlocked: !isBlocked } : t)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return { threads, isLoading, query, setQuery, results, error, isMod, toggleBlock };
}

function ThreadRow({
  handle,
  isBlocked,
  timestamp,
  lastMessage,
  lastMessageSentByMe,
  isUnread,
  disableMessage,
  onSelect,
  onToggleBlock,
}: {
  handle: string;
  isBlocked: boolean;
  timestamp?: string;
  lastMessage?: string | null;
  lastMessageSentByMe?: boolean;
  isUnread?: boolean;
  disableMessage?: boolean;
  onSelect: () => void;
  onToggleBlock: () => void;
}) {
  return (
    <div className="group flex items-center gap-1 rounded-xl px-1 py-1 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800">
      <button
        type="button"
        disabled={disableMessage}
        title={disableMessage ? "Admins can't message other accounts" : undefined}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <VenetianMask className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          {isUnread && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cyan-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span
              className={`truncate text-sm ${
                isUnread ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-200"
              }`}
            >
              {handle}
            </span>
            {timestamp && (
              <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                {formatRelativeTime(timestamp)}
              </span>
            )}
          </span>
          {isBlocked ? (
            <span className="block text-[11px] font-medium text-rose-500">Blocked</span>
          ) : (
            lastMessage && (
              <span
                className={`block truncate text-xs ${
                  isUnread ? "font-semibold text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {lastMessageSentByMe ? "You: " : ""}
                {lastMessage}
              </span>
            )
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleBlock}
        aria-label={isBlocked ? `Unblock ${handle}` : `Block ${handle}`}
        title={isBlocked ? "Unblock" : "Block"}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
          isBlocked
            ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            : "text-slate-400 opacity-0 hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
        }`}
      >
        {isBlocked ? <ShieldOff className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// Default view of the desktop dock: the same search-and-thread-list content as the
// standalone Private Chat page, condensed to fit the trending-community column's width.
function ThreadListPanel({ onSelect, onCollapse }: { onSelect: (handle: string) => void; onCollapse: () => void }) {
  const list = useThreadList();
  const hasQuery = list.query.trim() !== "";

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <MessageCircle className="h-5 w-5 shrink-0 text-cyan-500" />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Private Chat</span>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Minimize chat"
          title="Minimize"
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {list.isMod ? (
          <p className="px-1 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Admins can&apos;t message other accounts.
          </p>
        ) : (
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={list.query}
              onChange={(e) => list.setQuery(e.target.value)}
              type="text"
              placeholder="Search accounts to message..."
              className="w-full rounded-full border border-slate-200 bg-slate-100 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
            />
          </div>
        )}

        {list.error && <p className="px-1 pb-2 text-xs font-medium text-red-500">{list.error}</p>}

        {hasQuery ? (
          list.results === null ? (
            <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">Searching...</p>
          ) : list.results.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              No accounts match &ldquo;{list.query.trim()}&rdquo;.
            </p>
          ) : (
            <div className="space-y-1">
              {list.results.map((u) => (
                <ThreadRow
                  key={u.id}
                  handle={u.handle}
                  isBlocked={u.isBlocked}
                  disableMessage={list.isMod}
                  onSelect={() => onSelect(u.handle)}
                  onToggleBlock={() => list.toggleBlock(u.handle, u.isBlocked)}
                />
              ))}
            </div>
          )
        ) : list.isLoading ? (
          <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">Loading...</p>
        ) : list.threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <MessageCircle className="h-7 w-7 text-slate-300 dark:text-slate-600" />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              No conversations yet. Search for an account above, or tap someone&apos;s name on a post or comment to
              message them.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {list.threads.map((t) => (
              <ThreadRow
                key={t.id}
                handle={t.handle}
                isBlocked={t.isBlocked}
                timestamp={t.lastMessageAt}
                lastMessage={t.lastMessageBody}
                lastMessageSentByMe={t.lastMessageSentByMe}
                isUnread={t.isUnread}
                disableMessage={list.isMod}
                onSelect={() => onSelect(t.handle)}
                onToggleBlock={() => list.toggleBlock(t.handle, t.isBlocked)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Desktop (`lg`+) presentation: collapses to a small tab pinned to the middle of the
// right edge of the screen; clicking it slides a panel in from the right that docks
// exactly over the trending-community column, using the same grid track widths as the
// `(main)` layout (`lg:grid-cols-[220px_1fr_320px]`) so it lines up pixel-for-pixel
// instead of floating freely. Shows the thread list by default, or the open conversation
// once one is picked (from the list, or via a "Message" action elsewhere in the app).
function DesktopChatDock() {
  const { activeHandle, openChatWith, closeChat, isDockOpen, openDock, collapseDock } = useChat();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    function checkUnread() {
      chatApi
        .hasUnread()
        .then(({ hasUnread }) => setHasUnread(hasUnread))
        .catch(() => {});
    }

    checkUnread();
    const interval = setInterval(checkUnread, CHAT_UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={openDock}
        aria-label="Open private chat"
        title="Private chat"
        className={`fixed right-0 top-1/2 z-40 -translate-y-1/2 flex items-center gap-1 rounded-l-2xl border border-r-0 border-slate-200 bg-white py-3 pl-3 pr-2 shadow-lg transition-all duration-200 hover:pl-4 dark:border-slate-800 dark:bg-slate-900 ${
          isDockOpen ? "pointer-events-none translate-x-full opacity-0" : "translate-x-0 opacity-100"
        }`}
      >
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <MessageCircle className="h-5 w-5 text-cyan-500" />
          {hasUnread && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </span>
        <ChevronLeft className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </button>

      <div className="pointer-events-none fixed inset-x-0 top-24 bottom-6 z-40">
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[220px_1fr_320px] gap-6 px-4">
          <div
            className={`pointer-events-auto col-start-3 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-900 ${
              isDockOpen ? "translate-x-0" : "translate-x-[calc(100%_+_2rem)]"
            }`}
          >
            {activeHandle ? (
              <ConversationPanel key={activeHandle} handle={activeHandle} onBack={closeChat} onCollapse={collapseDock} />
            ) : (
              <ThreadListPanel onSelect={openChatWith} onCollapse={collapseDock} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
