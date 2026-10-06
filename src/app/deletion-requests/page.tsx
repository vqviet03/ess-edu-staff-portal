import { ProtectedPage } from "@/shared/protected-page";
import { DeletionPage } from "@/features/materials/pages";
export default function Page() { return <ProtectedPage><DeletionPage/></ProtectedPage>; }
