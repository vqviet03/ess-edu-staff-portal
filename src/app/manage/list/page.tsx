import { ManagementListPage } from "@/features/management/list";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page(){return <ProtectedPage><ManagementListPage/></ProtectedPage>;}
