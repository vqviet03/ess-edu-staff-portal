import { ProtectedPage } from "@/shared/protected-page";
import { SettingsPage } from "@/features/settings/page";
export default function Page() { return <ProtectedPage><SettingsPage /></ProtectedPage>; }
