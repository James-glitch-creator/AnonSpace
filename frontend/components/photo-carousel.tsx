"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type UIEvent } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "@/lib/api";

export function PhotoCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);
  // Also guards the createPortal call below from ever running during SSR (it starts
  // false, and only a click - which can't happen before hydration - flips it true).
  const [isViewerOpen, setIsViewerOpen] = useState(false);
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
    <>
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
              onClick={() => setIsViewerOpen(true)}
              className="h-64 w-full shrink-0 cursor-zoom-in snap-center object-contain sm:h-80"
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

      {isViewerOpen &&
        createPortal(
          <PhotoViewer urls={urls} initialIndex={index} onClose={() => setIsViewerOpen(false)} />,
          document.body
        )}
    </>
  );
}

/** Full-screen lightbox for a tapped photo - its own index, independent of the inline
 *  carousel's scroll position, so browsing here doesn't fight the card behind it. */
function PhotoViewer({
  urls,
  initialIndex,
  onClose,
}: {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(urls.length - 1, i + 1));
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [urls.length, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${API_BASE_URL}${urls[index]}`}
        alt={`Photo ${index + 1} of ${urls.length}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full object-contain"
      />

      {urls.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => i - 1);
              }}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-200 hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {index < urls.length - 1 && (
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => i + 1);
              }}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-200 hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
            {index + 1}/{urls.length}
          </span>
        </>
      )}
    </div>
  );
}
