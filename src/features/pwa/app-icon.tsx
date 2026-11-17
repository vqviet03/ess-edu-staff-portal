"use client";
import MenuBook from "@mui/icons-material/MenuBook";
import Box from "@mui/material/Box";
import { apiConfiguration } from "@/api/config";
import { portal } from "./platform";
import { useApplicationSettingsQuery } from "@/api/settings-api";
export function AppIcon() {
  const { data } = useApplicationSettingsQuery(),
    branding = data?.portals?.[portal];
  return branding?.iconSvg && !apiConfiguration.error ? (
    <Box
      component="img"
      src={`${apiConfiguration.baseUrl}/portal/icon.png?portal=${portal}&size=192&v=${data?.version}`}
      alt=""
      sx={{
        width: 28,
        height: 28,
        objectFit: "contain",
        verticalAlign: "middle",
        mr: 1,
      }}
    />
  ) : (
    <MenuBook
      sx={{
        color: branding?.foreground ?? "primary.main",
        bgcolor: branding?.background,
        borderRadius: 1,
        verticalAlign: "middle",
        mr: 1,
      }}
    />
  );
}
