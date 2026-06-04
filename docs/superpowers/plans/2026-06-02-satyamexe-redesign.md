# satyam.exe Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild satyam.exe as a dark-first minimal portfolio with expressive microinteractions — custom cursor, text scramble, magnetic buttons, number count-up, and a full-screen navigation overlay.

**Architecture:** Replace all components and pages while keeping the content layer (`lib/`, `content/`, `app/api/`) completely untouched. Motion primitives live in `components/motion/` and `components/cursor/` — isolated, reusable, no framework coupling. Pages are server components that import client motion primitives. Framer Motion handles page transitions via `app/template.tsx`. The cursor and magnetic effects use vanilla JS/RAF — no library needed.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v3, Framer Motion (new), Vitest + @testing-library/react (existing), Geist + Geist Mono local fonts (existing woff files at `app/fonts/`)

---

## File Map

### Files to DELETE (replaced entirely)
```
components/ArticleCard.tsx
components/AuthorBlock.tsx
components/BuildCard.tsx
components/CaseStudyCard.tsx
components/NavBar.tsx
components/ReadingProgressBar.tsx
components/RelatedArticles.tsx
components/SubscribeForm.tsx
components/ThemeToggle.tsx
components/WritingList.tsx
```

### Files to CREATE
```
components/cursor/Cursor.tsx
components/motion/TextScramble.tsx
components/motion/MagneticButton.tsx
components/motion/CountUp.tsx
components/motion/FadeIn.tsx
components/menu/FullScreenMenu.tsx
components/layout/NavBar.tsx        ← menu trigger only
components/layout/Footer.tsx
components/work/WorkRow.tsx
components/work/WorkList.tsx
components/writing/ArticleRow.tsx
components/writing/ArticleList.tsx
components/builds/BuildRow.tsx
components/ReadingProgress.tsx
app/template.tsx
```

### Files to MODIFY
```
app/globals.css               ← dark tokens, cursor:none, prose dark styles
app/layout.tsx                ← swap fonts, remove ThemeProvider, add Cursor+Menu
app/page.tsx                  ← full rewrite
app/writing/page.tsx          ← full rewrite
app/writing/[slug]/page.tsx   ← full rewrite
app/work/page.tsx             ← full rewrite
app/work/[slug]/page.tsx      ← full rewrite
app/builds/page.tsx           ← full rewrite
app/about/page.tsx            ← full rewrite
tailwind.config.ts            ← remove darkMode:class, update color tokens
components/mdx/Callout.tsx    ← update colors for dark
components/mdx/MDXComponents.tsx ← export name fix
```

### Files UNTOUCHED
```
lib/mdx.ts, lib/types.ts, lib/resend.ts, lib/utils.ts
content/ (all MDX + builds.json)
app/api/ (subscribe + send-newsletter)
app/writing/[slug]/opengraph-image.tsx
app/not-found.tsx
components/MDXContent.tsx
```

---

## Task 1: Design System Tokens

**Files:**
- Modify: `satyamexe/tailwind.config.ts`
- Modify: `satyamexe/app/globals.css`

- [ ] **Step 1: Update tailwind.config.ts**

Replace the entire file content:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Update globals.css**

Replace the entire file content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0a0a0a;
  --surface: #111111;
  --border: #1f1f1f;
  --fg: #f0f0f0;
  --muted: #555555;
  --accent: #e8ff47;
}

html {
  cursor: none;
  scroll-behavior: smooth;
}

* {
  box-sizing: border-box;
}

body {
  background-color: var(--bg);
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
}

/* Reusable animated underline — add class to any <a> */
.animated-underline {
  background-image: linear-gradient(var(--accent), var(--accent));
  background-repeat: no-repeat;
  background-position: 0% 100%;
  background-size: 0% 1px;
  transition: background-size 250ms ease;
}
.animated-underline:hover {
  background-size: 100% 1px;
}

/* MDX prose — dark theme */
.prose h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2.5rem;
  margin-bottom: 0.75rem;
  color: var(--fg);
  border-left: 2px solid var(--accent);
  padding-left: 0.75rem;
}

.prose h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1.75rem;
  margin-bottom: 0.5rem;
  color: var(--fg);
}

.prose p {
  line-height: 1.75;
  margin-bottom: 1.25rem;
  color: var(--fg);
}

.prose a {
  color: var(--accent);
  text-decoration: none;
  background-image: linear-gradient(var(--accent), var(--accent));
  background-repeat: no-repeat;
  background-position: 0% 100%;
  background-size: 0% 1px;
  transition: background-size 250ms ease;
}
.prose a:hover {
  background-size: 100% 1px;
}

.prose blockquote {
  border-left: 2px solid var(--accent);
  padding-left: 1rem;
  color: var(--muted);
  margin: 1.5rem 0;
}

.prose ul,
.prose ol {
  padding-left: 1.5rem;
  margin-bottom: 1.25rem;
}

.prose li {
  line-height: 1.75;
  margin-bottom: 0.25rem;
  color: var(--fg);
}

.prose code:not(pre code) {
  font-family: var(--font-mono), monospace;
  font-size: 0.875em;
  color: var(--accent);
}

.prose pre {
  margin: 1.5rem 0;
  border-radius: 4px;
  overflow-x: auto;
  border: 1px solid var(--border);
  background: var(--surface) !important;
}

