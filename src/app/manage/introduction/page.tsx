import { ProtectedPage } from "@/shared/protected-page";
import { IntroductionEditor } from "@/features/introduction/editor";
export default function Page() {
  return (
    <ProtectedPage>
      <IntroductionEditor />
    </ProtectedPage>
  );
}
