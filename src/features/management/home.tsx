"use client";
import {StorageNotice} from "@/features/materials/storage-notice";
import dynamic from "next/dynamic";
import { Home } from "@/features/classes/home";
import { useWorkspace } from "@/features/access/hooks";
import { Feedback } from "@/shared/ui";
const Dashboard = dynamic(
  () => import("./dashboard").then((m) => m.ManagementDashboard),
  { loading: () => <Feedback loading /> },
);
export function StaffHome() {
  const { selected } = useWorkspace();
  return selected === "manager" ? <><StorageNotice/><Dashboard /></> : <Home />;
}
