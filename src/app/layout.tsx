import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";
import { DemoModeBanner } from "@/components/shared/demo-mode-banner";

export const metadata: Metadata = {
  title: "Diamond Design AI Agent",
  description: "Create or customize premium diamond jewelry with AI."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <DemoModeBanner />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
