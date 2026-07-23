import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * 12_TYPOGRAPHY.md — three fonts, each with one job. Do not substitute.
 */

/** Primary UI font: nav, headings, project titles, about, body copy. */
const integralCF = localFont({
  src: [
    { path: "../../assets/fonts/IntegralCF-Regular.otf", weight: "400", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-RegularOblique.otf", weight: "400", style: "italic" },
    { path: "../../assets/fonts/IntegralCF-Medium.otf", weight: "500", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-MediumOblique.otf", weight: "500", style: "italic" },
    { path: "../../assets/fonts/IntegralCF-DemiBold.otf", weight: "600", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-DemiBoldOblique.otf", weight: "600", style: "italic" },
    { path: "../../assets/fonts/IntegralCF-Bold.otf", weight: "700", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-BoldOblique.otf", weight: "700", style: "italic" },
    { path: "../../assets/fonts/IntegralCF-ExtraBold.otf", weight: "800", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-ExtraBoldOblique.otf", weight: "800", style: "italic" },
    { path: "../../assets/fonts/IntegralCF-Heavy.otf", weight: "900", style: "normal" },
    { path: "../../assets/fonts/IntegralCF-HeavyOblique.otf", weight: "900", style: "italic" },
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
  title: "Kristijan Stevkovski",
  description:
    "A curated exhibition of brand direction, apparel design, illustration and creative concepts.",
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
