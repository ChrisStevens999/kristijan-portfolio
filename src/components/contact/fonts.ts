import { Anton, Inter } from "next/font/google";

/**
 * The Contact page's two faces, loaded only where the page uses them
 * (12_TYPOGRAPHY.md): Anton for the poster title (the site's condensed
 * display face, as on the Apparel name tag) and Inter, heavy, for the menu,
 * the field labels and the button — the mockup's grotesque.
 */
export const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
export const inter = Inter({ weight: ["700", "800"], subsets: ["latin"], display: "swap" });
