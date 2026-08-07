"use client";

import { Crown, Search, UserX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, communitiesApi, type CommunityMember } from "@/lib/api";

export function ManageMembersModal({
  slug,
  onClose,
  onKicked,
}: {
  slug: string;
  onClose: () => void;
  onKicked: () => void;
}) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);

  useEffect(() => {
    communitiesApi
      .members(slug)
      .then(({ members }) => setMembers(members))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."))
      .finally(() => setIsLoading(false));
  }, [slug]);

  async function kick(member: CommunityMember) {
    if (kickingId) return;
    setKickingId(member.id);
    setError(null);
    try {
      await communitiesApi.kick(slug, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      onKicked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setKickingId(null);
    }
  }

  const filteredMembers = members.filter((m) =>
    m.handle.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Manage members</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search members..."
            className="w-full rounded-full border border-slate-200 bg-slate-100 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        ) : filteredMembers.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            {members.length === 0 ? "No members." : "No members match your search."}
          </p>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {member.handle}
                </span>
                {member.isOwner ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                    <Crown className="h-3.5 w-3.5" />
                    Owner
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={kickingId === member.id}
                    onClick={() => kick(member)}
                    aria-label={`Kick ${member.handle}`}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-rose-500 transition-all duration-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-rose-500/10"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    {kickingId === member.id ? "Kicking..." : "Kick"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
      </div>
    </div>
  );
}
