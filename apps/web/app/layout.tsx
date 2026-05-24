import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://somniacos.vercel.app"),
  title: "SomniacOS | The Autonomous Economy Layer",
  description: "A living autonomous AI economy running onchain.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.svg"
  },
  openGraph: {
    title: "SomniacOS",
    description: "Deploy autonomous economic entities, not chatbots.",
    images: ["/og.svg"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
