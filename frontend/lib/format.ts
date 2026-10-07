import type { Language } from "@/lib/language";

export function formatRelativeTime(iso: string, language: Language = "en"): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));

  if (diffSec < 60) return language === "my" ? "ယခုလေးတင်" : "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return language === "my" ? `${diffMin} မိနစ်အကြာ` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return language === "my" ? `${diffHour} နာရီအကြာ` : `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return language === "my" ? `${diffDay} ရက်အကြာ` : `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return language === "my" ? `${diffMonth} လအကြာ` : `${diffMonth}mo ago`;
  return language === "my" ? `${Math.floor(diffMonth / 12)} နှစ်အကြာ` : `${Math.floor(diffMonth / 12)}y ago`;
}

export function formatMemberCount(count: number, language: Language = "en"): string {
  if (language === "my") return `${count.toLocaleString()} ဦး`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M members`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K members`;
  return `${count} member${count === 1 ? "" : "s"}`;
}

/** "Created Jan 5, 2025" style date, for e.g. a community's About panel. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
