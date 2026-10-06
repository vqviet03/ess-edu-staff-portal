import { ProtectedPage } from "@/shared/protected-page";
import { LibraryPage } from "@/features/materials/pages";
export default function Page() { return <ProtectedPage><LibraryPage/></ProtectedPage>; }
