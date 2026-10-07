import fs from "node:fs";
import path from "node:path";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

/**
 * About — the page the homepage's "Click to find out about me" opens.
 *
 * Five boards in the supplied order, each the designed artwork
 * (assets/about/boards, shipped by scripts/build-about-boards.mjs), each a
 * snap stop. On a landscape screen a board fills the screen edge to edge,
 * so the page reads one screen at a time. On a portrait screen (a phone) a
 * board uses its portrait export (assets/about/boards/portrait) at its own
 * proportions, full width, so nothing of it is cut off whatever the
 * phone's height: the boards stack, and one taller than the screen scrolls
 * on inside (the .about-board rules in globals.css).
 *
 * The copy is baked into the artwork, so each board repeats it for screen
 * readers and search; 12_TYPOGRAPHY.md wants it live HTML eventually — a
 * later pass, once the page is built out as components.
 */
type Board = { id: string; file: string; alt: string; text: string[] };

const BOARDS: Board[] = [
  {
    id: "about-me",
    file: "1-about-me.webp",
    alt: "About me: the title in red keycaps, a bio, and a polaroid of Chris Stevens labelled creative direction, art direction, illustration.",
    text: [
      "About me",
      "I’m Christian Stevkovski aka Chris Stevens an art director, designer, and illustrator with a decade of experience turning ideas into visual identities, campaigns, and original artwork.",
      "My work brings together the structure of graphic design and the imagination of illustration. I think about the bigger picture while staying involved in the details, from setting a brand’s visual direction to drawing the elements that give it character.",
      "I’ve worked across agencies, freelance projects, and creative leadership roles, including art direction and creative directions for Warrior Camos, Boyzclub and LXIX. Along the way, I’ve learned how to adapt to different industries, collaborate across time zones, and keep good ideas moving through to execution.",
      "Creative direction. Art direction. Illustration.",
    ],
  },
  {
    id: "work-history-title",
    file: "2-work-history-title.webp",
    alt: "My work history, on red.",
    text: ["My work history"],
  },
  {
    id: "work-history",
    file: "3-work-history.webp",
    alt: "Work history: Art Director at LXIX; Creative Director and Art Director at Boyzclub, formerly Warrior Camos; Graphic Designer at NextStep; Graphic Designer and Concept Artist at Promotion; Concept Artist at Natoken.",
    text: [
      "Art Director — LXIX, Champagne and Wine (USA), remote, 2022 to present.",
      "Creative Director / Art Director — Boyzclub, formerly known as Warrior Camos (USA), remote, 2021 to present. Leading all visual direction and branding for Warrior Camos and LXIX. Developing design across multiple sub-brands and partner projects. Managing creative workflows and collaborating with cross-functional teams. Working closely with the founder, Cory, to evolve the brand’s identity and presence.",
      "Graphic Designer — NextStep Marketing Agency (Macedonia), full-time, 2019 to 2021.",
      "Graphic Designer / Concept Artist — Promotion Marketing Agency (Macedonia), full-time in house, 2017 to 2018.",
      "Concept Artist — Natoken Entertainment (Denmark), internship, 2015 to 2016. Developing designs, illustrations, and campaigns from ideation to execution. Managing creative workflows and collaborating with cross-functional teams.",
      "Freelancing was a huge part of my career ever since 2016 and has been done throughout the years; I have slowed down with the freelance work once I started working for Warrior Camos in 2021.",
    ],
  },
  {
    id: "free-time-title",
    file: "4-free-time-title.webp",
    alt: "How I spend my free time, on red.",
    text: ["How I spend my free time"],
  },
  {
    id: "free-time",
    file: "5-free-time.webp",
    alt: "Headphones, a Baker skateboard, a dog in goggles and a guitar in red around a short note about free time.",
    text: [
      "Away from the screen, you’ll usually find me outdoors with my dog, discovering new music, oil painting, photography and skateboarding. Those interests feed the same curiosity that keeps me creating.",
    ],
  },
];

const BOARDS_DIR = "/about/boards";
/** a portrait export exists for this board (checked once, at build time) */
const hasPortrait = (file: string) => fs.existsSync(path.join(process.cwd(), "public", BOARDS_DIR, "portrait", file));

export default function AboutPage() {
  return (
    // data-scroll-snap: the page snaps one board per gesture (globals.css)
    <main data-scroll-snap className="bg-[#000] text-off-white">
      <h1 className="sr-only">About me</h1>
      {BOARDS.map((board, i) => (
        <section
          key={board.id}
          id={board.id}
          aria-label={board.text[0]}
          className="about-board relative overflow-hidden bg-[#000]"
          style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
        >
          <picture>
            {hasPortrait(board.file) ? (
              <source media="(orientation: portrait)" srcSet={`${BOARDS_DIR}/portrait/${board.file}`} />
            ) : null}
            <img
              src={`${BOARDS_DIR}/${board.file}`}
              alt={board.alt}
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </picture>
          <div className="sr-only">
            {board.text.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
