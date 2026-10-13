export interface LogofolioBrand {
  id: string;
  title: string;
  /** The brand's 3-second film, a public/ path (built by scripts/build-logofolio-video.mjs). */
  film: { src: string; poster: string; alt: string };
}

/**
 * The five brands of the logofolio, in the order of the supplied reference
 * board. Each is one film (public/<brand>/<brand>-animation.mp4, cut from
 * the brand's stills) whose first frame is the logo: on the page it holds
 * on that frame as a still until its screen arrives, then starts to move.
 * The poster is that same first frame, shown until the video has painted.
 */
export const logofolioBrands: LogofolioBrand[] = [
  { id: "boyzclub", title: "BoyzClub" },
  { id: "mono", title: "mono" },
  { id: "rc", title: "RC" },
  { id: "lxix", title: "LXIX" },
  { id: "warrior", title: "WARRIOR" },
].map((brand) => ({
  ...brand,
  film: {
    src: `/${brand.id}/${brand.id}-animation.mp4`,
    poster: `/${brand.id}/${brand.id}-animation-poster.webp`,
    alt: `${brand.title} logo, then ten brand stills in quick hard cuts`,
  },
}));
