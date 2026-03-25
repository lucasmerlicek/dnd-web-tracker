import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import PageTransition from "@/components/ui/PageTransition";

export const metadata: Metadata = {
  title: "D&D Character Tracker",
  description: "Dark fantasy D&D 5E character management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-bg text-parchment font-serif antialiased">
        <SessionProvider>
          <PageTransition>{children}</PageTransition>
        </SessionProvider>
      </body>
    </html>
  );
}
