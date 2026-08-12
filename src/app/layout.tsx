import type { Metadata } from "next";
import { Google_Sans_Flex, Manrope } from "next/font/google";
import "./globals.css";

const googleSansFlex = Google_Sans_Flex({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Emma Kwon",
  description: "Emma Kwon — a quiet, cinematic creative studio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${googleSansFlex.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
