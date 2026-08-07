"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type UIEvent } from "react";
import { API_BASE_URL } from "@/lib/api";

export function PhotoCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(nextIndex: number) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: nextIndex * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative mt-3">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-950"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={`${API_BASE_URL}${url}`}
            alt={`Photo ${i + 1} of ${urls.length}`}
            className="h-64 w-full shrink-0 snap-center object-contain sm:h-80"
          />
        ))}
      </div>

      {urls.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => goTo(index - 1)}
              className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/30 text-white/90 transition-all duration-200 hover:bg-slate-950/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {index < urls.length - 1 && (
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => goTo(index + 1)}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/30 text-white/90 transition-all duration-200 hover:bg-slate-950/50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] font-medium text-white">
            {index + 1}/{urls.length}
          </span>
        </>
      )}
    </div>
  );
}
