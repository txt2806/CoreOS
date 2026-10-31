import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/core/context/theme-provider";
import { ToastProvider } from "@/core/context/toast-provider";
import { AppShell } from "@/core/layout/app-shell";

export const metadata: Metadata = {
  title: {
    default: "OneOps — Điều hành công việc, nhân sự và dự án",
    template: "%s · OneOps",
  },
  description:
    "Hệ thống nội bộ quản lý điểm danh, công việc Kanban và dự án Agile cho doanh nghiệp.",
  applicationName: "OneOps",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1522" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" data-theme="light" data-density="comfortable" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <a className="skip-link" href="#oneops-main">
              Bỏ qua điều hướng, tới nội dung chính
            </a>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
