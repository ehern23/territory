import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Territory — Grow relationships. See the territory.",
  description:
    "Territory is an experimental spatial interface for strategic enterprise GTM. Accounts become trees, stakeholders become leaves, relationships change through seasons.",
  applicationName: "Territory",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#14151a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
