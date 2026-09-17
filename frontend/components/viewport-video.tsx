"use client";

import { useEffect, useRef } from "react";

export function ViewportVideo({
  src,
  className,
  autoPlayInView,
}: {
  src: string;
  className: string;
  autoPlayInView: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlayInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          void video.play().catch(() => {
            // Browsers may still reject playback under device-specific data or power
            // saving policies. Controls remain available as a manual fallback.
          });
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [autoPlayInView]);

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      muted={autoPlayInView}
      playsInline
      preload="metadata"
      className={className}
    />
  );
}
