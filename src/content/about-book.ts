/**
 * The About book: a little black book the visitor opens and pages through
 * (src/components/about/BlackBook.tsx). The pages are the designed artwork
 * (assets/about/book, cut into single pages by scripts/build-about-book.mjs);
 * the copy is baked into them, so every page repeats its words here for
 * screen readers and search.
 */
const DIR = "/about/book";
const page = (name: string) => `${DIR}/${name}.webp`;

export type BookFace = {
  src: string;
  /** what the page shows */
  alt: string;
  /** the words on the page, if any */
  text?: string[];
};

/**
 * A leaf is one sheet of the book: `front` faces the reader until the leaf
 * is turned, then `back` does. The first leaf is the front cover and the
 * last is the back cover, so the book closes on both ends.
 */
export type BookLeaf = { front: BookFace; back: BookFace };

export const BOOK_LEAVES: BookLeaf[] = [
  {
    front: {
      src: page("cover"),
      alt: "A worn black notebook covered in stickers: a name tag reading “Hello my name is Chris Stevens”, a skull in a helmet, a grin, a red lighter, a pink hundred-dollar bill, a phone, a hand throwing horns, and a strip of tape that says “Click to open”.",
      text: ["Hello, my name is Chris Stevens.", "Click to open."],
    },
    back: {
      src: page("1l"),
      alt: "About me, spelled in red keycaps on a crumpled white page with stickers in the corners.",
      text: [
        "About me",
        "I’m Christian Stevkovski aka Chris Stevens, an art director, designer, and illustrator with a decade of experience turning ideas into visual identities, campaigns, and original artwork.",
        "My work brings together the structure of graphic design and the imagination of illustration. I think about the bigger picture while staying involved in the details, from setting a brand’s visual direction to drawing the elements that give it character.",
        "I’ve worked across agencies, freelance projects, and creative leadership roles, including art direction and creative directions for Warrior Camos, Boyzclub and LXIX.",
        "Along the way, I’ve learned how to adapt to different industries, collaborate across time zones, and keep great ideas moving through to execution.",
      ],
    },
  },
  {
    front: {
      src: page("1r"),
      alt: "A taped-in polaroid of Chris Stevens in sunglasses and a leather jacket against red.",
      text: ["Chris Stevens", "Creating what people remember."],
    },
    back: {
      src: page("2l"),
      alt: "An illustration taped to a black page with red tape: an armoured samurai with a skull mask and gold horns in front of a red sun.",
    },
  },
  {
    front: {
      src: page("2r"),
      alt: "My work history, on a white page under a red label.",
      text: [
        "My work history",
        "Art Director. LXIX, Champagne and Wine (USA). Remote, 2022 to present.",
        "Creative Director / Art Director. Boyzclub, formerly known as Warrior Camos (USA). Remote, 2021 to present.",
        "Graphic Designer. NextStep Marketing Agency (Macedonia). Full-time, 2019 to 2021.",
        "Graphic Designer / Visual Artist. Promotion Marketing Agency (Macedonia). Full-time in house, 2017 to 2018.",
        "Concept Artist. Natoken Entertainment (Denmark). Internship, 2015 to 2016. Developing designs, illustrations, and campaigns from ideation to execution. Managing creative workflows and collaborating with cross-functional teams.",
        "Freelancing was a huge part of my career ever since 2016 and has been done throughout the years; I have slowed down with the freelance work once I started working for Warrior Camos back in 2021, but never stopped.",
      ],
    },
    back: {
      src: page("3l"),
      alt: "How I spend my free time, on a red label over a black page of white line sketches: a hammer-wielding figure, a masked hero and a gunslinger.",
      text: [
        "How I spend my free time",
        "Away from the screen, you’ll usually find me outdoors with my dog, discovering new music, oil painting, skateboarding and dabbling in photography. Those interests feed the same curiosity that keeps me creating.",
      ],
    },
  },
  {
    front: {
      src: page("3r"),
      alt: "More white line sketches on black: a torso study, a caped hero, a dog in goggles and a seated classical figure.",
    },
    back: {
      src: page("back"),
      alt: "The back of the black notebook: a black-and-white drawing of an ostrich in sneakers clipped to it, and a red tag reading “Chris Stevens 2026”.",
      text: ["Chris Stevens, 2026."],
    },
  },
];

/** width / height of one page (the box every page image is cut to) */
export const BOOK_PAGE_ASPECT = 1204 / 1600;
