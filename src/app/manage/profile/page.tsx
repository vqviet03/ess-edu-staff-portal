import { ProfilePage } from "@/features/management/profile";
import { ProtectedPage } from "@/shared/protected-page";
export default function Page(){return <ProtectedPage><ProfilePage/></ProtectedPage>;}
