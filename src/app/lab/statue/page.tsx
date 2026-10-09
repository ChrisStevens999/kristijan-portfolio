import { permanentRedirect } from "next/navigation";

// The statue showcase started here as an unlinked lab experiment; it now
// lives in Creative Exploration. The old URL keeps working.
export default function StatueLabPage() {
  permanentRedirect("/projects/cyclops-sculpture");
}
