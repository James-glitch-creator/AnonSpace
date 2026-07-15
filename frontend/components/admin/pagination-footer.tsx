import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationFooter({ from, to, total }: { from: number; to: number; total: number }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
      <span>
        {from}-{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled
          className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-300 disabled:cursor-not-allowed dark:border-slate-800 dark:text-slate-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all duration-200 hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-800 dark:text-slate-400"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
