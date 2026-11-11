import { BlackBook } from "@/components/about/BlackBook";
import { TEXTURES } from "@/lib/textures";

/**
 * About, on the homepage and as its own page: one screen of the dark paper
 * texture with the little black book lying on it (BlackBook: click to open,
 * turn the pages). On the homepage it is a snap stop between Selected Work
 * and the categories and starts closed; /about opens it on the first spread.
 */
export function AboutBook({
  startOpen = false,
  heading = "h2",
  scrollCue = false,
}: {
  startOpen?: boolean;
  heading?: "h1" | "h2";
  /** the page goes on below: show "Scroll down to check my work" beside the closed book */
  scrollCue?: boolean;
}) {
  const Heading = heading;
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="relative overflow-hidden bg-[#000]"
      style={{
        height: "100svh",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        backgroundImage: `url(${TEXTURES.black})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Heading id="about-heading" className="sr-only">
        About me
      </Heading>
      <BlackBook startOpen={startOpen} scrollCue={scrollCue} />
    </section>
  );
}
