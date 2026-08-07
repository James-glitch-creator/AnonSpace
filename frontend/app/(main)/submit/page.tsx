"use client";

import { Image as ImageIcon, Video as VideoIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, communitiesApi, postsApi, type Community } from "@/lib/api";

type MediaMode = "none" | "photos" | "video";

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const PUBLIC_SLUG = "public";

export default function SubmitPostPage() {
  const router = useRouter();
  const [communitySlug, setCommunitySlug] = useState(PUBLIC_SLUG);
  const [communityLabel, setCommunityLabel] = useState("Public");
  const [communityColor, setCommunityColor] = useState("bg-slate-500");
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");
  const [mediaMode, setMediaMode] = useState<MediaMode>("none");
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    communitiesApi
      .get(PUBLIC_SLUG)
      .then(({ community }) => {
        setCommunityLabel(community.name);
        setCommunityColor(community.color);
      })
      .catch(() => {});

    communitiesApi
      .mine()
      .then(({ communities }) => setJoinedCommunities(communities))
      .catch(() => {});
  }, []);

  const communityOptions = useMemo(() => {
    const pool = [
      { slug: PUBLIC_SLUG, name: "Public", color: communityColor },
      ...joinedCommunities
        .filter((c) => c.slug !== PUBLIC_SLUG)
        .map((c) => ({ slug: c.slug, name: c.name, color: c.color })),
    ];

    const q = query.trim().toLowerCase();
    return q ? pool.filter((c) => c.name.toLowerCase().includes(q)) : pool;
  }, [query, joinedCommunities, communityColor]);

  function selectCommunity(c: { slug: string; name: string; color: string }) {
    setCommunitySlug(c.slug);
    setCommunityLabel(c.name);
    setCommunityColor(c.color);
    setQuery("");
    setIsPicking(false);
  }

  const photoPreviews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  const videoPreview = useMemo(() => (video ? URL.createObjectURL(video) : null), [video]);

  useEffect(() => {
    return () => {
      for (const url of photoPreviews) URL.revokeObjectURL(url);
    };
  }, [photoPreviews]);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  function switchMode(mode: MediaMode) {
    setError(null);
    setMediaMode((prev) => (prev === mode ? "none" : mode));
    if (mode !== "photos") setPhotos([]);
    if (mode !== "video") setVideo(null);
  }

  function handlePhotosSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const oversized = incoming.find((f) => f.size > MAX_PHOTO_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" is larger than 8MB.`);
      return;
    }
    setError(null);
    setPhotos((prev) => [...prev, ...incoming].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleVideoSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`"${file.name}" is larger than 50MB.`);
      return;
    }
    setError(null);
    setVideo(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!communitySlug) {
      setError("Choose a community to post to.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await postsApi.create({
        communitySlug,
        body,
        photos: mediaMode === "photos" ? photos : undefined,
        video: mediaMode === "video" ? (video ?? undefined) : undefined,
      });
      router.push("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Create a Post</h1>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Share text, photos, or a video &mdash; anonymously.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Posting to
          </label>

          {isPicking ? (
            <div className="relative">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setIsPicking(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsPicking(false);
                }}
                placeholder="Search your communities..."
                className="rounded-full border border-cyan-400 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none dark:border-cyan-500 dark:bg-slate-950 dark:text-slate-200"
              />
              <div className="absolute left-0 top-full z-10 mt-1 w-48 space-y-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                {communityOptions.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">
                    No matches.
                  </p>
                ) : (
                  communityOptions.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectCommunity(c);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.color}`} />
                      {c.slug === PUBLIC_SLUG ? "Public" : `c/${c.name}`}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsPicking(true)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all duration-200 hover:border-cyan-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${communityColor}`} />
              {communitySlug === PUBLIC_SLUG ? "Public" : `c/${communityLabel}`}
            </button>
          )}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={1}
          maxLength={4000}
          rows={5}
          placeholder="What's on your mind?"
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => switchMode("photos")}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              mediaMode === "photos"
                ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Photos
          </button>
          <button
            type="button"
            onClick={() => switchMode("video")}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              mediaMode === "video"
                ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <VideoIcon className="h-3.5 w-3.5" />
            Video
          </button>
        </div>

        {mediaMode === "photos" && (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotosSelected(e.target.files)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-600 dark:text-slate-400"
            />
            {photos.length > 0 && (
              <div
                className="scrollbar-hide flex gap-2 overflow-x-auto"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {photoPreviews.map((src, i) => (
                  <div key={src} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label="Remove photo"
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Up to {MAX_PHOTOS} photos, 8MB each.
            </p>
          </div>
        )}

        {mediaMode === "video" && (
          <div className="space-y-2">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleVideoSelected(e.target.files)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-600 dark:text-slate-400"
            />
            {videoPreview && (
              <video src={videoPreview} controls className="max-h-64 w-full rounded-xl bg-black" />
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Up to 50MB.</p>
          </div>
        )}

        {error && <p className="text-xs font-medium text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !communitySlug}
          className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </form>
    </main>
  );
}
