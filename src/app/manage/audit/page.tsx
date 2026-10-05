import { AuditPage } from "@/features/management/activity";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page(){return <ProtectedPage><AuditPage/></ProtectedPage>;}
