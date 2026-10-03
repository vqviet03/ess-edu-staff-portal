import { ExcelImport } from "@/features/excel/import";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page() {
  return (
    <ProtectedPage>
      <ExcelImport />
    </ProtectedPage>
  );
}
