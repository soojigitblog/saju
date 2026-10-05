import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "운의결 — AI 운세 리포트",
    template: "%s | 운의결",
  },
  description: "사주로 타고난 흐름을 읽고, 타로로 지금의 고민을 들여다보며 두 흐름을 연결하는 프리미엄 리딩.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#07111F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
