import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/ContactForm";
import { ContactNav } from "@/components/contact/ContactNav";
import { anton, inter } from "@/components/contact/fonts";
import { getAllCategories } from "@/lib/content";
import { textureStyle } from "@/lib/textures";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Chris Stevens: art direction, design and illustration.",
};

/**
 * Contact, to the supplied mockup: one red screen (its own supplied
 * background, public/contact/bg.webp) with the page's own top
 * menu, CONTACT ME as a poster title across the column, the form under its
 * right-hand side and the dog in goggles in the bottom-left corner.
 *
 * The mockup is a 16:9 board, so on wide screens everything is sized in
 * units of that board (--u, the .contact-* rules in globals.css) and the
 * page stays one screen whatever the window's shape. Phones stack it: menu,
 * title, form, dog.
 */
export default function ContactPage() {
  const categories = getAllCategories().map((c) => ({ title: c.title, href: c.href ?? `/categories/${c.slug}` }));
  return (
    <main className={`contact-page ${inter.className}`} style={textureStyle("/contact/bg.webp")}>
      <div className="contact-col">
        <ContactNav categories={categories} />
        <h1 className={`contact-title ${anton.className}`}>Contact me</h1>
        <ContactForm />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed cut-out pinned to the corner, already sized for it */}
      <img className="contact-dog" src="/contact/dog.webp" alt="" width={579} height={541} draggable={false} />
    </main>
  );
}
