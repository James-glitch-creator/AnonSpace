"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "./chat-context";
import { ReportButton } from "./report-button";

/**
 * Wraps an author handle so tapping it opens a small menu to message or report that
 * account. Renders as plain text (no menu) when `interactive` is false — e.g. for your
 * own posts/comments, where messaging/reporting yourself doesn't make sense.
 */
export function UserHandleMenu({
  userId,
  handle,
  interactive = true,
  className,
  children,
}: {
  userId: string;
  handle: string;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { openChatWith } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!interactive) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`${className ?? ""} rounded hover:underline`}
      >
        {children}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-36 space-y-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              openChatWith(handle);
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </button>
          {/* No auto-close here: closing this dropdown on click would unmount
              ReportButton (and its just-opened modal) in the same render. It
              closes on its own via the outside-click handler once you're done. */}
          <ReportButton targetType="user" targetId={userId} targetLabel={handle} variant="menu-item" />
        </div>
      )}
    </span>
  );
}
