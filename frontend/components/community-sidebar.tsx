"use client";

import { Calendar, ChevronDown, Globe, Lock, MessageCircle, ScrollText, Users } from "lucide-react";
import { useChat } from "@/components/chat-context";
import type { Community } from "@/lib/api";
import { formatDate, formatMemberCount } from "@/lib/format";

export function CommunitySidebar({ community }: { community: Community }) {
  const { openChatWith } = useChat();
  const canMessageMods = !community.isOwner && community.creatorHandle !== null;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{community.name}</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {community.description || community.topic || "This community hasn't added an about description yet."}
          </p>

          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {community.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                Created {formatDate(community.createdAt)}
              </div>
            )}
            <div className="flex items-center gap-2">
              {community.visibility === "private" ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              ) : (
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              {community.visibility === "private" ? "Private" : "Public"}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              {formatMemberCount(community.memberCount)}
            </div>
          </div>

          {canMessageMods && (
            <button
              type="button"
              onClick={() => openChatWith(community.creatorHandle!)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Message Mods
            </button>
          )}
        </div>

        {community.rules.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <ScrollText className="h-3.5 w-3.5" />
              {community.name} Rules
            </h3>
            <div className="space-y-0.5">
              {community.rules.map((rule, i) => (
                <details key={i} className="group rounded-lg px-2 py-1.5 open:bg-slate-50 dark:open:bg-slate-800">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span className="shrink-0 text-slate-400 dark:text-slate-500">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate">{rule.title}</span>
                    {rule.body && (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180 dark:text-slate-500" />
                    )}
                  </summary>
                  {rule.body && (
                    <p className="mt-1 pl-4.5 text-xs text-slate-500 dark:text-slate-400">{rule.body}</p>
                  )}
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
