"use client";
import { PageHeader } from "@/shared/ui";
import { useSearchParams } from "next/navigation";
import { ProtectedPage } from "@/shared/protected-page";
import { PostDetailPage } from "@/features/materials/feed";
function Content() {
  const p = useSearchParams();
  return (
    <>
      <PageHeader />
      <PostDetailPage postId={p.get("postId") ?? ""} />
    </>
  );
}
export default function Page() {
  return (
    <ProtectedPage>
      <Content />
    </ProtectedPage>
  );
}
