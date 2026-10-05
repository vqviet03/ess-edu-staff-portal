import { StaffHome } from "@/features/management/home";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <StaffHome />
    </ProtectedPage>
  );
}
