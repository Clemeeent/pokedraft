import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-press-start" });

export const metadata: Metadata = {
  title: "PokéDraft — daily Pokémon draft",
  description: "Draft 6 random Pokémon, keep your best 3, battle everyone else's team of the day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b1f3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixelFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
