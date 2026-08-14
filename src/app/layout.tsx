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
  description:
    "Emma Kwon — books, music, character worlds, children's creative work, and the Studio behind them.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${googleSansFlex.variable} ${manrope.variable}`}>
      <body>
        <div className="atmosphere" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
