"use client";

import { Send, VenetianMask } from "lucide-react";
import { useState } from "react";
import { chatThreads } from "@/lib/data";

export default function ChatPage() {
  const [activeId, setActiveId] = useState(chatThreads[0].id);
  const active = chatThreads.find((t) => t.id === activeId)!;

  return (
    <main className="col-span-1 lg:col-span-2">
      <div className="grid h-[calc(100vh-8rem)] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[220px_1fr]">
        <div className="hidden border-r border-slate-200 dark:border-slate-800 sm:block">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Private Chat
          </p>
          <div className="space-y-1 px-2">
            {chatThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-all duration-200 ${
                  t.id === activeId
                    ? "bg-cyan-50 dark:bg-cyan-500/10"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <VenetianMask className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t.handle}
                  </span>
                  <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                    {t.lastMessage}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <VenetianMask className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {active.handle}
            </span>
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online now
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="max-w-xs rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {active.lastMessage}
            </div>
            <div className="ml-auto max-w-xs rounded-2xl rounded-tr-sm bg-cyan-500 px-3 py-2 text-sm text-white">
              Yeah, 94th percentile with general-only pretraining.
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
            <input
              type="text"
              placeholder="Send an anonymous message..."
              className="flex-1 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
            <button
              type="button"
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white transition-all duration-200 hover:bg-cyan-600"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
