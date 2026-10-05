import { SessionDetail } from "@/features/sessions/detail";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <SessionDetail />
    </ProtectedPage>
  );
}
