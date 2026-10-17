import "../features/introduction/fonts.css";
import "../../public/introduction.css";
import type { Metadata } from "next";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "@fontsource/roboto/vietnamese-400.css";
import "@fontsource/roboto/vietnamese-500.css";
import "@fontsource/roboto/vietnamese-700.css";
import { Providers } from "@/theme/providers";
export const metadata: Metadata = {
  title: "Staff Portal",
  description: "Quản lý lớp học và kết quả học tập",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
