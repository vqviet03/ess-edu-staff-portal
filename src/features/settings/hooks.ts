"use client";
import { useApplicationSettingsQuery } from "@/api/settings-api";
export function useApplicationSettings() {
  const query = useApplicationSettingsQuery();
  return { settings: query.data ?? { appName: "ESS", classIdPrefix: "ess", version: 1, schemaReady: true }, query };
}
