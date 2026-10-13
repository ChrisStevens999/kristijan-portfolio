import type { Metadata } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import localFont from "next/font/local";
import "./globals.css";

/**
 * 12_TYPOGRAPHY.md — three site-wide fonts, each with one job. Do not
 * substitute. (Two page-scoped faces load where they're used: Anton for the
 * Apparel name tag, Inter for the About CTA.) next/font preloads every file
 * listed here on every page, so list only the styles the site uses — no
 * italics are used anywhere, so the Integral CF obliques aren't loaded.
 */

/** Primary UI font: nav, headings, project titles, about, body copy. */
const integralCF = localFont({
  src: [
    { path: "../../assets/fonts/IntegralCF-Regular.otf", weight: "400", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-Medium.otf", weight: "500", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-DemiBold.otf", weight: "600", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-Bold.otf", weight: "700", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-ExtraBold.otf", weight: "800", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-Heavy.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-integral-cf",
});

/** Accent font, used sparingly: category names, small labels, metadata, dates. */
const benzin = localFont({
  src: [
    { path: "../../assets/fonts/Benzin-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../assets/fonts/Benzin-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../assets/fonts/Benzin-Semibold.ttf", weight: "600", style: "normal" },
    { path: "../../assets/fonts/Benzin-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../assets/fonts/Benzin-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-benzin",
});

/** Intro only: main intro title, hero statement, large artistic moments. */
const akuKamu = localFont({
  src: "../../assets/fonts/AkuKamu.otf",
  variable: "--font-aku-kamu",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // every page names itself: "<page> | Kristijan Stevkovski"
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  // the share image is src/app/opengraph-image.jpg (the Intro's opening photo)
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${integralCF.variable} ${benzin.variable} ${akuKamu.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-off-white">
        {children}
      </body>
    </html>
  );
}
