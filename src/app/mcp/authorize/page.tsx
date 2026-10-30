import { ProtectedPage } from "@/shared/protected-page";
import { McpConsentPage } from "@/features/mcp/consent";
export default function Page() {
  return (
    <ProtectedPage>
      <McpConsentPage />
    </ProtectedPage>
  );
}
