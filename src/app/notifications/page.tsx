import { ProtectedPage } from "@/shared/protected-page";
import { NotificationsPage } from "@/features/materials/pages";
export default function Page() { return <ProtectedPage><NotificationsPage/></ProtectedPage>; }
