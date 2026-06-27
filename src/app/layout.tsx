import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

// Strip quotes if present (Docker may pass them as part of the value)
const rawUrl = process.env.NEXTAUTH_URL || "https://gosafe-smartcity.vercel.app/";
const siteUrl = rawUrl.replace(/^["']|["']$/g, "");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "GoSafe - Smart Urban City Solution",
    template: "%s | GoSafe",
  },
  description:
    "Real-time safety application that processes citizen reports, camera footage, and weather telemetry to evaluate road hazard risks and assist in safe routing.",
  keywords: [
    "road hazards",
    "flood alerts",
    "traffic safety",
    "route detour",
    "GoSafe",
    "Goong Map",
    "weather telemetry",
  ],
  authors: [{ name: "GoSafe Team" }],
  creator: "GoSafe",
  publisher: "GoSafe",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "GoSafe",
    title: "GoSafe - Smart Urban City Solution",
    description:
      "Real-time safety application that processes citizen reports, camera footage, and weather telemetry to evaluate road hazard risks and assist in safe routing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoSafe - Smart Urban City Solution",
    description:
      "Real-time safety application that processes citizen reports, camera footage, and weather telemetry to evaluate road hazard risks and assist in safe routing.",
  },
  applicationName: "GoSafe",
  category: "safety",
  classification: "Safety & Navigation",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/android-icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-57x57.png", sizes: "57x57" },
      { url: "/apple-icon-60x60.png", sizes: "60x60" },
      { url: "/apple-icon-72x72.png", sizes: "72x72" },
      { url: "/apple-icon-76x76.png", sizes: "76x76" },
      { url: "/apple-icon-114x114.png", sizes: "114x114" },
      { url: "/apple-icon-120x120.png", sizes: "120x120" },
      { url: "/apple-icon-144x144.png", sizes: "144x144" },
      { url: "/apple-icon-152x152.png", sizes: "152x152" },
      { url: "/apple-icon-180x180.png", sizes: "180x180" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  other: {
    "msapplication-TileColor": "#ffffff",
    "msapplication-TileImage": "/ms-icon-144x144.png",
    "theme-color": "#ffffff",
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "GoSafe",
  description:
    "Real-time safety application that processes citizen reports, camera footage, and weather telemetry to evaluate road hazard risks and assist in safe routing.",
  url: siteUrl,
  applicationCategory: "SafetyApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

import { getSession } from "@/lib/auth";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
        
        {/* Favicons */}
        <link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
        <meta name="theme-color" content="#ffffff" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}

