import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "活码系统 - Live QR Code",
  description: "一个活码对应 N 个目标，随时切换展示内容",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
