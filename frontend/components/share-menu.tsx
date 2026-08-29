"use client";

import { Check, Copy, Send, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "./chat-context";

const COPIED_RESET_MS = 2000;

export function ShareMenu({
  postId,
  disabled,
  disabledReason,
}: {
  postId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { shareToChat } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!justCopied) return;
    const timeout = setTimeout(() => setJustCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timeout);
  }, [justCopied]);

  function postUrl() {
    return `${window.location.origin}/post/${postId}`;
  }

  async function copyLink() {
    setIsOpen(false);
    try {
      await navigator.clipboard.writeText(postUrl());
      setJustCopied(true);
    } catch {
      // Clipboard access can be denied (permissions, insecure context) - nothing useful
      // to recover into beyond just not claiming success.
    }
  }

  function sendToChat() {
    setIsOpen(false);
    shareToChat(postUrl());
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:disabled:hover:bg-transparent"
      >
        {justCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
        {justCopied ? "Copied!" : "Share"}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-48 space-y-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Copy className="h-4 w-4" />
            Copy link
          </button>
          <button
            type="button"
            onClick={sendToChat}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Send className="h-4 w-4" />
            Send to...
          </button>
        </div>
      )}
    </div>
  );
}
