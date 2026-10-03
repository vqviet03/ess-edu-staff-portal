import { Scores } from "@/features/scores/list";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <Scores />
    </ProtectedPage>
  );
}
