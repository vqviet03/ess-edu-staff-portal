import type { NextConfig } from "next";
import { apiConfiguration } from "./src/api/config";
if (process.env.NODE_ENV === "production" && apiConfiguration.error) throw new Error(apiConfiguration.error);
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default config;
