const STYLES: Record<string, string> = {
  Post: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Comment: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  User: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Community: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export function TypeBadge({ type }: { type: "Post" | "Comment" | "User" | "Community" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STYLES[type]}`}
    >
      {type}
    </span>
  );
}
