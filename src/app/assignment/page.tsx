import { ProtectedPage } from "@/shared/protected-page";
import { AssignmentPage } from "@/features/assignments/page";
import { AssignmentSurface } from "@/features/assignments/surface";
export default function Page() {
  return (
    <ProtectedPage>
      <AssignmentSurface>
        <AssignmentPage />
      </AssignmentSurface>
    </ProtectedPage>
  );
}
