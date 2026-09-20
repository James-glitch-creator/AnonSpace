"use client";

import { useLayoutEffect } from "react";
import type { Post } from "@/lib/api";

export type FeedState = {
  posts: Post[];
  nextPage: number;
  hasMore: boolean;
};

export type CursorFeedState = {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
};

const feedStates = new Map<string, FeedState | CursorFeedState>();
const scrollPositions = new Map<string, number>();

export function getFeedState<T extends FeedState | CursorFeedState>(key: string): T | null {
  return (feedStates.get(key) as T | undefined) ?? null;
}

export function setFeedState(key: string, state: FeedState | CursorFeedState): void {
  feedStates.set(key, state);
}

export function useFeedScrollRestoration(key: string, ready: boolean): void {
  useLayoutEffect(() => {
    if (!ready) return;

    const savedPosition = scrollPositions.get(key);
    const frame = window.requestAnimationFrame(() => {
      if (savedPosition !== undefined) window.scrollTo({ top: savedPosition, behavior: "instant" });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      scrollPositions.set(key, window.scrollY);
    };
  }, [key, ready]);
}
