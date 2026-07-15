import { ArrowUpRight } from "lucide-react";

export function StatCard({
  label,
  value,
  note,
  trend = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p
        className={`mt-1 flex items-center gap-1 text-xs font-medium ${
          trend === "up"
            ? "text-emerald-500"
            : trend === "down"
              ? "text-rose-500"
              : "text-slate-400 dark:text-slate-500"
        }`}
      >
        {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
        {note}
      </p>
    </div>
  );
}
