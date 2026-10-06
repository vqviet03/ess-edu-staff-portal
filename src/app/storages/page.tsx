import { ProtectedPage } from "@/shared/protected-page";
import { StoragePage } from "@/features/materials/pages";
export default function Page() { return <ProtectedPage><StoragePage/></ProtectedPage>; }
