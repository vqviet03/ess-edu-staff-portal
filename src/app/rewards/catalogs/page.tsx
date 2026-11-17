import { ProtectedPage } from "@/shared/protected-page";
import { GiftCatalogManager } from "@/features/gifts/manager";
export default function Page() {
  return (
    <ProtectedPage>
      <GiftCatalogManager />
    </ProtectedPage>
  );
}
