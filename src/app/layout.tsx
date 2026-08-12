import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emma Kwon",
  description: "Emma Kwon — a quiet, cinematic creative studio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
