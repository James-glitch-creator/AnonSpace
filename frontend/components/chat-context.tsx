"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useIsDesktop } from "@/lib/use-is-desktop";

type ChatContextValue = {
  activeHandle: string | null;
  /** Desktop only: whether the docked chat panel is slid open (vs. collapsed to its tab). */
  isDockOpen: boolean;
  openChatWith: (handle: string) => void;
  /** Leaves the current conversation - back to the thread list on desktop, fully closed
   *  on mobile (there's no persistent dock there to fall back to). */
  closeChat: () => void;
  /** Desktop only: collapses the dock back down to its tab without ending anything. */
  collapseDock: () => void;
  /** Desktop only: reveals the dock as-is (resuming whatever conversation, or the thread
   *  list, was already showing) - what the collapsed tab itself clicks through to. */
  openDock: () => void;
  /** Opens straight to the thread list so the user can pick who to message - the dock on
   *  desktop, or the standalone /chat page on mobile, where there's no dock to expand. */
  openChatPicker: () => void;
  /** Same as openChatPicker, but stashes a draft to drop into the composer once a
   *  conversation is actually opened - how the post-card Share button hands off a link. */
  shareToChat: (body: string) => void;
  /** Reads and clears the stashed share draft - called once by a freshly-opened
   *  conversation so it doesn't leak into whichever thread gets opened next. */
  takePendingShareBody: () => string | null;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [isDockOpen, setIsDockOpen] = useState(false);
  const pendingShareBodyRef = useRef<string | null>(null);

  const value = useMemo<ChatContextValue>(
    () => ({
      activeHandle,
      isDockOpen,
      openChatWith: (handle: string) => {
        setActiveHandle(handle);
        setIsDockOpen(true);
      },
      closeChat: () => setActiveHandle(null),
      collapseDock: () => setIsDockOpen(false),
      openDock: () => setIsDockOpen(true),
      openChatPicker: () => {
        setActiveHandle(null);
        if (isDesktop) {
          setIsDockOpen(true);
        } else {
          router.push("/chat");
        }
      },
      shareToChat: (body: string) => {
        pendingShareBodyRef.current = body;
        setActiveHandle(null);
        if (isDesktop) {
          setIsDockOpen(true);
        } else {
          router.push("/chat");
        }
      },
      takePendingShareBody: () => {
        const body = pendingShareBodyRef.current;
        pendingShareBodyRef.current = null;
        return body;
      },
    }),
    [activeHandle, isDockOpen, isDesktop, router]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// Falls back to a no-op instead of throwing when there's no ChatProvider ancestor -
// components that render inside both the regular app (chat-enabled) and the admin panel
// (no ChatProvider - admins can't message anyone) need to work in both without crashing.
const noopChatContext: ChatContextValue = {
  activeHandle: null,
  isDockOpen: false,
  openChatWith: () => {},
  closeChat: () => {},
  collapseDock: () => {},
  openDock: () => {},
  openChatPicker: () => {},
  shareToChat: () => {},
  takePendingShareBody: () => null,
};

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  return ctx ?? noopChatContext;
}
