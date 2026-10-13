import type { ReactNode } from "react";

/**
 * The fade every page arrives with (06_MOTION_GUIDELINES.md: fade, gentle
 * movement). A CSS animation (globals.css .page-fade), not a JS one: the
 * page paints straight from the server HTML and fades in on its own,
 * without waiting for JavaScript to hydrate — a framer-motion
 * `initial={{ opacity: 0 }}` was server-rendered as opacity 0, leaving every
 * page blank until hydration (and for good without JS).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
