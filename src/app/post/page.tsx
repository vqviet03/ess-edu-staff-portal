"use client";
import { useSearchParams } from "next/navigation";
import { ProtectedPage } from "@/shared/protected-page";
import { PostDetailPage } from "@/features/materials/feed";
function Content() {
  const p = useSearchParams();
  return <PostDetailPage postId={p.get("postId") ?? ""} />;
}
export default function Page() {
  return (
    <ProtectedPage>
      <Content />
    </ProtectedPage>
  );
}
