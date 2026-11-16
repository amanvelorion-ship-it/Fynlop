import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fynlop — Independent Comics",
  description:
    "Discover original digital comics from independent creators. Find your next favorite story at Fynlop.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