.prose strong {
  color: var(--fg);
  font-weight: 600;
}
```

- [ ] **Step 3: Verify TypeScript sees the new tokens**

```bash
cd satyamexe && npx tsc --noEmit
```
Expected: no errors about color tokens. Ignore unrelated errors in pages (those get fixed in later tasks).

- [ ] **Step 4: Commit**

```bash
cd satyamexe && git add tailwind.config.ts app/globals.css && git commit -m "feat: switch to dark design system — lime accent, cursor:none, updated prose"
```

---

## Task 2: Install Framer Motion + Update Layout

**Files:**
- Modify: `satyamexe/package.json` (via npm)
- Modify: `satyamexe/app/layout.tsx`

- [ ] **Step 1: Install framer-motion**

```bash
cd satyamexe && npm install framer-motion
```
Expected: framer-motion added to dependencies in package.json.

- [ ] **Step 2: Rewrite app/layout.tsx**

Replace the entire file:

```typescript
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Cursor } from '@/components/cursor/Cursor'
import { FullScreenMenu } from '@/components/menu/FullScreenMenu'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Satyam Tiwari — Designer who builds.',
    template: '%s | Satyam Tiwari',
  },
  description:
    'Designer who builds the tools, writes the ideas, and ships before others have a roadmap.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://satyamexe.com'
  ),
  openGraph: { siteName: 'Satyam Tiwari', type: 'website' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-bg text-fg">
        <Cursor />
        <FullScreenMenu />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

Note: `Cursor` and `FullScreenMenu` don't exist yet — TypeScript will complain until Tasks 3 and 8. That's fine; create the file and proceed.

- [ ] **Step 3: Commit**

```bash
cd satyamexe && git add package.json package-lock.json app/layout.tsx && git commit -m "feat: install framer-motion, rewire layout with Cursor and FullScreenMenu"
```

---

## Task 3: Cursor Component

**Files:**
- Create: `satyamexe/components/cursor/Cursor.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let mouseX = 0
    let mouseY = 0
    let currentX = 0
    let currentY = 0
    let rafId: number

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t
    }

    function tick() {
      currentX = lerp(currentX, mouseX, 0.15)
      currentY = lerp(currentY, mouseY, 0.15)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${currentX - 5}px, ${currentY - 5}px)`
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${currentX - 20}px, ${currentY - 20}px)`
      }
      rafId = requestAnimationFrame(tick)
    }

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      setVisible(true)
    }

    function onMouseLeave() {
      setVisible(false)
    }

    function onMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement
      setHovering(!!target.closest('a, button, [data-cursor-hover]'))
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseover', onMouseOver)
    rafId = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseover', onMouseOver)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9999] h-[10px] w-[10px] rounded-full bg-accent"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms' }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9998] h-[40px] w-[40px] rounded-full border border-accent"
        style={{
          opacity: visible && hovering ? 1 : 0,
          transform: hovering ? 'scale(1)' : 'scale(0.5)',
          transition: 'opacity 200ms, transform 200ms',
        }}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd satyamexe && npx tsc --noEmit 2>&1 | grep "cursor/Cursor"
```
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
cd satyamexe && git add components/cursor/Cursor.tsx && git commit -m "feat: add custom cursor with spring-lag dot and hover ring"
```

---

## Task 4: TextScramble Component

**Files:**
- Create: `satyamexe/components/motion/TextScramble.tsx`
- Create: `satyamexe/components/motion/__tests__/TextScramble.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// components/motion/__tests__/TextScramble.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextScramble } from '../TextScramble'

describe('TextScramble', () => {
  it('renders the original text', () => {
    render(<TextScramble text="Hello" />)
    // initially shows the text (may be scrambled but the element exists)
    expect(screen.getByText(/[A-Z0-9]{5}|Hello/i)).toBeTruthy()
  })

  it('renders as the specified tag', () => {
    const { container } = render(<TextScramble text="Test" as="h1" />)
    expect(container.querySelector('h1')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd satyamexe && npx vitest run components/motion/__tests__/TextScramble.test.tsx 2>&1 | tail -5
```
Expected: FAIL — `TextScramble` not found.

- [ ] **Step 3: Create the component**

```typescript
// components/motion/TextScramble.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function useScramble(text: string) {
  const [display, setDisplay] = useState(text)

  const scramble = useCallback(() => {
    let iteration = 0
    const maxIterations = text.length * 1.5

    const id = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' '
            if (i < Math.floor(iteration)) return text[i]
            return CHARS[Math.floor(Math.random() * CHARS.length)]
          })
          .join('')
      )
      iteration += 1
      if (iteration > maxIterations) {
        clearInterval(id)
        setDisplay(text)
      }
    }, 40)

    return () => clearInterval(id)
  }, [text])

  return { display, scramble }
}

interface TextScrambleProps {
  text: string
  className?: string
  triggerOnMount?: boolean
  triggerOnHover?: boolean
  as?: React.ElementType
}

