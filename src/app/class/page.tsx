import { ClassDashboard } from "@/features/classes/dashboard";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <ClassDashboard />
    </ProtectedPage>
  );
}
