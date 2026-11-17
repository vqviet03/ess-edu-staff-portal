import { ProtectedPage } from "@/shared/protected-page";
import { PageHeader } from "@/shared/ui";
import { IntroductionEditor } from "@/features/introduction/editor";
export default function Page() {
  return (
    <ProtectedPage>
      <PageHeader />
      <IntroductionEditor />
    </ProtectedPage>
  );
}
