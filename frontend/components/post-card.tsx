"use client";

import { ArrowBigDown, ArrowBigUp, MessageSquare, Share2, VenetianMask } from "lucide-react";
import { useState } from "react";
import type { Post } from "@/lib/data";

export function PostCard({ post }: { post: Post }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const upvotes = post.upvotes + (vote === "up" ? 1 : 0);
  const downvotes = post.downvotes + (vote === "down" ? 1 : 0);
  const score = upvotes - downvotes;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <VenetianMask className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {post.handle}
          </p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-500">
            {post.community} &middot; {post.time}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {post.body}
      </p>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-1 dark:bg-slate-800">
          <button
            type="button"
            aria-label="Upvote"
            onClick={() => setVote(vote === "up" ? null : "up")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
              vote === "up"
                ? "bg-cyan-500 text-white"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <ArrowBigUp className="h-4 w-4" />
          </button>
          <span className="min-w-6 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
            {score.toLocaleString()}
          </span>
          <button
            type="button"
            aria-label="Downvote"
            onClick={() => setVote(vote === "down" ? null : "down")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
              vote === "down"
                ? "bg-rose-500 text-white"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <ArrowBigDown className="h-4 w-4" />
          </button>
        </div>

        <button className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
          <MessageSquare className="h-4 w-4" />
          {post.comments}
        </button>
        <button className="ml-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </article>
  );
}
