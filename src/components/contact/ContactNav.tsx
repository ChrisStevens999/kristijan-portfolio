"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CONTACT_NAV } from "@/content/contact";

import { anton } from "./fonts";

/**
 * The Contact page's top menu, as in the mockup: About me, Work, Contact,
 * and a hamburger at the far end. The hamburger opens the whole site as a
 * full-screen list (home, about, the work categories, contact): the three
 * links are the short way, the list the long one.
 */
export function ContactNav({ categories }: { categories: { title: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const burger = burgerRef.current;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      burger?.focus();
    };
  }, [open]);

  const menu = [
    { label: "Home", href: "/" },
    { label: "About me", href: "/about" },
    ...categories.map((c) => ({ label: c.title, href: c.href })),
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      <nav className="contact-nav" aria-label="Main">
        {CONTACT_NAV.map((item) => (
          <Link key={item.href} href={item.href} aria-current={item.href === "/contact" ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
        <button
          ref={burgerRef}
          type="button"
          className="contact-burger"
          aria-label="Open the menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 28 20" aria-hidden>
            <path d="M0 2h28M0 10h28M0 18h28" stroke="currentColor" strokeWidth="2.6" />
          </svg>
        </button>
      </nav>

      {open && (
        <div className="contact-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <button ref={closeRef} type="button" className="contact-menu-close" aria-label="Close the menu" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2.6" />
            </svg>
          </button>
          <ul className={anton.className}>
            {menu.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
