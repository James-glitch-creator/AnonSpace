"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, ApiError, postsApi, type Post } from "@/lib/api";

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function EditPostModal({ post, onClose, onSaved }: {
  post: Post;
  onClose: () => void;
  onSaved: (updated: Post) => void;
}) {
  const [body, setBody] = useState(post.body);
  const [kept, setKept] = useState(post.mediaUrls);
  const [added, setAdded] = useState<{ file: File; url: string }[]>([]);
  const previewUrls = useRef<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach(URL.revokeObjectURL);
  }, []);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (kept.length + added.length + selected.length > MAX_PHOTOS) {
      setError(`A post can have at most ${MAX_PHOTOS} photos.`);
      return;
    }
    if (selected.some((file) => !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type) || file.size > MAX_PHOTO_BYTES)) {
      setError("Photos must be JPG, PNG, GIF, or WebP and no larger than 8 MB each.");
      return;
    }
    const entries = selected.map((file) => ({ file, url: URL.createObjectURL(file) }));
    previewUrls.current.push(...entries.map((entry) => entry.url));
    setAdded((current) => [...current, ...entries]);
    setError(null);
  }

  async function save() {
    if (saving) return;
    if (!post.isRepost && !body.trim()) {
      setError("Write a description before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { post: updated } = await postsApi.update(post.id, { body: body.trim(), keepPhotoUrls: kept, photos: added.map((entry) => entry.file) });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit post" onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <div onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit post</h2>
          <button type="button" aria-label="Close editor" onClick={onClose} disabled={saving} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <label htmlFor="edit-post-body" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
        <textarea id="edit-post-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={5} className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
        <p className="mt-1 text-right text-xs text-slate-500">{body.length}/4000</p>
        {post.mediaType === "video" ? (
          <p className="mt-3 text-sm text-slate-500">Video posts support description edits only.</p>
        ) : !post.isRepost && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Photos ({kept.length + added.length}/{MAX_PHOTOS})</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {kept.map((url) => <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${API_BASE_URL}${url}`} alt="Post photo" className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove existing photo" onClick={() => setKept((current) => current.filter((item) => item !== url))} className="absolute right-1 top-1 rounded-full bg-slate-950/75 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
              </div>)}
              {added.map((entry, index) => <div key={entry.url} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.url} alt="New photo" className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove new photo" onClick={() => setAdded((current) => current.filter((_, photoIndex) => photoIndex !== index))} className="absolute right-1 top-1 rounded-full bg-slate-950/75 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
              </div>)}
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <ImagePlus className="h-4 w-4" /> Add photos
              <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} />
            </label>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-full px-4 py-2 text-sm text-slate-600 disabled:opacity-50 dark:text-slate-300">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
