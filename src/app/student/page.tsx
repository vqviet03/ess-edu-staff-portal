import { StudentDetail } from "@/features/students/detail";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <StudentDetail />
    </ProtectedPage>
  );
}
