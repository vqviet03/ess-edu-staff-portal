import { ProtectedPage } from "@/shared/protected-page";
import { GiftProxy } from "@/features/gifts/requests";
export default function Page() {
  return (
    <ProtectedPage>
      <GiftProxy />
    </ProtectedPage>
  );
}
