import { ProtectedPage } from "@/shared/protected-page";
import { AssignmentReportPage } from "@/features/assignments/report-page";
export default function Page() {
  return (
    <ProtectedPage>
      <AssignmentReportPage />
    </ProtectedPage>
  );
}
