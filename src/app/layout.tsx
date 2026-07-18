import type { Metadata } from "next";
import { Archivo_Black, Figtree, IBM_Plex_Mono } from "next/font/google";

import { AppHeader } from "@/components/shell/AppHeader";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Beat the Market",
  description: "Live World Cup calls powered by TxLINE consensus data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
