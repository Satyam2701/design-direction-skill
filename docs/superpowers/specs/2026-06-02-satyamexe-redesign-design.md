# satyam.exe — Redesign Spec
**Date:** 2026-06-02  
**Project:** `/satyamexe`  
**Reference:** designerdada.com  
**Decision log:** dark-first, expressive microinteractions, minimal hero, full-screen menu

---

## 1. Design Philosophy

Brutally minimal dark portfolio with expressive microinteractions. The interaction IS the design — no decorative elements, no gradients, no illustrations. Every animation is earned and purposeful. Typography and whitespace carry the visual weight. The cursor, text scramble, and magnetic buttons signal craft without claiming it.

Reference aesthetic: designerdada.com, paco.me, rauno.me — stark layouts where hover states are the personality.

---

## 2. Visual Language

### Color Tokens
```
--bg:       #0a0a0a    near-black background (not pure black — prevents eye strain)
--surface:  #111111    cards, row hovers, overlays
--border:   #1f1f1f    subtle separators
--fg:       #f0f0f0    primary text
--muted:    #555555    secondary text, labels, dates
--accent:   #e8ff47    electric lime — the only color on the page
```

One accent color site-wide. Everything else monochrome. Lime reads as builder/maker — terminal-green energy.

### Typography
```
Display:  Geist (existing) — 72–96px, weight 800, tracking -0.04em
Body:     Geist — 15px, weight 400, line-height 1.7
Mono:     Geist Mono (existing) — 10–12px, uppercase, tracked — labels/tags/dates/numbers
```

Two-font system. Mono for all metadata. Sans for all content. No serif.

### Spacing
- Base unit: 8px
- Section vertical gaps: 120–160px
- Max content width: 640px (text), 960px (work grids)
- Aggressive padding creates editorial breathing room

---

## 3. Page Layouts

### Homepage `/`
```
[FULL VIEWPORT HERO]
  ST                              ← mono label, top-left, accent
  
  Satyam Tiwari.                  ← 80px bold, text scramble on mount
  Designer who builds.            ← staggered word entrance
  
  [MAGNETIC BUTTON] View Work →

─────────────────────────────────
[WORK SECTION]  — numbered list, 2 items

  01  Lazy Icons           12k+   ← count-up on scroll enter
  02  Design System Audit  340→87

  Row hover: background → surface, thumbnail slides in from right, number → accent

─────────────────────────────────
[WRITING SECTION]  — compact list, 2 items

  Apr 2026  Building Figma Plugins...   Tools →
  May 2026  Design Systems That Scale   Design →

  Row hover: lifts 2px, tag fills accent, underline draws in

─────────────────────────────────
[BUILDS SECTION]  — inline pill row

  Lazy Icons ↗  Lazy Layers ↗  Lazy Clean ↗  Design Direction Skill ↗

─────────────────────────────────
[FOOTER]
  © 2026 Satyam Tiwari    LinkedIn · Substack · Figma
```

### Full-Screen Menu
```
[OVERLAY — #0a0a0a 95% opacity, clips down from top, 380ms]

  ✕  (top-right, magnetic)

  01  Work        ← 64px bold, stagger in, 80ms delay each
  02  Writing
  03  Builds
  04  About

  satyamtiwari.27@gmail.com   ← bottom-left, mono small
  LinkedIn · Substack · Figma  ← bottom-right
```
Nav item hover: text scrambles briefly then resolves. Number turns accent.

### Writing List `/writing`
```
  WRITING                       ← mono label
  ─────────────────────────────
  [Filter pills]  All · Design · Tools

  Building Figma Plugins        Apr 2026   Tools
  Design Systems That Scale     May 2026   Design
  ─────────────────────────────

  Row hover: lifts 2px, tag glows accent
```

