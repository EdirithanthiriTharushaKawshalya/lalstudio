import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "LAL STUDIO — Since 1982 · Ambalangoda",
    template: "%s | LAL STUDIO",
  },
  description:
    "Wedding, portrait and event photography in the heart of Ambalangoda. Photographs for the moments you want to keep. Since 1982.",
  openGraph: {
    title: "LAL STUDIO — Since 1982",
    description:
      "Photography for the moments you want to keep. Ambalangoda, Sri Lanka.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
