import { ProtectedPage } from "@/shared/protected-page";
import { AssignmentReportPage } from "@/features/assignments/report-page";
import { AssignmentSurface } from "@/features/assignments/surface";
export default function Page() {
  return (
    <ProtectedPage>
      <AssignmentSurface>
        <AssignmentReportPage />
      </AssignmentSurface>
    </ProtectedPage>
  );
}