### Article Detail `/writing/[slug]`
```
[Reading progress bar — 1px accent line, fixed top of viewport]

  ← Back to Writing             ← mono small, magnetic

  TOOLS                         ← mono label, accent
  Building Figma Plugins with TypeScript
  Apr 10, 2026 · 4 min read

  [ARTICLE BODY — max 640px]
    H2: 28px bold, 2px accent left-border
    Code blocks: surface bg, shiki syntax highlighting
    Callouts: accent left-border, inset surface bg
    Links: accent underline draws in on hover
    Inline code: accent color

  ─────────────────────────────
  Written by Satyam Tiwari
  Engineer turned product designer.

  [Subscribe form]
  [Related articles — underline draws in on hover]
```

### Work List `/work`
Same list pattern as Writing. Numbered rows, thumbnail on hover.

### Case Study Detail `/work/[slug]`
```
  [3-stat metrics bar — full width, counts up on enter]
  340 → 87 components   +60% velocity   –3hrs/sprint

  [Long-form MDX — same styles as article detail]
```

### Builds `/builds`
```
  Three category sections. Each build = one row.
  Name  ·  description  ·  install count  ·  ↗

  Row hover: background → surface
```

### About `/about`
```
  Satyam Tiwari                 ← 48px
  Engineer turned product designer.

  [Horizontal timeline — dots at each year, 2017 → 2026]
  Hover a dot: event text fades in above

  [Platform link rows — same hover pattern as work list]
  LinkedIn Newsletter   3k+ subscribers  ↗
  Substack                               ↗
  Figma Community      Plugins + resources ↗
```

---

## 4. Microinteractions Spec

