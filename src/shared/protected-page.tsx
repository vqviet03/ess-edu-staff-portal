import { Suspense, type ReactNode } from "react";
import { Guard } from "@/features/auth/runtime";
import { Feedback } from "./ui";
export function ProtectedPage({ children }: { children: ReactNode }) {
  return (
    <Guard>
      <Suspense fallback={<Feedback loading />}>{children}</Suspense>
    </Guard>
  );
}
