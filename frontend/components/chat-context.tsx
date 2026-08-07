"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ChatContextValue = {
  activeHandle: string | null;
  openChatWith: (handle: string) => void;
  closeChat: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const value = useMemo<ChatContextValue>(
    () => ({
      activeHandle,
      openChatWith: (handle: string) => setActiveHandle(handle),
      closeChat: () => setActiveHandle(null),
    }),
    [activeHandle]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
