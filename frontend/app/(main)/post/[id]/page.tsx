"use client";

import { useParams } from "next/navigation";
import { PostThread } from "@/components/post-thread";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="col-span-1 space-y-4 lg:col-span-2">
      <PostThread postId={id} />
    </main>
  );
}
