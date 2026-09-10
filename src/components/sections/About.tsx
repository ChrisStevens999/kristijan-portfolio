"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./About.module.css";

const freeTime = "Away from the screen, you’ll usually find me outdoors with my dog, discovering new music, oil painting, photography and skateboarding. Those interests feed the same curiosity that keeps me creating.";

export function About() {
  const track = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reveal = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const area = track.current;
    const title = heading.current;
    const page = reveal.current;
    const surface = canvas.current;
    if (!area || !title || !page || !surface) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const context = surface.getContext("2d");
    const frames: HTMLImageElement[] = [];
    let noses: number[] = [];
    let loaded = false;
    let cancelled = false;
    let pending = 0;
    let started = false;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const draw = () => {
      pending = 0;
      if (motion.matches) { title.style.transform = ""; page.style.opacity = ""; return; }
      const rect = area.getBoundingClientRect();
      const progress = clamp(-rect.top / Math.max(1, area.offsetHeight - window.innerHeight));
      const travel = clamp((progress - .12) / .68);
      const index = Math.round(travel * 144);
      // The title's right edge stays in front of the car's visible nose.
      const right = title.offsetLeft + title.offsetWidth;
      const nose = loaded ? noses[index] * rect.width : (1.2 - travel * 2) * rect.width;
      title.style.transform = `translateX(${Math.min(0, nose - right)}px)`;
      title.style.opacity = progress > .8 ? "0" : "1";
      const opacity = clamp((progress - .8) / .15);
      page.style.opacity = String(opacity);
      if (context) {
        context.clearRect(0, 0, 960, 420);
        if (loaded && progress < .83) context.drawImage(frames[index], 0, 0, 960, 420);
      }
    };
    const schedule = () => { if (!pending) pending = requestAnimationFrame(draw); };
    const load = async () => {
      if (started || motion.matches) return;
      started = true;
      try {
        const response = await fetch("/about/noses.json");
        if (!response.ok) throw new Error("Animation unavailable");
        noses = await response.json();
        let next = 0;
        await Promise.all(Array.from({length: 6}, async () => {
          while (next < 145 && !cancelled) {
            const i = next++;
            const image = new window.Image();
            image.src = `/about/frames/${String(i).padStart(3, "0")}.webp`;
            await image.decode(); frames[i] = image;
          }
        }));
        if (!cancelled) { loaded = true; schedule(); }
      } catch { /* Text and the second page still work if an asset cannot load. */ }
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void load();
    }, {rootMargin: "100% 0px"});
    observer.observe(area);
    const onMotion = () => { if (!motion.matches) void load(); schedule(); };
    window.addEventListener("scroll", schedule, {passive: true});
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", onMotion);
    schedule();
    return () => {
      cancelled = true; observer.disconnect(); cancelAnimationFrame(pending);
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  return <section id="about" className={`${styles.about} snap-start`} aria-label="About me">
    <div className={styles.intro}>
      <div className={styles.copy}>
        <h2>About me</h2>
        <p>I’m Christian Stevkovski, an art director, designer, and illustrator with a decade of experience turning ideas into visual identities, campaigns, and original artwork.</p>
        <p>My work brings together the structure of graphic design and the imagination of illustration. I think about the bigger picture while staying involved in the details, from setting a brand’s visual direction to drawing the elements that give it character.</p>
        <p>I’ve worked across agencies, freelance projects, and creative leadership roles, including art direction and creative direction for Warrior Camos, Boyzclub and LXIX. Along the way, I’ve learned how to adapt to different industries, collaborate across time zones, and keep good ideas moving through to execution.</p>
      </div>
      <Image unoptimized className={styles.portrait} src="/about/portrait.webp" alt="Christian Stevkovski" width={600} height={800} />
    </div>
    <div ref={track} className={styles.track}>
      <div className={styles.stage}>
        <div ref={reveal} className={styles.interests}>
          <Image unoptimized className={styles.headphones} src="/about/headphones.webp" alt="" width={600} height={600} />
          <Image unoptimized className={styles.board} src="/about/board.webp" alt="" width={800} height={500} />
          <p>{freeTime}</p>
          <Image unoptimized className={styles.dog} src="/about/dog.webp" alt="" width={600} height={700} />
          <Image unoptimized className={styles.guitar} src="/about/guitar.webp" alt="" width={900} height={600} />
        </div>
        <h3 ref={heading} className={styles.title}>How I spend<br />my free time</h3>
        <canvas ref={canvas} className={styles.car} width={960} height={420} aria-hidden="true" />
      </div>
    </div>
  </section>;
}


