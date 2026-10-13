# Kristijan Stevkovski Portfolio

Welcome to the source project for my personal portfolio.

This repository contains the design philosophy, creative direction, documentation, assets and code required to build and maintain the portfolio.

This project is intended to evolve over time while maintaining a consistent identity.

---

# Before Doing Anything

Read every document inside the `/docs` folder.

These documents define the creative vision, design language, motion system, development rules and project structure.

Do not begin implementation before understanding them.

The documentation is the source of truth.

---

# Project Goal

Build a portfolio that feels like entering a curated exhibition rather than browsing a traditional website.

The experience should be memorable, emotional and intentional.

Every design decision should support this goal.

---

# Homepage Structure

The homepage always follows this order:

1. Intro
2. Selected Works
3. About (the deck of photographs that collides into the portrait video)
4. Explore by Category
5. Contact (planned, not built yet)

About was removed from the homepage on 2026-09-10 and returned, in this new position and form, on 2026-10-07 (see docs/10_DECISION_LOG.md).

Do not change this structure without approval.

---

# Project Folder Structure

```
Kristijan-Portfolio/

README.md.txt

docs/       the documentation (the files are .md.txt)
assets/     supplied source files and masters (fonts, artwork, textures, films)
scripts/    build scripts that turn masters into what public/ ships
src/        the Next.js app
public/     what the site serves as-is (films, 3D models, prints, textures)
```

---

# Documentation Order

Read the documentation in this order:

1. 01_PROJECT_VISION.md
2. 02_CREATIVE_MANIFESTO.md
3. 03_DESIGN_SYSTEM.md
4. 04_CONTENT_ARCHITECTURE.md
5. 05_COMPONENT_LIBRARY.md
6. 06_MOTION_GUIDELINES.md
7. 07_DEVELOPMENT_RULES.md
8. 08_ROADMAP.md
9. 09_AI_INSTRUCTIONS.md
10. 10_DECISION_LOG.md
11. 11_VISUAL_ASSETS.md
12. 12_TYPOGRAPHY.md
13. 13_LAYOUT_SYSTEM.md
14. 14_CHANGELOG.md

(Every file is saved as .md.txt; the names above omit the .txt.)

---

# Assets

The `/assets` folder contains all production assets used by the website.

Organize assets into logical folders such as:

- intro
- selected-works
- category-covers
- projects
- textures
- icons
- logos
- videos

Avoid duplicate assets whenever possible.

---

# References

Reference boards and clips (mood, pacing, composition) are supplied with each request rather than kept in the repo. Nothing in them should be copied directly.

---

# Development Philosophy

Build the website section by section.

Complete one section before beginning the next.

Avoid redesigning approved work.

Keep the code modular, maintainable and well documented.

Documentation should always be updated before changing the system.

---

# Creative Philosophy

This project values:

- Simplicity
- Restraint
- Storytelling
- Editorial design
- Large imagery
- Strong typography
- Purposeful motion

The website should never feel like a template.

It should feel like a carefully curated creative experience.

---

# Success Criteria

The project is successful when:

- The experience feels memorable.
- The work is presented clearly.
- Every interaction feels intentional.
- New work can be added without redesigning the website.
- The creative identity remains consistent over time.