export function TextScramble({
  text,
  className,
  triggerOnMount = false,
  triggerOnHover = false,
  as: Tag = 'span',
}: TextScrambleProps) {
  const { display, scramble } = useScramble(text)

  useEffect(() => {
    if (triggerOnMount) {
      const cleanup = scramble()
      return cleanup
    }
  }, [triggerOnMount, scramble])

  return (
    <Tag
      className={className}
      onMouseEnter={triggerOnHover ? scramble : undefined}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {display}
    </Tag>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd satyamexe && npx vitest run components/motion/__tests__/TextScramble.test.tsx 2>&1 | tail -5
```
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd satyamexe && git add components/motion/TextScramble.tsx components/motion/__tests__/TextScramble.test.tsx && git commit -m "feat: add TextScramble component with mount and hover trigger modes"
```

---

## Task 5: MagneticButton Component

**Files:**
- Create: `satyamexe/components/motion/MagneticButton.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/motion/MagneticButton.tsx
'use client'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function MagneticButton({ children, className, onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [outer, setOuter] = useState({ x: 0, y: 0 })
  const [inner, setInner] = useState({ x: 0, y: 0 })

  function onMouseMove(e: React.MouseEvent) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    setOuter({ x: dx * 0.35, y: dy * 0.35 })
    setInner({ x: dx * 0.6, y: dy * 0.6 })
  }

  function onMouseLeave() {
    setOuter({ x: 0, y: 0 })
    setInner({ x: 0, y: 0 })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      data-cursor-hover
      className={cn('inline-block', className)}
      style={{
        transform: `translate(${outer.x}px, ${outer.y}px)`,
        transition: 'transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      <span
        style={{
          display: 'block',
          transform: `translate(${inner.x}px, ${inner.y}px)`,
          transition: 'transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {children}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd satyamexe && npx tsc --noEmit 2>&1 | grep "MagneticButton"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd satyamexe && git add components/motion/MagneticButton.tsx && git commit -m "feat: add MagneticButton with outer/inner parallax pull"
```

---

## Task 6: CountUp Component

**Files:**
- Create: `satyamexe/components/motion/CountUp.tsx`
- Create: `satyamexe/components/motion/__tests__/CountUp.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// components/motion/__tests__/CountUp.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountUp } from '../CountUp'

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
    observe: mockObserve,
    disconnect: mockDisconnect,
  })))
})

describe('CountUp', () => {
  it('renders initial value of 0', () => {
    render(<CountUp end={100} />)
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('renders with suffix', () => {
    render(<CountUp end={12} suffix="k+" />)
    expect(screen.getByText('0k+')).toBeTruthy()
  })

  it('renders with prefix', () => {
    render(<CountUp end={60} prefix="+" suffix="%" />)
    expect(screen.getByText('+0%')).toBeTruthy()
  })

  it('attaches IntersectionObserver on mount', () => {
    render(<CountUp end={50} />)
    expect(mockObserve).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd satyamexe && npx vitest run components/motion/__tests__/CountUp.test.tsx 2>&1 | tail -5
```
Expected: FAIL — `CountUp` not found.

- [ ] **Step 3: Create the component**

```typescript
// components/motion/CountUp.tsx
'use client'
import { useEffect, useRef, useState } from 'react'

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

interface CountUpProps {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export function CountUp({
  end,
  suffix = '',
  prefix = '',
  duration = 1200,
  className,
}: CountUpProps) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const played = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !played.current) {
          played.current = true
          const start = performance.now()

          function frame(now: number) {
            const progress = Math.min((now - start) / duration, 1)
            setValue(Math.floor(easeOutExpo(progress) * end))
            if (progress < 1) requestAnimationFrame(frame)
            else setValue(end)
          }

          requestAnimationFrame(frame)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [end, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{value}{suffix}
    </span>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd satyamexe && npx vitest run components/motion/__tests__/CountUp.test.tsx 2>&1 | tail -5
```
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
cd satyamexe && git add components/motion/CountUp.tsx components/motion/__tests__/CountUp.test.tsx && git commit -m "feat: add CountUp with IntersectionObserver trigger and easeOutExpo"
```

---

## Task 7: FadeIn Component

**Files:**
- Create: `satyamexe/components/motion/FadeIn.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/motion/FadeIn.tsx
'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  className?: string
  y?: number
}

export function FadeIn({ children, delay = 0, className, y = 24 }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd satyamexe && npx tsc --noEmit 2>&1 | grep "FadeIn"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd satyamexe && git add components/motion/FadeIn.tsx && git commit -m "feat: add FadeIn scroll-reveal wrapper using Framer Motion"
```

---

## Task 8: FullScreenMenu + NavBar

**Files:**
- Create: `satyamexe/components/menu/FullScreenMenu.tsx`
- Create: `satyamexe/components/layout/NavBar.tsx`

- [ ] **Step 1: Create FullScreenMenu**

```typescript
// components/menu/FullScreenMenu.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { TextScramble } from '@/components/motion/TextScramble'
import { MagneticButton } from '@/components/motion/MagneticButton'

const NAV_ITEMS = [
  { num: '01', label: 'Work', href: '/work' },
  { num: '02', label: 'Writing', href: '/writing' },
  { num: '03', label: 'Builds', href: '/builds' },
  { num: '04', label: 'About', href: '/about' },
]

const SOCIAL_LINKS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/newsletters/ui-ux-or-product-design-6891084225672794112/' },
  { label: 'Substack', href: 'https://satyamtiwari2701.substack.com/' },
  { label: 'Figma', href: 'https://figma.com/@satyam_tiwari' },
]

export function FullScreenMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-cursor-hover
        className="fixed right-6 top-6 z-50 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-accent"
        aria-label="Open navigation"
      >
        Menu
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-between bg-bg/95 p-8 backdrop-blur-sm"
          >
            <div className="flex justify-end">
              <MagneticButton
                onClick={() => setOpen(false)}
                className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-accent"
              >
                ✕ Close
              </MagneticButton>
            </div>

            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ num, label, href }, i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 + 0.1, duration: 0.3, ease: 'easeOut' }}
                >
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline gap-5"
                    data-cursor-hover
                  >
                    <span className="w-6 shrink-0 font-mono text-xs text-accent">{num}</span>
                    <TextScramble
                      text={label}
                      triggerOnHover
                      className="text-5xl font-bold text-fg/70 transition-colors group-hover:text-fg sm:text-7xl"
                    />
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <span className="font-mono text-xs text-muted">satyamtiwari.27@gmail.com</span>
              <div className="flex gap-4">
                {SOCIAL_LINKS.map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor-hover
                    className="animated-underline font-mono text-xs text-muted transition-colors hover:text-accent"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 2: Create NavBar (menu trigger placeholder — FullScreenMenu handles the actual trigger)**

The `FullScreenMenu` already renders its own trigger button (fixed top-right). `NavBar` is not needed as a separate component in this design — the menu button is baked into `FullScreenMenu`. Skip creating a separate `NavBar.tsx`.

- [ ] **Step 3: Verify TypeScript**

```bash
cd satyamexe && npx tsc --noEmit 2>&1 | grep "FullScreenMenu"
```
Expected: no errors from this file.

- [ ] **Step 4: Commit**

```bash
cd satyamexe && git add components/menu/FullScreenMenu.tsx && git commit -m "feat: add FullScreenMenu overlay with clip-path reveal and scramble nav items"
```

---

## Task 9: Footer

**Files:**
- Create: `satyamexe/components/layout/Footer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/layout/Footer.tsx
const LINKS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/newsletters/ui-ux-or-product-design-6891084225672794112/' },
  { label: 'Substack', href: 'https://satyamtiwari2701.substack.com/' },
  { label: 'Figma', href: 'https://figma.com/@satyam_tiwari' },
]

export function Footer() {
  return (
    <footer className="mx-auto mt-32 max-w-[960px] border-t border-border px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-xs text-muted">© 2026 Satyam Tiwari</span>
        <div className="flex gap-6">
          {LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor-hover
              className="animated-underline font-mono text-xs text-muted transition-colors hover:text-accent"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add components/layout/Footer.tsx && git commit -m "feat: add minimal Footer with social links"
```

---

## Task 10: ReadingProgress Bar

**Files:**
- Create: `satyamexe/components/ReadingProgress.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/ReadingProgress.tsx
'use client'
import { useEffect, useState } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function update() {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div
      aria-hidden
      className="fixed left-0 top-0 z-[9997] h-[1px] bg-accent transition-none"
      style={{ width: `${progress}%` }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add components/ReadingProgress.tsx && git commit -m "feat: add ReadingProgress bar — 1px accent line tracking scroll"
```

---

## Task 11: Work Components

**Files:**
- Create: `satyamexe/components/work/WorkRow.tsx`
- Create: `satyamexe/components/work/WorkList.tsx`

- [ ] **Step 1: Create WorkRow**

```typescript
// components/work/WorkRow.tsx
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { CountUp } from '@/components/motion/CountUp'
import type { Work } from '@/lib/types'

interface WorkRowProps {
  work: Work
  index: number
}

function parseMetric(value: string): { num: number; suffix: string; prefix: string } {
  const match = value.match(/^([+\-]?)(\d+)(.*)$/)
  if (!match) return { num: 0, suffix: value, prefix: '' }
  return { prefix: match[1], num: parseInt(match[2], 10), suffix: match[3] }
}

export function WorkRow({ work, index }: WorkRowProps) {
  const [hovered, setHovered] = useState(false)
  const mainMetric = work.metrics?.[0]
  const parsed = mainMetric ? parseMetric(mainMetric.value) : null

  return (
    <Link
      href={`/work/${work.slug}`}
      className="-mx-4 group relative flex items-center justify-between overflow-hidden border-b border-border px-4 py-6 transition-colors hover:bg-surface"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-cursor-hover
    >
      <div className="z-10 flex items-baseline gap-5">
        <span className="w-6 shrink-0 font-mono text-xs text-muted transition-colors group-hover:text-accent">
          0{index + 1}
        </span>
        <div>
          <p className="text-base font-semibold text-fg">{work.title}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {work.company} · {work.year}
          </p>
        </div>
      </div>

      <div className="z-10 flex items-center gap-6">
        {parsed && (
          <span className="font-mono text-sm text-accent">
            <CountUp
              end={parsed.num}
              prefix={parsed.prefix}
              suffix={parsed.suffix}
            />
          </span>
        )}
        <span className="font-mono text-xs text-muted transition-colors group-hover:text-accent">
          →
        </span>
      </div>

      {work.coverImage && (
        <div
          className="pointer-events-none absolute right-20 top-1/2 h-[110px] w-[180px] overflow-hidden rounded-sm"
          style={{
            opacity: hovered ? 1 : 0,
            transform: `translateY(-50%) translateX(${hovered ? '0px' : '20px'}) scale(${hovered ? 1 : 0.95})`,
            transition: 'opacity 250ms ease, transform 250ms ease',
          }}
        >
          <Image
            src={work.coverImage}
            alt={work.title}
            fill
            className="object-cover"
            sizes="180px"
          />
        </div>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Create WorkList**

```typescript
// components/work/WorkList.tsx
import { FadeIn } from '@/components/motion/FadeIn'
import { WorkRow } from './WorkRow'
import type { Work } from '@/lib/types'

export function WorkList({ items }: { items: Work[] }) {
  return (
    <div>
      {items.map((work, i) => (
        <FadeIn key={work.slug} delay={i * 0.08}>
          <WorkRow work={work} index={i} />
        </FadeIn>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd satyamexe && git add components/work/WorkRow.tsx components/work/WorkList.tsx && git commit -m "feat: add WorkRow with thumbnail reveal and WorkList with staggered fade"
```

---

## Task 12: Writing Components

**Files:**
- Create: `satyamexe/components/writing/ArticleRow.tsx`
- Create: `satyamexe/components/writing/ArticleList.tsx`
- Create: `satyamexe/components/writing/__tests__/ArticleList.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// components/writing/__tests__/ArticleList.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArticleList } from '../ArticleList'
import type { Article } from '@/lib/types'

const ARTICLES: Article[] = [
  {
    slug: 'a1', title: 'Design Systems', date: '2026-05-20', tag: 'Design',
    coverImage: '', excerpt: '', published: true, readTime: '5 min', content: '',
  },
  {
    slug: 'a2', title: 'Figma Plugins', date: '2026-04-10', tag: 'Tools',
    coverImage: '', excerpt: '', published: true, readTime: '4 min', content: '',
  },
]

describe('ArticleList', () => {
  it('shows all articles by default', () => {
    render(<ArticleList articles={ARTICLES} />)
    expect(screen.getByText('Design Systems')).toBeTruthy()
    expect(screen.getByText('Figma Plugins')).toBeTruthy()
  })

  it('filters to Design tag', () => {
    render(<ArticleList articles={ARTICLES} />)
    fireEvent.click(screen.getByText('Design'))
    expect(screen.getByText('Design Systems')).toBeTruthy()
    expect(screen.queryByText('Figma Plugins')).toBeNull()
  })

  it('filters to Tools tag', () => {
    render(<ArticleList articles={ARTICLES} />)
    fireEvent.click(screen.getByText('Tools'))
    expect(screen.getByText('Figma Plugins')).toBeTruthy()
    expect(screen.queryByText('Design Systems')).toBeNull()
  })

  it('resets to All', () => {
    render(<ArticleList articles={ARTICLES} />)
    fireEvent.click(screen.getByText('Tools'))
    fireEvent.click(screen.getByText('All'))
    expect(screen.getByText('Design Systems')).toBeTruthy()
    expect(screen.getByText('Figma Plugins')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd satyamexe && npx vitest run components/writing/__tests__/ArticleList.test.tsx 2>&1 | tail -5
```
Expected: FAIL — `ArticleList` not found.

- [ ] **Step 3: Create ArticleRow**

```typescript
// components/writing/ArticleRow.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import type { Article } from '@/lib/types'

export function ArticleRow({ article }: { article: Article }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={`/writing/${article.slug}`}
      className="flex items-center justify-between border-b border-border py-5"
      style={{ transform: hovered ? 'translateY(-2px)' : 'translateY(0)', transition: 'transform 150ms ease' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-cursor-hover
    >
      <div className="flex items-baseline gap-4 min-w-0">
        <span className="shrink-0 font-mono text-xs text-muted">
          {new Date(article.date).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <span className="animated-underline truncate text-sm text-fg">
          {article.title}
        </span>
      </div>
      <span
        className="ml-4 shrink-0 font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 transition-all duration-150"
        style={{
          backgroundColor: hovered ? 'var(--accent)' : 'transparent',
          borderColor: hovered ? 'var(--accent)' : 'var(--border)',
          color: hovered ? '#0a0a0a' : 'var(--muted)',
        }}
      >
        {article.tag}
      </span>
    </Link>
  )
}
```

- [ ] **Step 4: Create ArticleList**

```typescript
// components/writing/ArticleList.tsx
'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/motion/FadeIn'
import { ArticleRow } from './ArticleRow'
import type { Article } from '@/lib/types'

const TAGS = ['All', 'Design', 'Tools']

export function ArticleList({ articles }: { articles: Article[] }) {
  const [active, setActive] = useState('All')

  const filtered =
    active === 'All' ? articles : articles.filter((a) => a.tag === active)

  return (
    <div>
      <div className="mb-8 flex gap-3">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActive(tag)}
            data-cursor-hover
            className={cn(
              'border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all duration-150',
              active === tag
                ? 'border-accent bg-accent text-bg'
                : 'border-border text-muted hover:border-accent hover:text-accent'
            )}
          >
            {tag}
          </button>
        ))}
      </div>
      <div>
        {filtered.map((article, i) => (
          <FadeIn key={article.slug} delay={i * 0.06}>
            <ArticleRow article={article} />
          </FadeIn>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
cd satyamexe && npx vitest run components/writing/__tests__/ArticleList.test.tsx 2>&1 | tail -5
```
Expected: PASS — 4 tests pass.

- [ ] **Step 6: Commit**

```bash
cd satyamexe && git add components/writing/ArticleRow.tsx components/writing/ArticleList.tsx components/writing/__tests__/ArticleList.test.tsx && git commit -m "feat: add ArticleRow with tag highlight and ArticleList with filter pills"
```

---

## Task 13: BuildRow Component

**Files:**
- Create: `satyamexe/components/builds/BuildRow.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/builds/BuildRow.tsx
import type { Build } from '@/lib/types'

export function BuildRow({ build }: { build: Build }) {
  return (
    <a
      href={build.url}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor-hover
      className="-mx-4 group flex items-center justify-between border-b border-border px-4 py-5 transition-colors hover:bg-surface"
    >
      <div className="flex min-w-0 items-baseline gap-4">
        <span className="text-sm font-medium text-fg transition-colors group-hover:text-accent">
          {build.name}
        </span>
        <span className="hidden truncate text-xs text-muted sm:inline">
          {build.description}
        </span>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-4">
        {build.installCount && (
          <span className="font-mono text-xs text-accent">{build.installCount}</span>
        )}
        <span className="font-mono text-xs text-muted transition-colors group-hover:text-accent">
          ↗
        </span>
      </div>
    </a>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add components/builds/BuildRow.tsx && git commit -m "feat: add BuildRow for builds catalog"
```

---

## Task 14: Update MDX Components

**Files:**
- Modify: `satyamexe/components/mdx/Callout.tsx`
- Modify: `satyamexe/components/mdx/MDXComponents.tsx`

- [ ] **Step 1: Update Callout.tsx for dark theme**

Replace the entire file:

```typescript
// components/mdx/Callout.tsx
import { cn } from '@/lib/utils'

interface CalloutProps {
  children: React.ReactNode
  type?: 'note' | 'warning' | 'tip'
}

export function Callout({ children, type = 'note' }: CalloutProps) {
  return (
    <div
      className={cn(
        'my-6 border-l-2 px-4 py-3 text-sm text-muted',
        type === 'note' && 'border-accent bg-surface',
        type === 'warning' && 'border-yellow-500 bg-surface',
        type === 'tip' && 'border-green-500 bg-surface'
      )}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Update MDXComponents.tsx**

Replace the entire file — the existing file uses a named `mdxComponents` export used by `MDXContent.tsx`:

```typescript
// components/mdx/MDXComponents.tsx
import type { MDXComponents as MDXComponentsType } from 'mdx/types'
import { Callout } from './Callout'

export const mdxComponents: MDXComponentsType = {
  Callout,
}
```

- [ ] **Step 3: Commit**

```bash
cd satyamexe && git add components/mdx/Callout.tsx components/mdx/MDXComponents.tsx && git commit -m "feat: update MDX components for dark theme"
```

---

## Task 15: Page Transitions

**Files:**
- Create: `satyamexe/app/template.tsx`

- [ ] **Step 1: Create template.tsx**

In Next.js App Router, `template.tsx` re-mounts on every navigation (unlike `layout.tsx` which persists). This is the correct hook point for Framer Motion page transitions.

```typescript
// app/template.tsx
'use client'
import { motion } from 'framer-motion'

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add app/template.tsx && git commit -m "feat: add page transition via app/template.tsx with Framer Motion"
```

---

## Task 16: Homepage

**Files:**
- Modify: `satyamexe/app/page.tsx`

- [ ] **Step 1: Rewrite app/page.tsx**

Replace the entire file:

```typescript
// app/page.tsx
import Link from 'next/link'
import { getAllArticles, getAllWork } from '@/lib/mdx'
import buildsData from '@/content/builds.json'
import type { Build } from '@/lib/types'
import { TextScramble } from '@/components/motion/TextScramble'
import { MagneticButton } from '@/components/motion/MagneticButton'
import { FadeIn } from '@/components/motion/FadeIn'
import { WorkList } from '@/components/work/WorkList'
import { ArticleRow } from '@/components/writing/ArticleRow'

export default function HomePage() {
  const articles = getAllArticles().slice(0, 3)
  const work = getAllWork()
    .filter((w) => w.pinned)
    .slice(0, 2)

  return (
    <div className="mx-auto max-w-[960px] px-6 py-24">
      {/* Hero */}
      <section className="mb-32 flex min-h-[65vh] flex-col justify-center">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-accent">ST</p>
        <h1 className="mb-8 text-[clamp(3rem,8vw,6rem)] font-bold leading-[1.0] tracking-tight">
          <TextScramble
            text="Satyam Tiwari."
            triggerOnMount
            as="span"
            className="block text-fg"
          />
          <span className="block text-muted">Designer who builds.</span>
        </h1>
        <MagneticButton className="mt-2 self-start">
          <Link
            href="/work"
            data-cursor-hover
            className="inline-block bg-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-bg hover:opacity-90 transition-opacity"
          >
            View Work →
          </Link>
        </MagneticButton>
      </section>

      {/* Work */}
      <FadeIn>
        <section className="mb-28">
          <div className="mb-8 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              Selected Work
            </p>
            <Link
              href="/work"
              data-cursor-hover
              className="animated-underline font-mono text-xs text-muted transition-colors hover:text-accent"
            >
              All Work →
            </Link>
          </div>
          <WorkList items={work} />
        </section>
      </FadeIn>

      {/* Writing */}
      <FadeIn delay={0.08}>
        <section className="mb-28">
          <div className="mb-8 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              Writing
            </p>
            <Link
              href="/writing"
              data-cursor-hover
              className="animated-underline font-mono text-xs text-muted transition-colors hover:text-accent"
            >
              All Articles →
            </Link>
          </div>
          <div>
            {articles.map((article) => (
              <ArticleRow key={article.slug} article={article} />
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Builds */}
      <FadeIn delay={0.14}>
        <section>
          <div className="mb-8 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              Builds
            </p>
            <Link
              href="/builds"
              data-cursor-hover
              className="animated-underline font-mono text-xs text-muted transition-colors hover:text-accent"
            >
              All Builds →
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {(buildsData as Build[]).map(
              (build) =>
                build.url && (
                  <a
                    key={build.id}
                    href={build.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor-hover
                    className="border border-border px-3 py-1.5 font-mono text-xs text-muted transition-all duration-150 hover:border-accent hover:text-accent"
                  >
                    {build.name} ↗
                  </a>
                )
            )}
          </div>
        </section>
      </FadeIn>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd satyamexe && npx tsc --noEmit 2>&1 | grep "app/page"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd satyamexe && git add app/page.tsx && git commit -m "feat: rewrite homepage — dark hero with scramble, work/writing/builds lists"
```

---

## Task 17: Writing List Page

**Files:**
- Modify: `satyamexe/app/writing/page.tsx`

- [ ] **Step 1: Rewrite app/writing/page.tsx**

```typescript
// app/writing/page.tsx
import type { Metadata } from 'next'
import { getAllArticles } from '@/lib/mdx'
import { ArticleList } from '@/components/writing/ArticleList'

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Articles on design, engineering, and building tools.',
}

export default function WritingPage() {
  const articles = getAllArticles()

  return (
    <div className="mx-auto max-w-[960px] px-6 py-24">
      <p className="mb-12 font-mono text-xs uppercase tracking-widest text-muted">
        Writing
      </p>
      <ArticleList articles={articles} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add app/writing/page.tsx && git commit -m "feat: rewrite Writing list page with filter pills"
```

---

## Task 18: Article Detail Page

**Files:**
- Modify: `satyamexe/app/writing/[slug]/page.tsx`

The MDX rendering approach is unchanged — `MDXContent` uses `@mdx-js/mdx` evaluate. We rebuild the layout around it.

- [ ] **Step 1: Rewrite app/writing/[slug]/page.tsx**

```typescript
// app/writing/[slug]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getAllArticles, getArticleBySlug } from '@/lib/mdx'
import { MDXContent } from '@/components/MDXContent'
import { ReadingProgress } from '@/components/ReadingProgress'
import { MagneticButton } from '@/components/motion/MagneticButton'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.date,
    },
    alternates: { canonical: `/writing/${article.slug}` },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const related = getAllArticles()
    .filter((a) => a.tag === article.tag && a.slug !== article.slug)
    .slice(0, 2)

  return (
    <>
      <ReadingProgress />
      <div className="mx-auto max-w-[640px] px-6 py-24">
        {/* Back */}
        <MagneticButton className="mb-12 inline-block">
          <Link
            href="/writing"
            data-cursor-hover
            className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-accent"
          >
            ← Writing
          </Link>
        </MagneticButton>

        {/* Header */}
        <header className="mb-12">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
            {article.tag}
          </p>
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">
            {article.title}
          </h1>
          <p className="font-mono text-xs text-muted">
            {new Date(article.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            · {article.readTime}
          </p>
        </header>

        {/* Cover image */}
        {article.coverImage && (
          <div className="relative mb-12 aspect-[16/9] overflow-hidden">
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Body */}
        <div className="prose max-w-none">
          <MDXContent source={article.content} />
        </div>

        {/* Author */}
        <div className="mt-16 border-t border-border pt-10">
          <p className="text-sm font-semibold text-fg">Satyam Tiwari</p>
          <p className="mt-1 text-xs text-muted">
            Engineer turned product designer. Builds Figma plugins, ships Claude skills, writes about the design-engineering intersection.
          </p>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-12">
            <p className="mb-6 font-mono text-xs uppercase tracking-widest text-muted">
              Related
            </p>
            <div className="flex flex-col gap-3">
              {related.map((a) => (
                <Link
                  key={a.slug}
                  href={`/writing/${a.slug}`}
                  data-cursor-hover
                  className="animated-underline text-sm text-fg transition-colors hover:text-accent"
                >
                  {a.title} →
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add app/writing/\[slug\]/page.tsx && git commit -m "feat: rewrite article detail page with reading progress and dark prose"
```

---

## Task 19: Work List Page

**Files:**
- Modify: `satyamexe/app/work/page.tsx`

- [ ] **Step 1: Rewrite app/work/page.tsx**

```typescript
// app/work/page.tsx
import type { Metadata } from 'next'
import { getAllWork } from '@/lib/mdx'
import { WorkList } from '@/components/work/WorkList'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Selected case studies and projects.',
}

export default function WorkPage() {
  const work = getAllWork()

  return (
    <div className="mx-auto max-w-[960px] px-6 py-24">
      <p className="mb-12 font-mono text-xs uppercase tracking-widest text-muted">
        Work
      </p>
      <WorkList items={work} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add app/work/page.tsx && git commit -m "feat: rewrite Work list page"
```

---

## Task 20: Case Study Detail Page

**Files:**
- Modify: `satyamexe/app/work/[slug]/page.tsx`

- [ ] **Step 1: Rewrite app/work/[slug]/page.tsx**

```typescript
// app/work/[slug]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getAllWork, getWorkBySlug } from '@/lib/mdx'
import { MDXContent } from '@/components/MDXContent'
import { CountUp } from '@/components/motion/CountUp'
import { MagneticButton } from '@/components/motion/MagneticButton'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllWork().map((w) => ({ slug: w.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const work = getWorkBySlug(slug)
  if (!work) return {}
  return {
    title: work.title,
    description: work.excerpt,
    alternates: { canonical: `/work/${work.slug}` },
  }
}

function parseMetric(value: string): { num: number; suffix: string; prefix: string } {
  const match = value.match(/^([+\-]?)(\d+)(.*)$/)
  if (!match) return { num: 0, suffix: value, prefix: '' }
  return { prefix: match[1], num: parseInt(match[2], 10), suffix: match[3] }
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params
  const work = getWorkBySlug(slug)
  if (!work) notFound()

  return (
    <div className="mx-auto max-w-[960px] px-6 py-24">
      {/* Back */}
      <MagneticButton className="mb-12 inline-block">
        <Link
          href="/work"
          data-cursor-hover
          className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-accent"
        >
          ← Work
        </Link>
      </MagneticButton>

      {/* Header */}
      <header className="mb-12">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
          {work.company} · {work.year}
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-fg sm:text-5xl">
          {work.title}
        </h1>
      </header>

      {/* Cover */}
      {work.coverImage && (
        <div className="relative mb-12 aspect-[16/9] overflow-hidden">
          <Image
            src={work.coverImage}
            alt={work.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Metrics bar */}
      {work.metrics && work.metrics.length > 0 && (
        <div className="mb-16 grid grid-cols-2 gap-px border border-border sm:grid-cols-3">
          {work.metrics.map(({ label, value }) => {
            const parsed = parseMetric(value)
            return (
              <div key={label} className="bg-surface p-6">
                <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">
                  {label}
                </p>
                <p className="text-2xl font-bold text-accent">
                  <CountUp
                    end={parsed.num}
                    prefix={parsed.prefix}
                    suffix={parsed.suffix}
                  />
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Body */}
      <div className="prose max-w-[640px]">
        <MDXContent source={work.content} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add app/work/\[slug\]/page.tsx && git commit -m "feat: rewrite case study detail page with metrics CountUp bar"
```

---

## Task 21: Builds Page

**Files:**
- Modify: `satyamexe/app/builds/page.tsx`

- [ ] **Step 1: Rewrite app/builds/page.tsx**

```typescript
// app/builds/page.tsx
import type { Metadata } from 'next'
import buildsData from '@/content/builds.json'
import type { Build } from '@/lib/types'
import { BuildRow } from '@/components/builds/BuildRow'
import { FadeIn } from '@/components/motion/FadeIn'

export const metadata: Metadata = {
  title: 'Builds',
  description: 'Figma plugins, Claude skills, and other tools built by Satyam Tiwari.',
}

const CATEGORIES: { key: Build['category']; label: string }[] = [
  { key: 'figma-plugin', label: 'Figma Plugins' },
  { key: 'claude-skill', label: 'Claude Skills' },
  { key: 'figma-community', label: 'Community' },
]

export default function BuildsPage() {
  const builds = buildsData as Build[]

  return (
    <div className="mx-auto max-w-[960px] px-6 py-24">
      <p className="mb-16 font-mono text-xs uppercase tracking-widest text-muted">
        Builds
      </p>

      <div className="flex flex-col gap-16">
        {CATEGORIES.map(({ key, label }) => {
          const items = builds.filter((b) => b.category === key)
          if (items.length === 0) return null
          return (
            <FadeIn key={key}>
              <section>
                <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted border-b border-border pb-3">
                  {label}
                </p>
                {items.map((build) => (
                  <BuildRow key={build.id} build={build} />
                ))}
              </section>
            </FadeIn>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add app/builds/page.tsx && git commit -m "feat: rewrite Builds page with category sections"
```

---

## Task 22: About Page

**Files:**
- Modify: `satyamexe/app/about/page.tsx`

- [ ] **Step 1: Rewrite app/about/page.tsx**

```typescript
// app/about/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { FadeIn } from '@/components/motion/FadeIn'

export const metadata: Metadata = {
  title: 'About',
  description: 'Satyam Tiwari — engineer turned product designer.',
}

const TIMELINE = [
  { year: '2017', event: 'Started as a software engineer — backend, then full-stack.' },
  { year: '2019', event: 'First design role. Discovered the gap between engineering and design was the most interesting problem.' },
  { year: '2021', event: 'Full-time product designer. Started building internal tools to fix my own workflow.' },
  { year: '2023', event: 'Launched Lazy Icons on the Figma Community. 1k installs in week one.' },
  { year: '2024', event: 'Launched Lazy Layers and Lazy Clean. Started writing about the design-engineering intersection.' },
  { year: '2025', event: 'Shipped the design-direction Claude skill. Crossed 3k LinkedIn newsletter subscribers.' },
  { year: '2026', event: 'Building in public. Shipping tools. Writing about what I learn.' },
]

const PLATFORM_LINKS = [
  { label: 'LinkedIn Newsletter', href: 'https://www.linkedin.com/newsletters/ui-ux-or-product-design-6891084225672794112/', meta: '3k+ subscribers' },
  { label: 'Substack', href: 'https://satyamtiwari2701.substack.com/', meta: '' },
  { label: 'Figma Community', href: 'https://figma.com/@satyam_tiwari', meta: 'Plugins + resources' },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[960px] px-6 py-24">
      {/* Intro */}
      <FadeIn>
        <section className="mb-24 max-w-[640px]">
          <p className="mb-6 font-mono text-xs uppercase tracking-widest text-accent">
            About
          </p>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-fg sm:text-5xl">
            Satyam Tiwari
          </h1>
          <p className="text-base leading-relaxed text-muted">
            Engineer turned product designer. I build Figma plugins, ship Claude
            skills, write about design and engineering, and try to close the gap
            between the two.
          </p>
        </section>
      </FadeIn>

      {/* Story */}
      <FadeIn delay={0.06}>
        <section className="mb-24 max-w-[640px]">
          <p className="mb-8 font-mono text-xs uppercase tracking-widest text-muted">
            Story
          </p>
          <div className="space-y-5 text-sm leading-[1.8] text-fg/80">
            <p>
              I started as a software engineer because I liked building things.
              Then I discovered that the most interesting problems weren&apos;t
              in the code — they were in the gap between what engineers build
              and what people actually need.
            </p>
            <p>
              That gap is where product design lives. I moved into design roles,
              but I never stopped writing code. The combination turned out to be
              the most useful thing about me.
            </p>
            <p>
              The through-line: I find the thing that&apos;s slow or broken, and
              I fix it. Then I ship it so other people don&apos;t have to fix it
              themselves.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* Timeline */}
      <FadeIn delay={0.1}>
        <section className="mb-24">
          <p className="mb-8 font-mono text-xs uppercase tracking-widest text-muted">
            Timeline
          </p>

          {/* Desktop: horizontal dots */}
          <div className="relative mb-2 hidden sm:block">
            <div className="absolute left-0 right-0 top-[5px] h-px bg-border" />
            <div className="relative flex justify-between">
              {TIMELINE.map(({ year, event }) => (
                <div
                  key={year}
                  className="group relative flex flex-col items-center"
                  style={{ width: `${100 / TIMELINE.length}%` }}
                >
                  <div className="relative z-10 h-[11px] w-[11px] rounded-full border-2 border-border bg-bg transition-colors group-hover:border-accent group-hover:bg-accent" />
                  <span className="mt-2 font-mono text-[9px] text-muted transition-colors group-hover:text-accent">
                    {year}
                  </span>
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute top-9 z-20 w-[120px] -translate-x-1/2 left-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="border border-border bg-surface p-2 text-center font-mono text-[9px] leading-relaxed text-muted">
                      {event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: vertical list */}
          <div className="space-y-4 sm:hidden">
            {TIMELINE.map(({ year, event }) => (
              <div key={year} className="flex gap-6">
                <span className="w-10 shrink-0 font-mono text-xs text-accent">
                  {year}
                </span>
                <p className="text-sm leading-relaxed text-muted">{event}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Platform links */}
      <FadeIn delay={0.14}>
        <section className="mb-16">
          <p className="mb-6 font-mono text-xs uppercase tracking-widest text-muted">
            Find Me
          </p>
          <div className="space-y-2">
            {PLATFORM_LINKS.map(({ label, href, meta }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor-hover
                className="group -mx-4 flex items-center justify-between border-b border-border px-4 py-4 transition-colors hover:bg-surface"
              >
                <span className="text-sm text-fg transition-colors group-hover:text-accent">
                  {label}
                </span>
                <div className="flex items-center gap-3">
                  {meta && (
                    <span className="font-mono text-[10px] text-muted">{meta}</span>
                  )}
                  <span className="font-mono text-xs text-muted transition-colors group-hover:text-accent">
                    ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </FadeIn>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd satyamexe && git add app/about/page.tsx && git commit -m "feat: rewrite About page with horizontal timeline and platform links"
```

---

## Task 23: Final Cleanup — Delete Old Components + Full Build Check

**Files:**
- Delete: all old component files listed in the File Map above

- [ ] **Step 1: Delete old components**

```bash
cd satyamexe && rm -f \
  components/ArticleCard.tsx \
  components/AuthorBlock.tsx \
  components/BuildCard.tsx \
  components/CaseStudyCard.tsx \
  components/NavBar.tsx \
  components/ReadingProgressBar.tsx \
  components/RelatedArticles.tsx \
  components/SubscribeForm.tsx \
  components/ThemeToggle.tsx \
  components/WritingList.tsx
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd satyamexe && npx tsc --noEmit 2>&1
```
Expected: zero errors. If errors appear, fix them before proceeding.

- [ ] **Step 3: Run all tests**

```bash
cd satyamexe && npx vitest run 2>&1 | tail -15
```
Expected: all tests pass (TextScramble, CountUp, ArticleList filter, existing lib/mdx tests, subscribe API tests).

- [ ] **Step 4: Run production build**

```bash
cd satyamexe && npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully` with all routes listed. No build errors.

- [ ] **Step 5: Verify dev server renders correctly**

```bash
cd satyamexe && npm run dev &
sleep 3 && curl -s http://localhost:3000 | grep -o "Satyam Tiwari" | head -1
```
Expected: `Satyam Tiwari` appears in the HTML.

- [ ] **Step 6: Manual browser checks**

Open `http://localhost:3000` and verify:
- [ ] Dark background (#0a0a0a) loads immediately — no flash of light
- [ ] Custom cursor dot appears and follows mouse with lag
- [ ] Cursor ring expands on hover over links/buttons
- [ ] Hero text "Satyam Tiwari." scrambles on load
- [ ] "View Work →" button pulls toward cursor on hover
- [ ] Menu button top-right opens full-screen overlay (clip-path reveal)
- [ ] Menu nav items stagger in; hover scrambles the label
- [ ] Work row thumbnails slide in on hover
- [ ] Metric numbers count up when scrolled into view
- [ ] Article rows lift 2px and tag inverts to accent on hover
- [ ] Reading progress bar visible and tracks scroll on `/writing/[slug]`
- [ ] Page transitions are smooth between routes
- [ ] Footer links have animated underline on hover
- [ ] Mobile (resize to 375px): cursor disabled, menu still works, timeline goes vertical

- [ ] **Step 7: Final commit**

```bash
cd satyamexe && git add -A && git commit -m "feat: delete old components — redesign complete"
```
