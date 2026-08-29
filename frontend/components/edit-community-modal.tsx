"use client";

import { Image as ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, ApiError, communitiesApi, type Community, type CommunityRule } from "@/lib/api";

const MAX_DESCRIPTION = 500;
const MAX_RULES = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** `undefined` = leave as-is, `null` = remove, `File` = replace with this upload. */
type ImageChange = File | null | undefined;

function ImagePicker({
  label,
  shape,
  currentUrl,
  change,
  onChange,
}: {
  label: string;
  shape: "circle" | "banner";
  currentUrl: string | null;
  change: ImageChange;
  onChange: (next: ImageChange) => void;
}) {
  const objectUrl = useMemo(() => (change instanceof File ? URL.createObjectURL(change) : null), [change]);
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const previewSrc = objectUrl ?? (change === null ? null : currentUrl ? `${API_BASE_URL}${currentUrl}` : null);
  const inputId = `${label.toLowerCase()}-upload`;

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) return;
    onChange(file);
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-slate-100 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600 ${
            shape === "circle" ? "h-16 w-16 rounded-full" : "h-16 w-full max-w-xs rounded-xl"
          }`}
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {previewSrc && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-rose-500 transition-all duration-200 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EditCommunityModal({
  community,
  onClose,
  onSaved,
}: {
  community: Community;
  onClose: () => void;
  onSaved: (community: Community) => void;
}) {
  const [description, setDescription] = useState(community.description);
  const [rules, setRules] = useState<CommunityRule[]>(community.rules);
  const [icon, setIcon] = useState<ImageChange>(undefined);
  const [banner, setBanner] = useState<ImageChange>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function addRule() {
    if (rules.length >= MAX_RULES) return;
    setRules((prev) => [...prev, { title: "", body: "" }]);
  }

  function updateRule(index: number, patch: Partial<CommunityRule>) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (isSaving) return;
    if (description.length > MAX_DESCRIPTION) {
      setError(`About text must be ${MAX_DESCRIPTION} characters or fewer.`);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const { community: updated } = await communitiesApi.update(community.slug, {
        description: description.trim(),
        rules: rules
          .map((r) => ({ title: r.title.trim(), body: r.body.trim() }))
          .filter((r) => r.title !== ""),
        icon,
        banner,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Edit {community.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <ImagePicker
            label="Banner"
            shape="banner"
            currentUrl={community.bannerUrl}
            change={banner}
            onChange={setBanner}
          />
          <ImagePicker label="Icon" shape="circle" currentUrl={community.iconUrl} change={icon} onChange={setIcon} />

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">About community</label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION}
              rows={4}
              placeholder="What's this community about?"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rules</label>
              <button
                type="button"
                onClick={addRule}
                disabled={rules.length >= MAX_RULES}
                className="flex items-center gap-1 text-xs font-semibold text-cyan-600 transition-all duration-200 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add rule
              </button>
            </div>

            {rules.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                No rules yet.
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule, i) => (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500">
                        {i + 1}.
                      </span>
                      <input
                        value={rule.title}
                        onChange={(e) => updateRule(i, { title: e.target.value })}
                        maxLength={80}
                        placeholder="Rule title"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeRule(i)}
                        aria-label="Remove rule"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={rule.body}
                      onChange={(e) => updateRule(i, { body: e.target.value })}
                      maxLength={300}
                      rows={2}
                      placeholder="Details (optional)"
                      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-cyan-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
