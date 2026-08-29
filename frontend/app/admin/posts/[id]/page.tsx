"use client";

import { useParams } from "next/navigation";
import { PostThread } from "@/components/post-thread";

// PostThread renders its own "Back" button, so this route doesn't add a second one.
export default function AdminPostThreadPage() {
  const { id } = useParams<{ id: string }>();

  return <PostThread postId={id} />;
}
