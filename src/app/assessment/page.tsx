import { AssessmentDetail } from "@/features/assessments/detail";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <AssessmentDetail />
    </ProtectedPage>
  );
}
