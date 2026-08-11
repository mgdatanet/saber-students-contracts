import type { Metadata } from "next";
import { Barlow, Geist_Mono } from "next/font/google";
import "./globals.css";

// SABER College's brandbook (July 2024) specifies Barlow as the official
// typeface — see _Development Examples or Screenshots/Brandbook_SABER-College_04jul24.pdf.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SABER College — Student Enrollment Agreements",
  description: "Financial Aid contract management for SABER College",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
