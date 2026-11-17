import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./globals.css";

const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "FYNLOP",
      url: "https://www.fynlop.com",
      logo: {
        "@type": "ImageObject",
        url: "https://www.fynlop.com/fynlop-icon.png",
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      name: "FYNLOP",
      url: "https://www.fynlop.com",
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fynlop.com"),
  title: "FYNLOP — Stories Beyond Reality",
  description:
    "Discover bold digital comics and books from independent creators. Find your next world at FYNLOP.",
  applicationName: "FYNLOP",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/fynlop-icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/fynlop-icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/fynlop-apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "FYNLOP",
    title: "FYNLOP — Stories Beyond Reality",
    description:
      "Discover bold digital comics and books from independent creators. Find your next world at FYNLOP.",
    images: [
      {
        url: "/fynlop-og.png",
        width: 1200,
        height: 630,
        alt: "FYNLOP — Stories Beyond Reality",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FYNLOP — Stories Beyond Reality",
    description:
      "Discover bold digital comics and books from independent creators. Find your next world at FYNLOP.",
    images: ["/fynlop-og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