### Custom Cursor
- Native cursor hidden site-wide (`cursor: none` on `html`)
- Default: 10px filled circle, accent color (#e8ff47), spring lag (lerp 0.08)
- Hover (links/buttons/rows): expands to 40px hollow circle, inner dot remains
- Button hover: cursor fills solid, button text inverts to #0a0a0a, button scale(0.95)
- Exits viewport: opacity → 0

### Magnetic Buttons
- Applies to: "View Work →", "← Back", menu ✕, subscribe CTA
- On mouseenter: button translates toward cursor, max 12px offset
- Formula: `offset = (mousePos - buttonCenter) * 0.35`
- Text inside has stronger pull (0.6 factor) — parallax between container and label
- On mouseleave: springs back, 400ms ease-out

### Text Scramble
- Applies to: hero name on mount, menu nav items on hover
- Each character cycles through A–Z + 0–9 at 40ms intervals
- Resolves left→right, one char locks every 60ms
- Hero: ~800ms total. Menu items: ~400ms.
- Characters: A-Z 0-9 only (no symbols)

### Number Count-Up
- Applies to: "12k+", "3k+", "340 → 87", "+60%", "–3hrs"
- Trigger: IntersectionObserver on viewport enter
- Duration: 1200ms, easeOutExpo easing
- Suffixes (k+, %, ★, hrs) appended after resolution
- "340 → 87": both numbers count simultaneously
- Plays once — no re-trigger on scroll back

### Page Transitions (Framer Motion)
- Exit: fade out + slide up 16px, 250ms
- Enter: fade in from 16px offset, 300ms, 50ms delay
- Overlap: enter begins 50ms before exit completes
- Menu open: overlay clips down from top, 380ms cubic-bezier(0.16, 1, 0.3, 1)
- Menu nav items: stagger in from left 20px, 60ms delay each
- Menu close: reverse, 280ms

### Row Hover
- Work rows: bg → surface (150ms), thumbnail slides in from right (scale 0.95→1), number → accent
- Writing rows: translateY -2px (150ms), tag fills accent + text inverts, underline draws in (200ms)
- Both: cursor switches to hollow circle

### Scroll Entrance
- All below-fold sections: opacity 0 + translateY 24px → opacity 1 + translateY 0
- Duration: 500ms easeOut, IntersectionObserver at 15% threshold
- Stagger within section: 80ms per child

### Link Underlines
- CSS background-size trick: background-size 0% → 100%, 250ms ease
- Color: accent, thickness: 1px
- All body links, nav items, related article links

### Reading Progress Bar
- 1px accent line, fixed top-0 left-0, full viewport width
- Width = `scrollY / (documentHeight - viewportHeight) * 100%`
- Article pages only

---

## 5. Component Architecture

### New Components
```
components/
├── cursor/
│   └── Cursor.tsx              global custom cursor, client component
├── menu/
│   └── FullScreenMenu.tsx      overlay nav, Framer Motion
├── motion/
│   ├── MagneticButton.tsx      magnetic pull wrapper, ~30 lines vanilla
│   ├── TextScramble.tsx        scramble hook + component, ~40 lines vanilla
│   ├── CountUp.tsx             intersection-triggered counter, ~25 lines
│   └── FadeIn.tsx              reusable scroll entrance wrapper (Framer Motion)
├── layout/
│   ├── NavBar.tsx              menu trigger only — single icon, top-right
│   └── Footer.tsx              minimal: name + 3 links
├── work/
│   ├── WorkRow.tsx             single work row + thumbnail reveal
│   └── WorkList.tsx            numbered list container
├── writing/
│   ├── ArticleRow.tsx          single article row + tag + date
│   └── ArticleList.tsx         list container + filter pills
├── builds/
│   └── BuildRow.tsx            single build row
└── ReadingProgress.tsx         1px accent bar, article pages only
```

### Pages (rebuilt, same routes)
```
app/
├── page.tsx                    homepage
├── work/page.tsx               work list
├── work/[slug]/page.tsx        case study detail
├── writing/page.tsx            article list
├── writing/[slug]/page.tsx     article detail + progress bar
├── builds/page.tsx             builds list
├── about/page.tsx              bio + timeline + links
└── layout.tsx                  adds Cursor + FullScreenMenu globally
```

### Unchanged
```
lib/mdx.ts          content loader
lib/types.ts        type definitions
lib/resend.ts       email integration
api/subscribe       newsletter API
api/send-newsletter broadcast API
content/            all MDX + JSON content
```

### New Dependency
```
framer-motion       page transitions, menu animation, FadeIn scroll reveals
```

### Global Changes
```
app/globals.css     cursor: none on html, accent → #e8ff47
app/layout.tsx      wrap with <Cursor /> and <FullScreenMenu />
tailwind.config.ts  color tokens updated
```

---

## 6. Real Content Inventory

All content exists and is ready:

| Type | Item | Key Data |
|------|------|----------|
| Work | Lazy Icons | 12k+ installs, 4.8★, ~2hrs/week saved |
| Work | Design System Audit | 340→87 components, +60% velocity, –3hrs/sprint |
| Article | Building Figma Plugins with TypeScript | Apr 2026, Tools tag |
| Article | Design Systems That Actually Scale | May 2026, Design tag |
| Build | Lazy Icons | figma.com/community/... |
| Build | Lazy Layers | figma.com/community/... |
| Build | Lazy Clean | figma.com/community/... |
| Build | Design Direction Skill | npmjs.com/... |
| Image | /images/work/lazy-icons.jpg | exists |
| Image | /images/work/design-system.jpg | exists |
| Image | /images/articles/figma-plugins.jpg | exists |
| Image | /images/articles/design-systems.jpg | exists |

---

## 7. Mobile Behavior

- Custom cursor: disabled on touch devices (`window.matchMedia('(pointer: coarse)')`)
- Magnetic buttons: magnetic effect disabled on touch; tap behavior is standard
- Full-screen menu: same on mobile — hamburger icon opens overlay, large tap targets
- About timeline: stacks vertically on mobile (year above event, no horizontal rule)
- Work/Writing rows: thumbnail reveal disabled on mobile; rows are tap targets only
- Text scramble: fires on mount for hero (mobile sees it); hover scramble on menu items becomes tap-triggered
- Reading progress bar: visible on mobile as-is (1px line, no layout impact)
- Max widths: 640px text / 960px grid collapse to full-width with 24px horizontal padding on mobile

---

## 8. What This Replaces

Every component in `components/` is replaced. All pages in `app/` are rebuilt. The design system tokens in `globals.css` and `tailwind.config.ts` are updated. Nothing in `lib/`, `content/`, or `app/api/` changes.
