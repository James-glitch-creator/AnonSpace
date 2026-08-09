"use client";

import { MessageCircle, Search, ShieldOff, UserX, VenetianMask } from "lucide-react";
import { useEffect, useState } from "react";
import { useChat } from "@/components/chat-context";
import {
  ApiError,
  chatApi,
  usersApi,
  type ChatThread,
  type UserSearchResult,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

function UserRow({
  handle,
  isBlocked,
  timestamp,
  lastMessage,
  lastMessageSentByMe,
  isUnread,
  onMessage,
  onToggleBlock,
}: {
  handle: string;
  isBlocked: boolean;
  timestamp?: string;
  lastMessage?: string | null;
  lastMessageSentByMe?: boolean;
  isUnread?: boolean;
  onMessage: () => void;
  onToggleBlock: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl px-1 py-1 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800">
      <button
        type="button"
        onClick={onMessage}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <VenetianMask className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
          {isUnread && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cyan-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm ${
              isUnread
                ? "font-bold text-slate-900 dark:text-white"
                : "font-medium text-slate-700 dark:text-slate-200"
            }`}
          >
            {handle}
          </span>
          {isBlocked ? (
            <span className="text-[11px] font-medium text-rose-500">Blocked</span>
          ) : (
            lastMessage && (
              <span
                className={`block truncate text-xs ${
                  isUnread
                    ? "font-semibold text-slate-600 dark:text-slate-300"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {lastMessageSentByMe ? "You: " : ""}
                {lastMessage}
              </span>
            )
          )}
        </span>
        {timestamp && (
          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
            {formatRelativeTime(timestamp)}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onToggleBlock}
        aria-label={isBlocked ? `Unblock ${handle}` : `Block ${handle}`}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
          isBlocked
            ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
        }`}
      >
        {isBlocked ? <ShieldOff className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
        {isBlocked ? "Unblock" : "Block"}
      </button>
    </div>
  );
}

export default function ChatPage() {
  const { openChatWith } = useChat();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chatApi
      .listThreads()
      .then(({ threads }) => setThreads(threads))
      .catch(() => {})
      .finally(() => setIsLoading(false));
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

  const hasQuery = query.trim() !== "";

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Private Chat</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search accounts to message..."
            className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
          />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      {hasQuery ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {results === null ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Searching...</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              No accounts match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <div className="space-y-1">
              {results.map((u) => (
                <UserRow
                  key={u.id}
                  handle={u.handle}
                  isBlocked={u.isBlocked}
                  onMessage={() => openChatWith(u.handle)}
                  onToggleBlock={() => toggleBlock(u.handle, u.isBlocked)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MessageCircle className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No conversations yet. Search for an account above, or tap someone&apos;s name on a
                post or comment to message them.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {threads.map((t) => (
                <UserRow
                  key={t.id}
                  handle={t.handle}
                  isBlocked={t.isBlocked}
                  timestamp={t.lastMessageAt}
                  lastMessage={t.lastMessageBody}
                  lastMessageSentByMe={t.lastMessageSentByMe}
                  isUnread={t.isUnread}
                  onMessage={() => openChatWith(t.handle)}
                  onToggleBlock={() => toggleBlock(t.handle, t.isBlocked)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
