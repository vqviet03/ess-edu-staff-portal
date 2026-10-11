import { ProtectedPage } from "@/shared/protected-page";
import { PersonalProfilePage } from "@/features/profile/page";
export default function Page(){return <ProtectedPage><PersonalProfilePage/></ProtectedPage>;}
