import { ProtectedPage } from "@/shared/protected-page";
import type { ReactNode } from "react";
export default function Layout({ children }: { children: ReactNode }) {
  return <ProtectedPage>{children}</ProtectedPage>;
}
