"use client";

import { Paperclip, Send, ShieldOff, UserX, VenetianMask, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, ApiError, chatApi, getCurrentUser, usersApi, type ChatMessage } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { useChat } from "./chat-context";

const POLL_INTERVAL_MS = 3000;
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 420;
const EDGE_MARGIN = 16;

export function ChatWindow() {
  const { activeHandle, closeChat } = useChat();

  if (!activeHandle) return null;

  return <ChatWindowPanel key={activeHandle} handle={activeHandle} onClose={closeChat} />;
}

function ChatWindowPanel({ handle, onClose }: { handle: string; onClose: () => void }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File; kind: "photo" | "video"; previewUrl: string } | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | undefined>(undefined);
  const attachInputRef = useRef<HTMLInputElement>(null);

  // Starts in the bottom-right corner (typical chat-widget spot) rather than top-right,
  // so it doesn't land on top of the trending-communities column by default — but it's
  // just an initial position; dragging the header can move it anywhere. Safe to read
  // `window` directly here: this component only ever mounts client-side, in response to
  // a click, never during SSR (ChatWindow returns null until then).
  const [position, setPosition] = useState(() => ({
    x: Math.max(EDGE_MARGIN, window.innerWidth - DEFAULT_WIDTH - EDGE_MARGIN - 20),
    y: Math.max(96, window.innerHeight - DEFAULT_HEIGHT - EDGE_MARGIN),
  }));
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );

  useEffect(() => {
    function handleDragMove(e: MouseEvent) {
      if (!dragRef.current || !panelRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const width = panelRef.current.offsetWidth;
      const height = panelRef.current.offsetHeight;
      setPosition({
        x: Math.min(Math.max(0, dragRef.current.originX + dx), window.innerWidth - width),
        y: Math.min(Math.max(0, dragRef.current.originY + dy), window.innerHeight - height),
      });
    }

    function handleDragEnd() {
      dragRef.current = null;
      document.body.style.userSelect = "";
    }

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    return () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  }, []);

  function handleDragStart(e: React.MouseEvent) {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top };
    document.body.style.userSelect = "none";
  }

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

  return (
    <div
      ref={panelRef}
      style={{ left: position.x, top: position.y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }}
      className="fixed z-40 flex min-h-[220px] min-w-[240px] max-w-[90vw] resize flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[85vh]"
    >
      <div
        onMouseDown={handleDragStart}
        className="flex shrink-0 cursor-move select-none items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800"
      >
        <VenetianMask className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
        <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {handle}
        </span>
        <button
          type="button"
          onClick={toggleBlock}
          aria-label={isBlocked ? `Unblock ${handle}` : `Block ${handle}`}
          title={isBlocked ? "Unblock" : "Block"}
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400"
        >
          {isBlocked ? <ShieldOff className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Say hello to {handle}.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
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
              {m.body}
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

      {error && <p className="shrink-0 px-3 pb-1 text-xs font-medium text-red-500">{error}</p>}

      {isBlocked ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 p-2.5 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">You&apos;ve blocked this account.</p>
          <button
            type="button"
            onClick={toggleBlock}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-cyan-600 transition-all duration-200 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
          >
            Unblock
          </button>
        </div>
      ) : (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">
          {attachment && (
            <div className="flex items-center gap-2 px-2.5 pt-2.5">
              <div className="relative">
                {attachment.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachment.previewUrl}
                    alt="Selected attachment"
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <video src={attachment.previewUrl} className="h-14 w-14 rounded-lg object-cover" />
                )}
                <button
                  type="button"
                  onClick={clearAttachment}
                  aria-label="Remove attachment"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white shadow hover:bg-slate-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2 p-2.5">
            <input
              ref={attachInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => pickAttachment(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => attachInputRef.current?.click()}
              disabled={!threadId}
              aria-label="Attach a photo or video"
              title="Attach a photo or video"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!threadId}
              placeholder="Send an anonymous message..."
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
            <button
              type="submit"
              disabled={!threadId || isSending || (!body.trim() && !attachment)}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
