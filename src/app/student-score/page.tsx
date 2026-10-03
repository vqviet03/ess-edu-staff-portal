import { StudentScore } from "@/features/scores/student";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <StudentScore />
    </ProtectedPage>
  );
}
