import { VenetianMask } from "lucide-react";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/post-card";
import { ReportButton } from "@/components/report-button";
import { comments as allComments, posts } from "@/lib/data";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = posts.find((p) => p.id === id);

  if (!post) notFound();

  const postComments = allComments.filter((c) => c.postId === id);

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <PostCard post={post} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          {postComments.length} Comments
        </h2>

        {postComments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            No comments yet.
          </p>
        ) : (
          <div className="space-y-4">
            {postComments.map((comment) => (
              <div
                key={comment.id}
                className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 dark:border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <VenetianMask className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {comment.handle}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{comment.time}</p>
                </div>
                <p className="mt-1.5 pl-9 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {comment.body}
                </p>
                <div className="mt-1 pl-9 text-xs text-slate-400 dark:text-slate-500">
                  <span className="mr-3">
                    {comment.upvotes - comment.downvotes} net votes
                  </span>
                  <ReportButton targetType="comment" targetLabel={comment.body} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
