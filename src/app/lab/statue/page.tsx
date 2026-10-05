import type { Metadata } from "next";

import { StatueShowcase } from "@/components/lab/StatueShowcase";

// Experiment page — reachable by URL only, not linked from the site's navigation.
export const metadata: Metadata = { title: "Lab — 3D statue", robots: { index: false } };

export default function StatueLabPage() {
  return <StatueShowcase />;
}
