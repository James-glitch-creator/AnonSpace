"use client";

import { Globe, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, communitiesApi, type CommunityVisibility } from "@/lib/api";
import { useTranslate } from "@/lib/language";

export default function NewCommunityPage() {
  const t = useTranslate();
  const router = useRouter();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState<CommunityVisibility>("public");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { community } = await communitiesApi.create({ name, topic, visibility });
      router.push(`/c/${community.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {t("Create a Community")}
        </h1>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {t("Start a space for people to gather around a shared topic — anonymously.")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {t("Community name")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            required
            maxLength={50}
            placeholder="e.g. PixelArt"
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 dark:text-slate-500">{t("Topic")}</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder={t("What's this community about?")}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {t("Visibility")}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={`flex flex-1 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all duration-200 ${
                visibility === "public"
                  ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">{t("Public")}</span>
                <span className="block text-[11px] opacity-80">{t("Anyone can find and join")}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`flex flex-1 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all duration-200 ${
                visibility === "private"
                  ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Lock className="h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">{t("Private")}</span>
                <span className="block text-[11px] opacity-80">{t("Only visible to you")}</span>
              </span>
            </button>
          </div>
        </div>

        {error && <p className="text-xs font-medium text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t(isSubmitting ? "Creating..." : "Create Community")}
        </button>
      </form>
    </main>
  );
}
