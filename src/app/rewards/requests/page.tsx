import { ProtectedPage } from "@/shared/protected-page";
import { GiftRequests } from "@/features/gifts/requests";
export default function Page() {
  return (
    <ProtectedPage>
      <GiftRequests />
    </ProtectedPage>
  );
}
