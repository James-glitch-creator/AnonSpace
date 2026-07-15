import type { ContentType } from "@/lib/admin-data";

export function TypeBadge({ type }: { type: ContentType }) {
  const isPost = type === "Post";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isPost
          ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400"
          : "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400"
      }`}
    >
      {type}
    </span>
  );
}
