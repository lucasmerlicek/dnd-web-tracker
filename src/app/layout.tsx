import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import PageTransition from "@/components/ui/PageTransition";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "D&D Character Tracker",
  description: "Dark fantasy D&D 5E character management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-dark-bg text-ff12-text antialiased`}>
        <SessionProvider>
          <PageTransition>{children}</PageTransition>
        </SessionProvider>
      </body>
    </html>
  );
}
