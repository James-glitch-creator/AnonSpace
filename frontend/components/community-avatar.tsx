"use client";

import { API_BASE_URL, type Community } from "@/lib/api";

/** A community's icon image if it has one, else a colored circle with its initial. */
export function CommunityAvatar({
  community,
  className = "h-8 w-8",
}: {
  community: Pick<Community, "name" | "color" | "iconUrl">;
  className?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}>
      {community.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${API_BASE_URL}${community.iconUrl}`} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={`flex h-full w-full items-center justify-center text-xs font-bold text-white ${community.color}`}>
          {community.name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
