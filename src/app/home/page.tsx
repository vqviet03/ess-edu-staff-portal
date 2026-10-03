import { Home } from "@/features/classes/home";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <Home />
    </ProtectedPage>
  );
}
