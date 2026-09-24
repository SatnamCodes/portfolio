# Decisions

A running log of nontrivial choices across the 12-prompt build. Newest entries go at the bottom of each prompt's section.

## Prompt 01 — Architecture, tokens, typography

### Stack and package manager
- **npm**, for the whole build. It ships with Node, so nothing else has to be installed. Lockfile: `package-lock.json`.
- **Next.js 16.3 (App Router, Turbopack)**, React 19.2, TypeScript `strict`. This meets the brief's "14+" requirement. Next 16 bundles its own docs in `node_modules/next/dist/docs/`, and `AGENTS.md` tells coding agents to read them before relying on older API knowledge.
- **No Tailwind.** `create-next-app` added Tailwind by default because the opt-out flag is `--no-tailwind`, not `--tailwind=false`; I removed it. The site is a bespoke editorial system, and one set of CSS custom properties plus CSS Modules keeps the tokens in a single source with no second theme layer to keep in sync.

### Folder structure
```
app/                 routes (App Router)
components/          shared React components
components/three/    WebGL / R3F only — see lazy-loading convention below
content/             MDX: roads/ research/ projects/ shelves/ traces/
lib/                 tokens.ts, fonts.ts, contrast.ts, content helpers
styles/              tokens.css (CSS mirror of lib/tokens.ts)
public/              static assets
docs/DECISIONS.md    this file
mdx-components.tsx   required by @next/mdx in the App Router
```

### Lazy-loading convention for heavy client-only modules
- Everything in `components/three/` (and anything else that imports `three`, `@react-three/*` or GSAP plugins) is client-only and is **never imported statically from a route**.
- A route loads it through a thin client wrapper using `next/dynamic(() => import(...), { ssr: false, loading: ... })`. `ssr: false` is only allowed inside a Client Component, so the wrapper carries `"use client"` and the page stays a Server Component.
- Confirm with `ANALYZE=true npm run build` (`@next/bundle-analyzer`) that `three` does not appear in the first-load chunk of any route.

### MDX pipeline
- **`@next/mdx`**, chosen over contentlayer (unmaintained) and velite (an extra build step). It is Next's own path and compiles MDX as ordinary modules under Turbopack.
- Each file carries its metadata as `export const metadata = { ... }`, not YAML frontmatter. `@next/mdx` has no frontmatter support, and Turbopack only accepts remark plugins with serializable options. Prompt 05 adds per-section schema validation on these exports.
- Proof: `content/roads/placeholder.mdx` renders on `/style-guide`.

### Tokens
- `lib/tokens.ts` holds the typed object that canvas/3D code reads. `styles/tokens.css` holds the same values as custom properties for CSS. The two are **hand-mirrored**: when you change one, change the other.
- Structural colours are **Espresso `#3E2723`**, **Sea Sand `#FFF4E4`**, and tints/shades derived from them. Semantic aliases: `--color-ink`, `--color-ink-muted`, `--color-ink-faint`, `--color-rule`, `--color-paper`, `--color-paper-deep`.
- `spectrum.*` / `--spectrum-*` is a separate group used **only** inside the prism scene, never as a UI accent.
- The display and body sizes are fluid `clamp()`s, tuned for 375px–1440px. Meta sizes are fixed.

### Typefaces (all SIL Open Font License, self-hosted and subset by `next/font`, `display: swap`)
| Role | Face | Why |
| --- | --- | --- |
| Display | **Instrument Serif** | Tall and condensed, with a cinematic, editorial silhouette. Bodoni Moda was more fashion-magazine and its hairlines break up at small display sizes; Cormorant runs light and wide; DM Serif Display is too heavy and friendly. It has only one weight (400 + italic), which suits the brief's restraint. |
| Body | **Newsreader** | Built for on-screen long-form reading, with an optical-size axis (`opsz`) so small and large text each get the right cut. Literata was the close runner-up but feels slightly more bookish-corporate. Lora has too little contrast. |
| Metadata | **Instrument Sans** | A restrained grotesque from the same family as the display face. Used only for small, tracked, uppercase labels. |
| Fountain pen (Wanderings) | **La Belle Aurore** | Forward slant, visible pressure contrast, joined strokes: reads as ink laid down quickly and privately. Rotated −0.6° on the page. **First-pass only**; Prompt 06 does the procedural refinement. |
| Gel pen (Shelves) | **Kalam** (300/400/700) | Rounder, upright, even stroke width, holds up at paragraph length. It's the only candidate in three weights, which Shelves needs for emphasis in notes. |

- The two hands are separated on every axis: slanted vs upright, contrast vs monoline, joined vs print, and pure Espresso vs `espressoTint1` ink. I rejected the "novelty" candidates: Caveat (overused), Homemade Apple (illegible at length), Patrick Hand and Gochi Hand (childish).
- **No Times New Roman.** `next/font` normally generates a fallback metric-matched to Times New Roman for serif faces. It's turned off (`adjustFontFallback: false`), and the fallback chain is Iowan Old Style → Palatino Linotype → Georgia → serif. The trade-off is slightly more layout shift while fonts swap in.
- The handwriting faces use `preload: false` because they appear on few routes. They still load through `next/font`, self-hosted with `swap`.
- **Licensing:** all five are OFL 1.1, fine for commercial and production use. No substitutions were needed.

### Contrast (WCAG 2.x, computed by `lib/contrast.ts` and shown live on `/style-guide`)
| Text / background | Ratio | AA body | AA large |
| --- | --- | --- | --- |
| Espresso / Sea Sand | 12.71:1 | pass | pass |
| Espresso tint 1 `#5D4037` / Sea Sand | 8.57:1 | pass | pass |
| Espresso tint 2 `#7D6055` / Sea Sand | 5.25:1 | pass | pass |
| Espresso tint 2 / Sea Sand shade 1 | 4.64:1 | pass | pass |
| Espresso / Sea Sand shade 1 | 11.24:1 | pass | pass |
| Espresso / Sea Sand shade 2 | 9.44:1 | pass | pass |
| Sea Sand / Espresso | 12.71:1 | pass | pass |

- Tint 2 started at `#8D6E63` (Material "brown 400"), which measured **4.25:1 and failed AA body**. I darkened it to `#7D6055` because it serves as `--color-ink-faint` for small text.
- Tint 3 `#BCAAA4` is for rules and borders only, never text.

### Accessibility base
- `<html lang="en">`. A skip link goes to `<main id="main" tabIndex={-1}>`. The focus ring is a 2px Espresso outline.
- The whole `eslint-plugin-jsx-a11y` recommended set is on. `eslint-config-next` already registers the plugin but enables only a few rules.
- A global `prefers-reduced-motion` rule shortens CSS animations and transitions. Prompt 09 owns the full motion policy.

### `/style-guide`
- Returns `notFound()` in production unless `STYLE_GUIDE=1`. It is also `noindex`, disallowed in `robots.ts`, and not linked from anywhere.

## Prompt 02 — Global navigation and page transitions

### Navigation
- The nine items live in `lib/site.ts` (`navItems`) in the brief's order and with its exact names. The owner's name (`site.owner`) is there too and feeds the wordmark.
- **Wordmark:** "Satnam" set in the fountain-pen face, rotated −2°, like a signature. It links home.
- **Desktop (≥ 72rem / 1152px):** a single line of tracked uppercase Instrument Sans on the paper, with only a hairline rule under the masthead. 1152px is where all nine items still fit on one line next to the wordmark (checked at 1152, 1280, 1440, 2560). The masthead is capped at `--page-max` (90rem) and centered on ultra-wide screens.
- **Below 72rem:** a text button labelled "Contents" / "Close", not a hamburger icon, which opens the list as a stacked column. It closes on navigation, and Escape closes it and returns focus to the button. Prompt 09 does the full mobile polish.
- **Active state:** a hand-drawn ink stroke under the link, drawn as an SVG `mask` filled with `--color-ink` so it stays tied to the tokens. Hover shows the same stroke at 35% opacity and darkens the text. Nothing scales and there are no shadows.
- `aria-current="page"` marks the exact route and `aria-current="true"` marks a section ancestor (e.g. `/roads/some-essay`). Both get the ink mark.
- Every link and the toggle is at least 44px tall; the tests measured exactly 44px.

### Page transitions: React `<ViewTransition>` + the browser View Transitions API
- **Why this approach:** it ships with the React build Next 16 already uses, so the transition adds **no JS bundle weight** and stays off the first-paint path. The animation is pure CSS in `globals.css`. Browsers without the View Transitions API simply navigate instantly. I rejected Framer Motion (~30 kB+ of mount/unmount orchestration) and GSAP (saved for the physical animation in later prompts).
- `components/Page.tsx` wraps **each `page.tsx`**, not the layout, because persistent layouts never fire enter or exit. **Every new route must wrap its content in `<Page>`.**
- Only links tagged with `transitionTypes={["page"]}` animate, which currently means the nav and the wordmark. **Deep links, browser back/forward and refreshes carry no type and change instantly.** That is the deliberate "graceful" behaviour when no transition is available.
- **Motion:** the old page fades out in 140ms. The new page fades in over 260ms (after an 80ms delay) while a 340ms "paper wipe" reveals it from the left with an 8px settle. Easing is `--ease-out`, with no bounce. The root snapshot has its animation turned off so the masthead never flickers.
- **Reduced motion:** both sides become a plain 120ms linear opacity fade with no wipe or movement. The global `*` reduced-motion rule doesn't reach `::view-transition-*` pseudo-elements, which is why this needs its own rule.
- Verified in Chrome with Playwright by reading `document.getAnimations()` during a nav click: normal timings are 140/260+80/340ms, reduced motion is 120/120ms, and browser back runs no animation.

## Prompt 03 — Home / manifesto + prism

### Content
- `content/home.ts` is the homepage's single editable source: heading, manifesto paragraphs, margin notes (with the slot each goes in), interests, path breadcrumb, and the prism's text description.
- **The manifesto body is placeholder**, bracketed and flagged `manifestoIsPlaceholder: true`; it renders in muted italics until replaced. The heading, the two margin notes, the seven interests and the "Bathinda → Bengaluru → World" path are the brief's own examples, used as given. **Replace them if they aren't yours.**
- Margin notes: `MarginNotes near="heading" | "prism" | "body" | "footer"` renders whatever the array holds for that slot. Adding a note never touches layout code.

### Scene: React Three Fiber, no Drei
- Drei was left out because nothing in it earned its bundle weight. The only extra import is Three's `RoomEnvironment`, turned into a PMREM environment map for the glass reflections.
- **Glass: `MeshPhysicalMaterial` (transmission 1, IOR 1.5, clearcoat, a faint Sea Sand attenuation tint, double-sided), not a custom glass shader.** On a flat paper background, what makes glass read is reflection and edges, and the physical material does both. A custom refraction shader would add complexity without a visible gain.
  - The shape is an extruded equilateral triangle with a small inset bevel so the edges catch light, plus a separate Espresso line drawing of its edges (`EdgesGeometry`) that ties it to the site's line-art language.
  - The scene background is exactly Sea Sand and tone mapping is off (`flat`), so the canvas meets the page without a visible edge.
- **Custom GLSL is used only for the light, never the glass**:
  - Each beam is a quad with a Gaussian cross-section, fades at each end, widens slightly along its length, and shimmers with two slow sine waves.
  - Dust is a `Points` cloud whose specks brighten near the incoming beam.
  - Beam colours are passed as raw sRGB, so the spectrum tokens reach the screen unchanged.
- **The optics are real** (`lib/prism-optics.ts`). White light is traced through the prism with Snell's law at both faces, using a per-wavelength Cauchy index (n ∝ 1/λ²). Red deviates least, violet most, and the violet end fans wider.
  - The index range (1.47 → 1.63) is exaggerated about 9× over real crown glass, whose ~1.5° spread would be invisible at this size. The result is a 12–15° fan.
- Inside the glass the light stays mostly white, and colour separates toward the exit face.
- The same optics module draws the **2D fallback illustration** in pixel space, so the fallback is faithful to the scene rather than a stand-in.

### Session variation (`lib/session-seed.ts`)
- The seed is a 32-bit random value created once per browser session and stored in `sessionStorage` (`prism-seed`). If storage throws, a fresh seed is used. A `mulberry32` generator derives bounded offsets around a fixed composition:
  - prism roll 6–11°, tilt X ±5°, tilt Y −12…−4°
  - light angle 16.5–21°, entry point along the face 0.42–0.56
  - dispersion ×0.78–1
  - dust drift and speed
  - camera offset ±0.3/±0.2/±0.4
  - animation phase
  - glass roughness 0.02–0.06
  - ±0.8% vertex jitter (a slightly imperfect prism)
  - ±10% per-band width
- It is always the same picture, never re-randomised. Verified: a reload keeps the seed; two new sessions visibly differ in tilt, light angle and where the bands land.

### Interests as part of the spectrum
- The scene projects each exit ray to screen space and binary-searches for where it crosses 80% of the stage width. Each beam is cut to end there, and the reported y positions place the list items (red band = first item).
- With a different number of interests, items spread evenly between the red and violet ends.
- Below 48rem the list flows under the stage as a plain wrapped list.

### Loading, fallback, accessibility
- `PrismStage` (a client component) loads `components/three/PrismScene` with `next/dynamic({ ssr: false })` once the stage comes within 300px of the viewport. The page itself is a server component, so the manifesto, notes, interests and path are all in the server HTML.
- **Loading state:** a faint Espresso outline of the prism, drawn from the same optics. The canvas then fades in over 900ms.
- **No WebGL (probe fails) or context lost:** the full 2D illustration (beam, seven bands, prism) is shown and the labels stay aligned with it. Verified with `--disable-webgl` and with `WEBGL_lose_context`.
- **`prefers-reduced-motion`:** the real scene renders one still frame (`frameloop="demand"`, time frozen), rather than falling back to the illustration. The brief asks for no motion, and a still of the real prism serves that better than the 2D drawing. It reacts to live changes of the setting.
- The canvas is `aria-hidden`, and the `<figure>` carries a visually hidden `<figcaption>` describing the scene. The interests are a real `<ol aria-label="Interests">`. The notes are real paragraphs in reading order.
- The path uses CSS arrows with empty alt text (`content: "→" / ""`), so screen readers read the places, not "right arrow".
- Scroll cue: visible text "Scroll to begin" with an `aria-hidden` hand-drawn arrow. It hides after 24px of scroll, and its drift animation stops under reduced motion.

### Performance (production build, Chrome)
- **Three.js is not in the homepage's initial JS.** It lives in a lazy chunk of 900 KB raw / 237 KB gzipped.
- **Capability tiers:** ≤4 cores or ≤4 GB `deviceMemory` counts as low. Low tier gets 90 dust specks instead of 220, device pixel ratio capped at 1.25 instead of 1.75, and transmission at half resolution.
- **Render loop:** two observers. One (300px margin) starts loading; the other (0px) drives `frameloop`. Measured 60 frames/s in view, 0 off-screen, 60 again on return.
- **Frame rate:** 60 fps on an RTX 4060 laptop (ANGLE/OpenGL), unchanged at 4× CPU throttle. SwiftShader software rendering (headless CI default) manages about 8 fps; that is a property of software GL, not a target.
- **Disposal:** geometries, shader materials, PMREM/environment and the `RoomEnvironment` are disposed explicitly on unmount. R3F disposes its JSX-declared materials. Heap snapshots confirm no `WebGLRenderer`, scene or material survives an unmount.
- **Known issue, upstream, not fixed:**
  - In Chrome, each unmount of any R3F canvas leaves the `<canvas>` element and its native WebGL context held by a native handle. I reproduced this with a bare R3F canvas rendering a single box. It does not happen with plain WebGL canvases, so it is specific to how R3F 9.8 / Three 0.186 tear down.
  - Cost: about 50–56 KB of JS heap per homepage visit (40 Home↔Roads cycles: 7.7 → 10.4 MB).
  - A pinned canvas used to pin the entire previous page's DOM too; `Lifecycle` now detaches the canvas on unmount, which brought the homepage down to the bare-R3F floor.
  - Calling `renderer.dispose()` on unmount (which R3F skips) was measured to roughly **double** the retention, so it is deliberately not called.
  - A real fix would keep one persistent canvas in the root layout. Revisit in Prompt 11.
- R3F 9.8 logs a `THREE.Clock` deprecation warning from its own internals on every mount. It's a warning, not an error, and not our code.

## Prompt 04 — Prism cursor interaction

### Model: the cursor is a physical obstruction (`lib/beam-occlusion.ts`, pure and testable)
- The cursor is a disc of radius 0.2 scene units held in the plane of the light. Every frame the pointer is ray-cast onto that plane (the prism group's local z = 0 plane, derived from the session's own transform) and mapped into the same 2D space the optics use.
- The light is modelled as 16 **segments in a tree**: the incoming white beam → the white light inside the glass and each band's internal path → each band's exit beam. Each segment knows its half-width, and exit bands widen along their length.
- **Proportional coverage:** a smoothstep of how much of the beam's cross-section the disc covers, from 0 when grazing to 92% at most. Some light always scatters past a hand. It applies only **downstream of the point of contact**; the beam before the cursor is untouched.
- **Propagation:** a segment's upstream shadow is 1 − Π(1 − block) over its ancestors. Blocking the white beam dims every band. Blocking one band dims only that band beyond the cursor.
- **Shader:** four uniforms per beam (`uOccAt`, `uOccAmount`, `uOccSoft`, `uUpstream`). The beam dims past the contact point with a soft edge of 0.12 scene units, and a faint scatter glint appears at the contact edge. **No geometry is rebuilt and no optics are re-simulated per frame**; the per-frame cost is 16 coverage tests plus uniform writes.
- The session-seed composition is untouched. Occlusion only multiplies the brightness of beams whose geometry is fixed for the session.

### Recovery: asymmetric springs
- Each segment's block amount is a spring state. **Engage:** k = 260, critically damped, so the shadow tracks the cursor continuously while it moves. **Release:** k = 20, ζ = 0.5, so light returns over roughly 0.4s with a slight overshoot (clamped at −10%, read as a brief brightening) before settling.
- The contact position follows the cursor with exponential smoothing and holds still once the block amount has faded.
- **Rapid in/out:** there's no state machine to fight, only one spring per segment whose target changes. The timestep is clamped to ≤1/30s, so a stalled tab can't make the springs explode.
- **Exit events:** `pointerleave`, `pointercancel`, `pointerup` (touch) and window `blur` all remove the obstruction. Pointer state is tracked with native listeners on the canvas rather than R3F's `state.pointer`, which keeps the last position after the cursor has left.

### Touch
- **Press and drag across a beam.** The obstruction exists while a finger is down (`pointerdown`, or `pointermove` with buttons held) and releases through the same spring on lift.
- The canvas uses `touch-action: pan-y`, so vertical swipes still scroll the page and horizontal drags reach the light, which runs mostly horizontally. A vertical swipe that the browser takes over fires `pointercancel`, which releases cleanly.

### Reduced motion
- Interaction is **disabled** (`interactive={!reduced}`), matching the still frame from Prompt 03. There are no listeners and the light is always at baseline.

### Measured (Chrome, RTX 4060, dev build)
- Sweeping down through the white beam in 6px steps, band saturation reads 101 → 94 → 56 → 43% (plateau) → 48 → 75 → 100% of baseline: continuous and proportional. About 27 of the 64 saturation points are the paper itself, so the plateau means the bands are about 90% shadowed.
- **Recovery after leaving:** 44 → 50 → 66 → 84 → 99 → 101% (overshoot) → 100%. The `pointerleave` exit path recovers the same way.
- **Frame rate:** 60 fps and no frames over 25ms, both idle and while sweeping, at 1× and 4× CPU throttle (about 300 frames each).

## Prompt 05 — Roads, Research, Projects

### Pipeline
- **One loader, three schemas** (`lib/content.ts`, server-only). Each MDX file exports `metadata`, which is validated with Zod `strictObject`, so unknown keys also fail. Dynamic imports use a literal folder prefix per section, so each section's bundle only contains its own folder.
- **Build-time validation fails loudly**, naming the file and the field. All three cases were checked by planting bad entries: a missing required field (`category`), an invalid enum and a malformed URL, and research sections out of order.
- **Schemas:**
  - **Roads:** `title`, `date` (YYYY-MM-DD), `description`, `category`, optional `readingTime` override, optional `image {src, alt, width, height}` where `alt` is required.
  - **Research:** `title`, `date`. The optional sections are **MDX blocks**, `<Field name="question">…</Field>`, not metadata strings, because Results, Method and similar need rich content (lists, code, images). The loader reads the section names from the source and validates them against the fixed set and order: Question, Motivation, Background, Method, Experiment, Results, Visualizations, Discussion, Limitations, Reflection, References. Unknown, duplicate or out-of-order sections fail the build. Only the sections present render, so there are never empty headers.
  - **Projects:** `title`, `year`, `technologies[]` (≥1), `status` (in progress / maintained / complete / archived), optional `repository` and `demo` URLs, `summary`. The MDX body is the optional write-up and is rendered only if it contains prose.
- **Reading time:** words in the prose (the metadata export, code blocks and JSX tags are removed first) ÷ 225 wpm, rounded up, minimum 1. The long sample has 1,794 words → 8 min; the short one → 1 min.
- **Drafts:** `draft: true` entries appear in `next dev` and are excluded from production builds (unless `INCLUDE_DRAFTS=1`). Prompt 10 adds the build-time safeguard.
- **Every sample entry is a draft**, labelled "[Sample]" in its text, and exists only to exercise the layouts. A production build currently shows each section's empty state, since no real writing exists yet.
- All detail routes use `generateStaticParams` with `dynamicParams = false`, so unknown slugs return 404.

### Three distinct identities on shared type
- **Roads, a contents page:** grouped under display-serif year headings. Each row has the date on the left, the title in display serif with an italic description, and category and reading time right-aligned. The whole row is the link's hit area (a stretched `::after`), but only the title is the accessible link text. The detail page has a centred reading column, an italic lead, and the optional image through `next/image` with `sizes`.
- **Research, a lab notebook:** numbered records ("No. 002", with a visually hidden "Entry" for screen readers), a vertical margin rule and dashed record rules. The title is in the body serif rather than display type (this section reads as working notes, not publication). The question excerpt shows as "Q." and the present sections as a quiet list.
  - The detail page has label-column sections (small tracked caps, collapsing to labels above content on mobile) and an "In this entry" jump-nav once an entry has **3 or more** sections, sticky on wide screens.
- **Projects, an engineering log:** a real `<table>` (year / project / status / built with), with the project title as the row header. Below 48rem it becomes stacked records with inline labels instead of squeezed columns. The detail page is a plain `<dl>` of facts: Repository and Live rows appear only when supplied, and external links carry a visible ↗ plus a visually hidden "(opens in a new tab)". There are no badges, logos or buttons.
- Prose for all MDX bodies comes from one stylesheet (`styles/prose.module.css`). Research's `Field` labels use a doubled class selector to win over the prose `h2` rule; this was a real bug, caught in review.
- **Filtering is deliberately not built.** With single-digit entry counts it would be clutter. Revisit past about 15 entries per section, as a quiet category/status line rather than a control bar.
- **Motion:** list rows use a quiet staggered rise (520ms, 45ms steps, capped at 12 rows). The global reduced-motion rule now also zeroes animation and transition **delays**, so a staggered row can't sit invisible while it waits.
- **Page transitions:** all internal content links go through `components/PageLink.tsx`, which tags navigations with the same page transition as the nav.
- **Checked at 375px and 1440px:** no horizontal overflow on any index or detail page. A real overflow on Project detail (the grid's implicit column sized to the facts list) was fixed with `minmax(0, 1fr)`.

## Prompt 06 — Shelves

### Library choice: Motion (`motion` 13.4.1, the Framer Motion package)
- Motion provides real spring physics (`useSpring`) for the hover pull, shared-element FLIP (`layoutId`) for opening, and presence/exit animation for closing. Its sequence API also covers Prompt 09's single timeline, so **the site ships one animation library, not two**.
- **Pinned exactly, with an `overrides` entry for `framer-motion@13.4.1`.** The current `latest` (13.4.2) returned 404 for its tarball from the npm registry on 2026-09-23. Unpin once 13.4.2+ installs cleanly.

### Book schema and seeding
- `content/shelves/*.mdx` metadata: `title`, `category` (Physics & Mathematics / Computer Science / Personal / Philosophy), `kind` (book / notebook / scan / notes / reference), optional `author`, `order` (position on the shelf), `orientation` override, `draft`. Validated with Zod like every other section.
- **Visual variation is derived, not authored** (`lib/book-variation.ts`): an FNV-1a hash of the slug seeds `mulberry32` and fixes:
  - height 150–230 and thickness 24–54 (px at full scale)
  - orientation: about 80% upright, 12% leaning at −3…−8°, 8% lying flat
  - one of six covers from the Espresso/Sea Sand tokens
  - 0–3 bands and their offset
  - title treatment (plain, a paper label patch, or foil lettering; foil only on dark covers, after a real invisible-title bug)
  - title scale and a wear value
  - The same book always looks the same; two books match only if their hashes collide.
- Every book is a real `<button aria-haspopup="dialog">`. Its accessible name is the spine title plus a visually hidden ", {kind} by {author}".

### Illustration
- The case is CSS: a paper back panel with faint vertical grain, Espresso side walls, and a plank under every line of books (lighter top face, front face, dark lip). It's drawn as one repeating gradient, so a crowded shelf wraps onto more planks without extra markup and a sparse shelf is simply a quiet, mostly empty plank. An empty category shows a plank and "Nothing shelved here yet."
- Spines are coloured boxes plus **one shared SVG `<symbol>`** (cloth weave pattern and a rounded-spine shading gradient) referenced with `<use>` from every book, so there's no per-book SVG geometry. Bands and labels are small spans. Nothing is photorealistic.

### Hover physics
- **Five springs per book** (stiffness 260, damping 21, mass 0.9: weighted, slightly underdamped): lift, pull toward the viewer (`translateZ` under an 900px row perspective), turn toward the cursor (`rotateY` up to 18°), a slight tip about the spine (`rotateZ` up to 2.5°), and a separate contact-shadow element whose **opacity and scaleX** animate. `box-shadow` is never animated, and there's **no `scale()`** on the book.
- **Proximity:** influence radius 150px, falloff (1 − d/R)², measured with vertical distance halved, so several neighbouring books respond by different amounts.
- **Cost control:** one rAF-throttled `pointermove` per shelf. Book rectangles are cached and invalidated on scroll or resize. Books outside the radius are settled once and then **skipped entirely** (verified: two books away the transform stays `none`). No React state changes on hover; everything goes through motion values.
- **Keyboard focus** gives a defined "pulled" pose (lift 12, pull 28, no turn), so focus is never `:hover`-only. **Touch:** pressing a book pulls it and lifting releases it; a tap opens it.
- **While a book is open,** every shelf's hover is suppressed and released, and the opening book's springs settle to rest as the shared-element move begins.
- **Reduced motion:** the springs are bypassed (`jump`) and hover becomes an instant state change.

### Opening: shared element plus a cover swing
- The spine's inner element and the reading dialog share `layoutId="book-{slug}"`. Motion FLIPs the spine's box into the dialog's box (0.7s, ease-out). A cover flap in the book's own colour sits over the pages, so the viewer sees the **same book grow off the shelf**. The flap then swings open on its left hinge (`rotateY` −172°, delay 0.5s, 0.6s) and the pages fade in at 0.75s. The shelf keeps an empty slot where the book was.
- **Closing reverses it in two steps:** content fades and the cover swings shut (0.45s), then the URL changes and the layout animation carries the closed book back into its slot. Chaining the steps avoids the flap and the FLIP fighting each other.
- **URLs:** opening calls `history.pushState('/shelves/{slug}')`, which Next 16 syncs to `usePathname` without remounting, so the animation stays continuous. `/shelves/[slug]` is a real statically generated route rendering the same library. Browser Back closes the book. Close goes back if we pushed the entry, otherwise it `replaceState`s to `/shelves`.
- **Deep-link fallback:** a directly loaded `/shelves/{slug}` renders the book **already open** (`AnimatePresence initial={false}`), because there is no closed state to animate from. Closing still animates it back to its place on the shelf.
- **Dialog:** `role="dialog"`, `aria-modal`, labelled by the title. Focus moves to the title (`tabIndex -1`) on open. Tab and Shift+Tab are trapped. Escape closes, and so does clicking the backdrop. Focus returns to the originating book after the exit animation completes. Page scroll is locked while a book is open. All verified with keyboard only, including the deep-link case.
- **Reduced motion:** no `layoutId` and no flap; the dialog cross-fades (0.2s).

### Reading and pagination
- **Pages are CSS multi-column overflow:** one column on narrow screens, a two-page spread with a centre crease from 64rem. Turning a page scrolls exactly one spread (column width + gap). Page count is measured with a `ResizeObserver` and re-measured when the typeface changes: the long sample is 8 spreads in gel pen and 5 in plain type.
- **Controls:** Previous/Next buttons, ←/→ keys, and a polite live "Page n of m". The content stays in linear DOM order for screen readers, and focusing a link on a later page updates the counter.
- **Content types:**
  - typed notes, book notes (with author), notebooks, references: MDX
  - scans: `<Scan>`, a `next/image` with required alt text plus an optional "Transcription" disclosure
  - mixed text and images: supported
  - Images are capped at 88% of the page height (container query units) so they never split across columns.

### The gel pen (final treatment)
- **Face:** Kalam 300 at 1.1875rem on a 2rem line, in Espresso tint 1, over faint ruled lines (Espresso tint 3 at 45%) that share that 2rem pitch. Headings and `<strong>` use Kalam 700 in full Espresso. `<em>` becomes a pen underline. `<mark>` is a highlighter wash in Sea Sand shade 2.
- **No new colours:** the brief's "muted stationery accents" are taken from the existing palette (highlighter = Sea Sand shade 2, underline = Espresso tint 2). No blue or red inks were introduced.
- **How it differs from the fountain pen (Wanderings):** upright, rounded, even stroke weight, and ruled paper, against a slanted, joined, pressure-contrasted script. The fountain face is never used in Shelves.
- **Technical content (the judgement call):** handwriting is for prose only. **Code** stays in a monospace block, and **formulas** use `<Formula>` in the typeset italic serif. A handwritten formula is a legibility risk, and in a real notebook these would be copied carefully anyway.
- **Legibility toggle:** a "Plain type" button (`aria-pressed`) in every open book switches the pages to Newsreader. The choice is remembered per viewer in `localStorage` (read through `useSyncExternalStore`, so a server-rendered deep link hydrates without a mismatch) and falls back to off if storage is unavailable.

### Sample content
- 13 sample books across the four shelves, all `draft: true` and titled "Sample …". They cover every note kind, a long notebook (pagination), a scan (a generated placeholder page labelled PLACEHOLDER SCAN), a technical note with code and a formula, a leaning and a flat book, a sparse shelf (Philosophy, 1 book) and a fuller one (Computer Science, 5). **Production builds show empty shelves until real notes are added.**

### Measured
- **Dev build, 40 open/close cycles:** heap goes 10.35 → 11.38 MB over the first 10 (warm-up), then +0.30, +0.11, +0.19 MB per further 10 cycles, which is close to flat. Re-check on a production build in Prompt 11.

## Prompt 07 — Wanderings

### The fountain pen, final: a hybrid (webfont + seeded per-word ink)
- The letterforms are **La Belle Aurore**: slanted, joined, with pressure contrast. The MDX `p`, `li`, `h2`, `h3` and `blockquote` renderers wrap **every word in a span** carrying one of **12 ink variants**:
  - baseline drift of ±1.6px
  - rotation of ±1.1°
  - letter-spacing from −0.015 to +0.03em
  - **heavier ink** (a 0.22px text stroke in full Espresso) on 2 variants, about 1 word in 6
  - **lighter ink** (Espresso tint 1) on 2 variants
- Each **paragraph** also takes one of 4 slight rotations (±0.4°) and indent drifts (0–0.6em).
- **Seeding:** each paragraph's variant sequence comes from `mulberry32(hash(paragraph text))`. The same sentence always gets the same hand, across renders, builds and servers, with no layout shift. Variants are classes, not per-word inline styles, so the HTML stays small (the long sample is 27 KB).
- **Still real text:** spaces are plain text nodes between the spans, so selection, copy, find-in-page and screen readers see ordinary prose. Untitled entries get a visually hidden `h1` ("Untitled, {date}").
- **Benchmark (dev build, Chrome):** a 1,680-word entry produces 1,625 word spans and 1,728 elements, DOMContentLoaded at 237ms, and a **2.6ms** forced relayout of the whole article. **Fallback threshold:** above `PER_WORD_LIMIT = 4000` words the per-word spans are dropped (the font and paragraph drift remain), which caps the DOM at roughly 4k spans, an estimated ~6ms relayout.
- **Marginal annotations:** `<Aside>` in MDX. In the fountain pen at 0.8em, rotated −3°, floated into the right margin from 64rem, and inline on narrower screens.

### How it differs from the gel pen (Prompt 06)
| | Fountain (Wanderings) | Gel (Shelves) |
| --- | --- | --- |
| Face | La Belle Aurore, slanted and joined | Kalam, upright, print |
| Stroke | Pressure contrast plus per-word ink weight | Even and monoline |
| Baseline | Drifts word by word; paragraphs tilt | Straight, on ruled lines |
| Paper | Open, unruled, lots of air | Ruled notebook, paginated |
| Colour | Espresso with ink-weight variation | Espresso tint 1 plus highlighter wash |
| Technique | Seeded per-word spans | Plain webfont styling |

### Browsing: a desk of leaves, not a feed
- **Index:** each entry is a paper leaf (date, then title, or the opening 14 words for an untitled fragment, in the fountain pen) placed on a 12-column desk by its own seed: column start and span (narrower for fragments), a drop of 0–4rem and a tilt of ±1.2°. Some leaves carry a seeded marginal mark (asterisk, circle, tick, swoosh, dash). The marks are decorative and `aria-hidden`.
- **Exploratory:** hovering or focusing a titled leaf unfolds its opening lines. That preview is `aria-hidden`, because the link already names the entry.
- **Underneath:** an `<ol>` of links in date order. Tab order and screen-reader order are chronological whatever the visual arrangement (verified). The whole leaf is the hit area, with a visible focus outline on the leaf.
- **Mobile:** a single column, alternately indented and tilted: linear, but not a feed.
- **Entry page:** mostly air. The text column sits right of centre from 64rem, like the right-hand leaf of a journal. **Fragments** under 40 words are centred and dropped a fifth of the way down the page, alone. Long entries simply run on.
- **Empty archive:** "Nothing written here yet. The pages are waiting."

### Legibility toggle, now shared
- `lib/plain-type.ts` holds one remembered "Plain type" preference for **both** handwriting systems (`localStorage` read through `useSyncExternalStore`, so there's no hydration mismatch). Switching it in Wanderings carries over to Shelves, and vice versa (verified).
- In Wanderings, `data-plain` on the entry frame removes every word transform, stroke and indent, and sets the text in Newsreader at the body size.

### Motion
- Only the shared quiet stagger on the index and the preview unfold, both neutralised by the global reduced-motion rule. The handwriting is static by design.

### Sample content
- Five `draft: true` sample entries (a one-line fragment, a one-line question, an untitled pair of paragraphs, a titled entry with a margin note, and a 28-paragraph long entry), all marked "[Sample]".

## Prompt 08 — Traces and New Beginnings

### Traces
- **Content:** `content/traces/traces.json`, one object per photograph, validated with Zod at build time. Required fields are `id` (a slug), `src`, `width`, `height` and `alt` (at least 10 characters, and it must describe the picture). Optional fields are `caption`, `location`, `date`, `camera`, `lens`, `exposure` and `draft`. Duplicate ids fail the build.
  - JSON rather than MDX because a photograph has no body text. Everything in one file is also easier to reorder.
- **Metadata renders only when supplied:** an italic caption, then one quiet line for place and date and one for kit (camera · lens · exposure). A photo with nothing gets no caption block at all (checked: the photo with no metadata has 0 lines).
- **Layout: a curated rhythm, not masonry** (`components/traces/layout.ts`, pure). It repeats three beats on a 12-column grid:
  - a **feature**: landscapes span 10 columns; portraits span 5 with the caption set beside them
  - a **mismatched pair**: 7+4 or 5+6, with the second image dropped 3–6rem
  - an **offset single** pushed right, caption beside it
  - **Panoramas** (aspect ≥ 1.9) always take the full width. Gaps stay generous (`--space-xxl` between rows). Below 64rem it's one full-width column with the same spacing.
- **Loading:** `next/image` everywhere, with `sizes` set to the slot's real width. The first image has `priority`; the rest lazy-load (7 of 8 in the sample). Large galleries reveal 24 at a time through a "Show more traces" button that moves focus to the first newly revealed photograph.
- **Viewer:** a full-viewport dialog, the photograph alone on Espresso with the caption and metadata as one line at the foot.
  - **Opening** morphs the thumbnail into the viewer frame (`layoutId`, 0.6s). The frame is sized in JavaScript to the photo's aspect ratio, so the morph never distorts it.
  - **Moving through photos** (←/→, the Previous/Next buttons, or a horizontal swipe over 50px with `touch-action: pan-y pinch-zoom`) cross-fades inside the viewer. The morph pairing is dropped at that point, so nothing flies back to the grid.
  - **Closing** morphs back when the photo on screen is the one that was opened, and fades otherwise. Focus returns to the thumbnail of **the photograph that was on screen** (scrolled into view) rather than the one first clicked, so the viewer lands where they left off.
  - `useDialogFocus` (`lib/use-dialog-focus.ts`, shared with Post) moves focus to Close, traps Tab and closes on Escape. The counter is a polite live region.
  - **Reduced motion:** no morph; everything cross-fades in 0.15s.
- **Sample content:** 8 placeholder images (generated tonal gradients, each labelled "PLACEHOLDER nn"), mixing landscape, portrait, square and panorama, with metadata from full to none. All are `draft: true`.
- The navigation label stays "Traces". The section intro calls it "Things witnessed", never "Photography".

### New Beginnings
- **A single MDX file** (`content/new-beginnings.mdx`) rendered at `/new-beginnings`, which is static and server-rendered with no client code of its own.
  - **Chapters** are plain `##` headings. Their slugged ids and the Roman-numeral contents line at the top come straight from the MDX source, so there's no second list to keep in sync.
  - `<PullQuote>` sets a line in the display serif; `<Photo>` embeds a photograph in Traces' restrained style, with an optional `wide` variant that breaks out of the measure on wide screens. Both are available to any MDX.
- **Heading hierarchy:** one `h1`, then `h2` chapters. No "Skills" or "Experience" style headers, no timeline widget.
- **No biography was invented.** Every paragraph is bracketed guidance ("[Placeholder — the place you were born: …]"). The chapter titles ("Where it begins", "What went wrong", …) are neutral suggestions that follow the brief's topic list, and the file says so. The page shows "Placeholder: this story hasn't been written yet" and sets the text in muted italics until `isPlaceholder: false` is set.
- **Scroll reveals were deliberately left out.** Long-form reading is better served by stillness, and the brief made them optional.
- **Real bug fixed:** the header and the story are both 36em wide, but at different font sizes, so the contents sat misaligned with the prose. Both now use the body-lg size.

### Prompt 03 revision: homepage alignment (2026-09-23, from the owner's alignment reference)
- **The first screen is now:**
  - the prism at the centre, **borderless** (no frame; the canvas still bleeds to the viewport edges)
  - the interests to the right of the light
  - "different paths, same light." to the left of the prism, below the incoming beam
  - "A mind that wanders builds anyways." pinned top right
  - the heading centred under the prism, with the scroll cue beneath it
  - a new corner note, "to understand / to build / to explore / to leave something behind.", pinned bottom left. **Its wording comes from the reference image;** it lives in `content/home.ts` and can be changed or removed there.
  - the path breadcrumb pinned bottom right
- The manifesto body follows after the scroll. The margin-note slots are now `top`, `prism`, `corner` and `body`.
- **Sizes are unchanged.** The stage is shorter (clamp 17–32rem, 44svh) so the whole first screen fits; checked at 1536×1024, 1440×900 and 1366×768. On wide screens the camera now holds a fixed **112px per scene unit** instead of fitting the frame, so the prism renders at the same pixel size as before. The prism moved to the centre (x −0.35), and the labels sit at 74% of the width.
- **Labels keep at least 26px apart,** centred on the band fan, so a tight fan never crowds them.
- **The incoming beam** is 4.6 units long and fades in over 80% of that, so the light starts faintly inside the frame instead of being cut by the stage edge.
- **Interests are now** Mathematics, Physics, Philosophy, Curiosity, Ideas, People, Thoughts, in the owner's order, red → violet. Their initials (M P P C I P T) contain one vowel, so no ordering spells a word; the given order was kept.
- The nav names stay as the brief specified. The reference's labels were not adopted, because it was an alignment reference only.

## Prompt 09 — Post

### Structure
- `components/post/PostDesk.tsx` holds the resting form and the state machine; `components/post/sequence.ts` holds the seven-phase timeline. **The sequence module is lazy-loaded:** it's requested the first time the form gains focus and awaited on submit, so none of its code is in the Post page's initial load.
- **The letterbox is a line-art SVG with fixed geometry** (viewBox 200×300, slot at y 96). Its flap and body are addressable parts (`data-part`), and its colours come from `--ink` and `--fill` so the same drawing can invert on Espresso.

### The single timeline (Motion `animate(sequence)`, one controls object, ~5.8s)
| t (s) | Phase | What moves |
| --- | --- | --- |
| 0.00 | 1 message → sheet | Name, email and button fade. The sheet, a stack of three panels built from the **visitor's own text** in the textarea's own computed font and padding, begins exactly over the textarea (already styled as paper). A world-space `clip-path` reveals it downward to letter proportions while it drifts to centre. The signature (the visitor's name and email) inks in. |
| — | 2 continuity | The same sheet element carries through every later phase; no asset is ever swapped. |
| 0.85 | 3 expansion | The small letterbox is **cloned in place** and grows to scene size (a uniform translate+scale FLIP), its ink inverting to Sea Sand. An Espresso field opens from the letterbox's own rectangle (`clip-path`) to the full page. The sheet is held lower left at 0.55× scale. |
| 1.80 | 4 fold | The bottom third folds up (`rotateX` 0→178° about its top edge), then the top third folds down (0→−178°). The panels are real 3D faces with backs, under a 1400px perspective. Crease shading rises and settles, and the drop shadow tightens. |
| 3.00 | 5 flight | A three-point arc: ease-in off the hand (acceleration), ease-out into position (deceleration). The letter scales to the slot's width and wobbles through −5→9→−4→2→0°. The flap lifts just before arrival. |
| 3.90 | 6 slot | A clip fixed to the slot line **in world space** swallows the letter as it slides down, so it enters the box instead of shrinking. The flap springs shut (scaleY 0.15→1.12→0.96→1) and the body shivers (±0.8°). |
| 4.80 | 7 return | The letterbox and the Espresso field contract back into the small drawing, the form fields return, and the confirmation settles in. |

- **Compositor-friendly:** it animates transforms, opacity, `clip-path`, and the letterbox's two colour variables only. The drop shadow is a separate blurred element whose opacity and scale animate; there's no `box-shadow` animation.
- **Text never distorts:** the sheet keeps the textarea's width throughout phase 1, which is revealed with a clip rather than scaled, so the visitor's words never stretch or reflow.
- **Long messages:** the sheet shows as much as fits and fades out at the foot (`mask-image`). The sheet is fixed-size at every phase, so nothing overflows.
- **Resize or rotation mid-sequence:** every coordinate was measured at the start, so the timeline **completes instantly** (`controls.complete()`) rather than drifting out of place, and the page returns to its normal state.
- **Mobile:** the letterbox sits at the top and the sheet at the bottom, with the arc between them. Checked at 375×740 with no clipping or overflow.

### Delivery decoupling and honesty
- **The delivery request fires at submit** in parallel with the animation and never gates any phase. It never throws, and it times out after 15s.
- **Decision: "Posted." only ever follows a confirmed success.** When the timeline ends:
  - **success already known:** "Posted. It's in the box." and the form clears
  - **still pending:** a neutral "Posting…" stays until the answer arrives (tested at 8s latency: the sequence finished at 5.9s and "Posted." appeared at 8.05s)
  - **failure:** "Not posted." with the server's plain-language reason, and **the letter stays in the form** so nothing is lost
- **Accepted trade-off:** if delivery fails very early, the letter is still animated into the box before the honest failure notice. Branching the timeline on a network event would couple animation to latency, which the brief rules out.
- **No duplicate submissions:** while busy the form is `inert` and the submit handler returns early. Verified: a double click plus Enter produced exactly one request.

### Accessibility
- Labels are associated with their fields. Fields carry `aria-required`, `aria-invalid` and `aria-describedby` pointing at their errors. Errors are italic margin notes in Espresso, with an `↳` mark whose alt text is empty; there are no red boxes. An invalid submit focuses the first invalid field.
- A polite `role="status"` region announces "Sending your message…" and then the real outcome. **Focus lands on the confirmation** (`tabIndex -1`) when it's done. The sequence layer is `aria-hidden`.
- A honeypot field (`website`) is off-screen, `aria-hidden` and `tabIndex -1`.
- **Reduced motion, as one defined fallback:** no scene at all. The form cross-fades to 25% for about 200ms, then the same "Posted." / "Posting…" / "Not posted." confirmation appears. Fully functional (verified: 0.48s).
- `useReducedMotion` from Motion caused a **hydration mismatch** (the server says false, the browser says true). It was replaced site-wide with `lib/use-reduced-motion.ts` (`useSyncExternalStore`, server snapshot false), in Post, Shelves and Traces.

## Prompt 10 — Delivery backend and private content

### `/api/post`
- **Provider: Resend,** called over its REST API with `fetch`, so there's no SDK dependency. Credentials are read **only** in the route handler, from server environment variables:

  | Variable | Purpose |
  | --- | --- |
  | `RESEND_API_KEY` | Resend API key |
  | `POST_TO_EMAIL` | Where letters are delivered |
  | `POST_FROM_EMAIL` | A sender on a domain verified in Resend |

  Names only are documented in `.env.example`, which `.gitignore` now explicitly allows (the old `.env*` rule would have hidden it). Nothing uses a `NEXT_PUBLIC_` prefix.
- **Without credentials:** in development the letter is logged to the server console and treated as sent, so the full sequence can be tried locally. In production the route answers 502 with "The post box isn't connected yet." It never pretends to succeed.
- **Validation (Zod, independent of the client):** name 1–100 characters, a valid email up to 200, message 10–5,000. Every message is plain language, including for missing fields and non-object bodies, because Post announces them aloud.
- **Sanitising:** control characters are stripped; the subject line and reply-to get **newlines removed**, which prevents header injection; the body is plain text only.
- **Spam and abuse:**
  - A **honeypot**: a filled `website` field gets a silent 200 and nothing is sent.
  - A **per-IP sliding-window limit** of 5 letters per 10 minutes (429 with `Retry-After`). It's held in memory per server instance, which is proportionate for a personal site; swap in Vercel KV or Upstash if abuse ever appears.
  - Bodies over 20 KB are rejected (413).
  - A 10s provider timeout.
  - Non-POST methods get 405.
- **Responses** are always `{ ok: true }` or `{ ok: false, error }` with `Cache-Control: no-store`, exactly what the Post page consumes.
- **Tested:** valid (200), malformed JSON (400), missing and bad fields (400, plain language), honeypot (200, nothing sent), oversize (413), 6th request in the window (429), GET (405). **A real end-to-end email has not been sent:** that needs the owner's Resend key and a verified domain. Provider failure maps to 502 "The mail service refused the letter" or "couldn't be reached", which feeds Post's honest-failure state (tested with a mocked 502).

### Private authoring → public site
- **Approach: `draft: true` flags, filtered at build time and verified after it.** Chosen over a separate private repo or branch, which would be a second workflow to keep in sync, and over a gitignored-folder-only scheme, which offers no preview through the real layouts.
  - Drafts show in `next dev`, which is the private authoring environment: every layout, including drafts.
  - Every loader excludes drafts from production builds (MDX sections and `traces.json`).
- **The explicit publish step:** `npm run publish -- content/roads/my-essay.mdx` (or `traces:<id>`) removes the draft flag. Then review, commit and push; Vercel builds and deploys. `npm run publish -- --list` shows everything still held back.
- **Build-time safeguard** (`scripts/check-drafts.mjs`, runs as npm `postbuild`):
  1. It fails if `INCLUDE_DRAFTS=1` is set on a Vercel production deployment.
  2. It prints what is being published and **lists every draft held back**, so nothing disappears silently.
  3. It scans every prerendered file in `.next/server/app` and fails if any draft's route, title, or (for photos) alt text or caption appears.
  - **Tested:** a clean build passes (32 drafts held back, 189 files scanned). A planted leak fails with exit 1. `INCLUDE_DRAFTS` on production fails with exit 1.
  - It also caught a real false positive: New Beginnings shares placeholder image files with draft photos. Photos are now matched by their own words, not by a shared file path.
- **`content/private/`** is gitignored apart from its README. It's for local notes that should never leave the machine, and the build never reads it.

### Prompt 03 revision 2: size, depth, width, intro (2026-09-23, owner feedback)
- **Size restored:** the fixed 112px/unit camera from revision 1 shrank the prism on screens taller than 900px. The prism once again scales with viewport height exactly as the original 70svh stage did (a 320–736px frame over 5.63 scene units), while the stage itself stays shorter (clamp 17–42rem, 44svh) so the first screen still fits. The fallback illustration uses the same scale.
- **Stronger 3D:** the session tilt range was too shallow to always show depth (turn −12…−4°), so some sessions looked like a flat triangle. It is now turn −26…−16° and tip −9…−3°, and the glass is thicker (1.25 → 1.55 units), so the prism's side faces are always visible. The optics, label positions and cursor interaction all follow the new tilt automatically.
- **Full width:** the masthead and the homepage hero are no longer capped at `--page-max`. They span the page like the prism canvas, with the corner notes and path at the page edges (checked at 1440, 1920 and 2560 wide). Inner pages keep their reading widths.
- **Intro, "the light arrives":** on the first homepage view of a browser session, a `uReveal` uniform on each beam draws its leading edge along the light's path:
  - the white beam travels in (0.2–1.2s, steady speed)
  - it crosses the glass (1.2–1.5s)
  - the seven bands fan out and slow (1.45–2.65s)
  - each interest fades in as its band arrives (from 1.9s, 110ms apart)
  - The timing is keyed to the scene's first rendered frame, not page load, so a slow load never makes the labels run ahead of the light. Later visits in the same session start with the light already on (`sessionStorage` `prism-intro-played`); to replay on every visit, drop that check in `PrismStage`. There is no intro under reduced motion, and it costs nothing extra: one uniform write per beam per frame.

### Prompt 03 revision 3: glass, shadow, sharpness, alignment (2026-09-23, owner feedback against the reference)
- **Pose:** nearly face-on, like the reference: roll 2–5°, tip −7…−4°, turn −8…−4°, depth 1.3. Only a sliver of the base and right faces shows. Revision 2's heavy tilt made the prism look like a beige block, and it caused the misalignment below.
- **Glass:** clear and untinted `MeshPhysicalMaterial`: transmission 1, IOR 1.52, **`dispersion` 0.35** (chromatic splitting of whatever is seen through it), low roughness, and environment reflection turned **down** to 0.45. Face-on, a bright environment reflected straight back and blew the body out to white.
  - Rounded 0.075-unit bevels (6 segments) give the rims their highlights.
  - **The 1px Espresso edge lines are gone.** They were the jagged "rough" outline on zoom, and the reference has no drawn outline.
- **Paper backdrop (new, `Paper` in `PrismScene.tsx`):** an opaque plane behind the prism. It is opaque because three's transmission pass only sees opaque objects, so it is the thing that refracts through the glass. It paints exactly the page colour, through three's colour management so it matches whether seen directly or through the glass, plus:
  - paper grain that fades out from the prism, so the glass has texture to bend and the canvas still meets the flat page invisibly
  - a soft **contact shadow** from the prism's own outline (a triangle signed-distance field) cast down and to the right
  - a very faint warm caustic. It is faint on purpose: at full strength the glass magnified it into a white blob.
- **Alignment:** the light is drawn at z = 0.32 × depth, toward the front face, instead of on the centre plane. Seen from the front, it enters at the left face and leaves at the right face where the eye reads the glass surface. Label projection and the cursor-interaction plane use the same z.
- **Sharpness on zoom:** the render resolution cap rose from 1.75× to **2.5×** device pixels (low tier 1.25× → 1.5×), so browser zoom and high-DPI screens stay crisp; at 3× the buffer is now 3600px across a 1440px stage. Measured **60 fps with no frame over 17ms** at 1440×900 and 2560×1440 at 2× (a 5120×1267 buffer), including under 4× CPU throttling, on an RTX 4060 laptop.

### Prompt 06 revision: physics, force and shadows; "Personal" → "Current Reads" (2026-09-23, owner feedback)
- **"Personal" is now "Current Reads"** (the category enum and the three sample books, now sample `book` entries with an author).
- **A per-shelf simulation replaces the independent Motion springs** (`lib/shelf-physics.ts`, pure and testable, driven by one rAF loop per shelf in `Shelf.tsx`):
  - **Mass:** each book's mass comes from its size (0.7 + area share × 0.9), so large books move slower and heavier. Springs: stiffness 240, ζ 0.62.
  - **Neighbours lean into a gap:** a pulled-out book lets the books on either side tip toward it, up to 3.2°, scaled by how far it's out. Measured ±1.41° on the neighbours of a pulled book.
  - **Force from the hand:** the cursor's horizontal speed pushes the spines it passes (an impulse on their tip velocity, capped and divided by mass). A fast sweep rocks books about 2° and they settle within about 300ms.
  - **A knock on return:** a book pushed back hard (pull velocity < −60px/s) knocks both neighbours in opposite directions.
  - **The loop sleeps** once every book is still and the hand has left: 0 animation frames per second when settled (measured). It wakes on pointer movement, focus or touch.
  - **Keyboard focus and touch** hold a book in its "pulled" pose through the same simulation. **Reduced motion** applies poses instantly, with no impulses and no ringing.
- **Shadows:** each book casts a soft shadow on the back of the case (a pre-blurred element; only its transform and opacity animate), with light from the upper left, consistent with the prism. As the book comes forward the shadow shifts, spreads and lightens; the contact shadow on the plank fades as the book lifts. **Real bug fixed:** the first attempt's stylesheet edit never applied (its match text didn't match the file's formatting), so the shadow element had no class; caught by inspecting computed styles.
- **Overlap fixes (from the owner's screenshot):**
  - A leaning book used to rotate about its bottom centre and cut into its neighbour. It now pivots on its **bottom-left corner**, with a left gap of exactly `height × sin(|lean|)`, so its top rests against the neighbour.
  - A pulled-out book used to paint *behind* its right-hand neighbour, because each book is flattened into its own layer and painted in DOM order. Its slot's `z-index` now rises with how far it's pulled.

### Homepage revision 4: scroll morph, motion blur, footer (2026-09-23, owner request)
- **Footer:** the "to understand…" note and the "Bathinda → Bengaluru → World" path moved out of the first screen's corners into a full-width homepage footer (note left, path right, hairline rule above).
- **Scroll morph** (`components/home/ScrollMorph.tsx`, about 100 lines, no animation library on the homepage). Over the first 85% of the hero's height:
  - "Why I'm here" (the real `h1`) **flies and shrinks into the manifesto's title slot**. The slot is an `aria-hidden` twin in the same face and line height, so a translate+scale from the top-left corner lands it exactly: within 1px, measured at 1440 and 375 wide.
  - The prism recedes at 0.35× scroll speed, shrinks 14% and dissolves; the top note and scroll cue fade early; the manifesto rises 32px into place.
  - A smoothstep eases the whole morph. Measurements redo on resize and when web fonts load.
- **Motion blur:** scroll speed (px/ms, smoothed) drives an SVG `feGaussianBlur` with `stdDeviation="0 N"`. It blurs only vertically, in the direction of travel, up to 8px, only while the morph is in play, and is removed entirely once scrolling stops (verified 5px during a fast wheel scroll, none after).
- **Cost:** one rAF loop, woken by scroll and asleep when the page is still. It writes transforms and opacity only, plus the filter while blurring.
- **Reduced motion or no JavaScript:** nothing moves, there's no blur, and the title slot is `display: none`, so the page is simply the hero followed by the manifesto (verified).

### Homepage revision 5: centring and the journey footer (2026-09-24, owner feedback)
- **Centring:** from 48rem up, the hero is a 5-row grid (`1fr · stage · heading · 1.15fr · cue`), so the prism and heading sit together at the optical centre of the first screen, with the cue at the foot. At 1920×1009 the stage now spans 220–664px and the heading 680–802px (they were at 146–589 and 605–727). The scroll morph measures positions live, so it needed no change.
- **Journey** (`components/home/Journey.tsx`), replacing the plain path list in the footer: a 640×110 line drawing with a 12s loop that runs only while visible.
  - A **car** drives a road into **Bathinda** (a pin drops with a small bounce), squashes into a **train** that runs a sleepered track, then lifts off as a **plane** on a dashed contrail arc.
  - The plane touches down level at **Bengaluru** (second pin), takes off again, and flies on to a globe at **World**. The ink fades and the loop restarts.
  - The places stay a real visually hidden `<ol aria-label="Path">`. **Reduced motion** shows the finished route with no vehicle. Place names come from `content/home.ts`; any count other than 3 falls back to the plain list.
- **Footer note overflow:** the owner's screenshot showed the note clipped at the left edge. The current build places it 48px in with no overflow at 1920 wide. The screenshot most likely came from a stale reload in the middle of the footer change, and the other session's `.footerNote` rules (`max-width`, `padding-left`, `overflow: hidden` on the footer) are kept.
- **CSP (from another session):** `next.config.ts` now sends a Content-Security-Policy. Its `script-src` lacked `'unsafe-eval'`, which React's development build needs, so dev showed a console error and the "1 Issue" badge. `'unsafe-eval'` is now added in **development only**; production is unchanged.
- **Two sessions:** another Claude session (`portfolio-f6`) edited this repo in parallel (security headers, a git repository, a `RouteAnimation` on `/traces`). It was told which files this session was changing. **Open question for the owner:** there are now two route animations, the homepage footer journey and `/traces` `RouteAnimation`; keep one.

## Traces revision: film reels (2026-09-24, owner request)
- **Two curved reels replace the editorial grid** (`components/traces/Reels.tsx`, physics in `lib/reel-physics.ts`, pure). The cinematic viewer from `Gallery.tsx` is reused, exported as `Viewer`.
- **Film:** each frame is an Espresso film cell with sprocket holes *cut out* by an SVG mask (the page colour shows through, from the token), an edge number ("03A" / "03B"), and the photo inset, cropped to the frame. The strips run full-bleed. Frames bend around a vertical cylinder (radius ≈ 0.95 × the stage width, via `translate3d` + `rotateY` under a 1400px perspective). The top reel bows up at its ends and the bottom reel down, so they curve apart.
- **Motion and physics:**
  - Wheel and trackpad (either axis) push the film. The page doesn't scroll while the pointer is over the reels, and scrolls normally everywhere else.
  - Dragging either strip moves it with the pointer; dragging the lower one drives the upper one inversely.
  - On release the film keeps its momentum, slows with friction (half-life ≈ 0.2s), and below 90px/s the nearest frame pulls it into place with a slightly underdamped spring.
  - The **lower reel counter-runs** at 0.82× through a spring, so it lags and catches up.
  - **Speed shows:** frames skew (up to ±9°) and each strip gets a horizontal motion blur (an SVG Gaussian, x axis only, up to 6px), both gone at rest.
  - **Infinite:** frames wrap modulo the strip span, with enough copies to cover a wide screen. After 2.5s without input the film eases into a slow run (22px/s).
  - The loop runs only while the reels are on screen and the tab is visible.
- **Details:** as a frame reaches the centre, the details in the gap between the reels (frame number, caption, place · date, camera · lens · exposure) scramble through random glyphs and resolve left to right, each line slightly after the one above. A polite live region announces the final text once, 600ms after it settles.
- **Accessibility:**
  - Every photograph appears once as a real, focusable `<button>` labelled with its alt text; duplicate frames are `aria-hidden` and untabbable.
  - Focusing a frame brings it to the centre, ←/→ step between frames, Enter opens the viewer, and closing returns focus to that frame.
  - **Reduced motion:** no drift, inertia, skew, blur or scramble. The film moves a whole frame at a time and the details appear directly.
- **Verified** (Chrome, dev build): at 1920×1009 and 390×844, the details clear both reels, with no horizontal overflow and no console errors. Fling, drag, keyboard, viewer and idle-drift behaviours were all checked.
- **Global:** `html { overflow-x: clip }` absorbs the scrollbar-width overhang of 100vw full-bleed elements. It uses `clip`, not `hidden`, so sticky positioning still works.

### Revision 6: reels fixed, trail, footer, phone labels, prism +4% (2026-09-24, owner feedback)
- **Traces route animation:** removed; the homepage footer journey is the one route drawing (answers the open question above).
- **Reels actually animate.** Two real bugs:
  - Frames rendered as solid brown blocks: a `<button>` defaults its grid items to `align-items: flex-start`, so the sprocket rows and the picture collapsed to 0px. `.frame` now sets `align-items: stretch`.
  - Frames were rotated the wrong way round the cylinder (`rotateY(-θ)`), which produced a sawtooth of overlapping cells. The tangent of a convex drum needs `+θ`.
  - The idle run was too slow to read as motion. It now starts after 1.5s (was 2.5s) at 48px/s (was 22px/s). The loop also restarts on `visibilitychange`; before, a page opened in a background tab never started.
- **Wanderings trail** (`components/wanderings/Trail.tsx`): a dotted footpath, measured from the laid-out leaves, runs from under each leaf to the top of the next and sits behind the paper. It is seeded, so its shape stays stable, and redrawn on resize and once fonts load. A mask inks it in once, top to bottom (2.6s). With reduced motion it is shown complete.
- **Footer balanced:** from 56rem up, the note and the journey (32rem) form one group centred on the page with a fluid gap, instead of two 40rem columns pushed to the window edges. Below 56rem they stack, centred.
- **Interests beside the prism on phones:** the labels are absolutely placed at every width. Phones use a label column at 66% of the width (74% on wide screens), 10px type and a 19px minimum gap. The whole scene shifts 14% of the width to the left (`narrowShift` in `lib/prism-optics.ts`, applied to the camera and to the drawn fallback alike), so the fan has room before the words.
- **Prism 4% larger:** `PRISM_SCALE = 1.04` in `lib/prism-optics.ts` scales the camera framing (both branches) and the fallback illustration. Bands still end exactly at the labels, because the layout is solved against the same camera.
- **Banner:** its natural home is the share card it already is (`app/opengraph-image.jpg` / `twitter-image.jpg`, 1280×720, with alt text). Placing it on a page would repeat the masthead wordmark and the tagline. `banner.png` at the repo root is the source.

### Revision 7: motion blur transitions, Traces leader, LinkedIn and X send-offs (2026-09-24, owner request)
- **Page transitions, site-wide** (`app/globals.css`, `lib/site.ts`): the old page slides off and smears (240ms: blur up to 7px plus a 3% horizontal stretch, which reads as motion blur). The new page arrives from the other side, blurred to 9px, and comes into focus as it lands (520ms). Direction follows the nav order: `pageDirection()` tags each nav link `page-forward` or `page-back`, and the CSS reads the tag with `:active-view-transition-type()`. Verified: both types fire, and both leave and arrive animations run. List rows (`.stagger`) also rise in from a 5px blur. Reduced motion keeps the short fade.
  - Headless Playwright Chromium captures the Post page's old snapshot as a squashed strip, probably because of the letterbox's 3D scene. Installed Google Chrome captures it correctly, and the pseudo-element geometry is right, so there's nothing to fix in the site.
- **Traces leader** (`components/traces/Leader.tsx`), laid out from the owner's sketch: the background-removed photo (cropped to `public/traces/figure.webp`, 585×619, 60KB) stands on the upper reel, with its crop line tucked behind the film strip (the stage now sits above it at `z-index: 1`). "A Cartographer of / the Unseen" sits beside it in `--font-fountain`, the site's own hand and the closest match to the banner's script.
  - Motion: on arrival, the figure rises out of the film from a blur and the line writes in from left to right. On scroll, the group sinks back into the film and blurs (a scroll-driven `view()` timeline where supported).
  - The "Scroll or drag the film" hint moved below the reels. The flat full banner stays only as the share card.
- **Elsewhere, on the Post page** (`components/post/Elsewhere.tsx`): LinkedIn and X buttons. Each is a real link, so middle-click, modifier-click and no-JS go straight through. A plain click plays a send-off, then follows the link in the same tab (a delayed new tab would be popup-blocked). "Go now" and "Stay here" are always available, and Esc cancels.
  - LinkedIn: corporate blue. "I aM ThriLLed To AnnOunce that You are GoiNg to My LinkEdIN" tumbles in letter by letter, then Celebrate / Insightful / Love chips pop in (3.4s).
  - X: a late-night studio in the palette of the Rogan-podcast smoking photo (near-black, warm amber, ember orange, ash-grey smoke). An ember glows, turbulent smoke curls up, and the X condenses out of the haze (3.6s). Palette only, with no figures.

### Revision 8: real content, heatmaps, article view, recoloured X clip (2026-09-24, owner request)
- **Traces:** 15 of the owner's astrophotographs (moon, sun, Saturn, M42, a comet) from the local Photography folder, resized to 1800px (1MB in total) in `public/traces/photos/`. Dates come from filenames where they exist. The placeholders are gone. Skipped: tiny files, duplicates, annotated screenshots and a NASA story capture. Instagram (@_spaceflora_) can't be scraped without logging in (it blocks anonymous access); several local files are already Snapinsta downloads from that account.
- **Projects:** 15 entries from github.com/SatnamCodes, written from each README. Skipped: forks, the profile config repo, and SatQuery and defect-rag, which have no README or description to summarise honestly. Status is "in progress" for repos pushed recently.
- **Heatmaps** (`components/projects/Heatmaps.tsx`, `lib/activity.ts`): GitHub (contribution calendar HTML), LeetCode (public GraphQL `submissionCalendar`) and Codeforces (`user.status` API), fetched on the server and revalidated every 12h. Each map covers the last 53 weeks in Espresso tints, with levels set by that source's own quartiles. On phones it scrolls sideways, starting at the latest week. A source that fails shows "Unavailable right now" instead of breaking the page.
- **Books:** *Programming Massively Parallel Processors* (Hwu, Kirk, El Hajj; Morgan Kaufmann, 4th ed., 2022), *Mathematics for Machine Learning* (Deisenroth, Faisal, Ong; CUP, 2020), *Introduction to Algorithms* (CLRS; MIT Press, 4th ed., 2022) and, in Current Reads, *Crime and Punishment* (Dostoevsky, 1866). `bookSchema` gained optional `published` and `link` fields, which the reader shows under the author.
- **"Plain type" is now "View as article" / "View as notebook"** (same stored preference). On Shelves the book dialog becomes a full-window, single-column web article: serif body at a 42rem measure, no ruled paper, no pages, no crease, no cover flap. Wanderings entries use the same label.
- **X send-off:** the owner's smoking clip, recoloured frame by frame with a three-tone gradient map (#1c1210 → #7d4e3a → Sea Sand), saved as `public/post/x-smoke.gif` (2.5MB) and as an animated WebP (300KB) that the page actually loads. The X mark condenses over it, then the browser goes to X after 4.2s.

### Revision 9: reels fit, reels on film, X clip without logo, SEO/AEO system (2026-09-24, owner request)
- **Reel frames** use `object-fit: contain` on black, so a whole moon or sun always fits the cell. The black letterbox reads as sky.
- **Video reels:** two Instagram reel downloads (`traces/*.mp4`) and one local montage (#NASAMoonSnap with NASA Artemis's reply), transcoded to 720p muted H.264 (0.45–0.84MB each) with poster frames. A frame plays only while it's on screen; the viewer shows the clip with controls. Instagram itself can't be fetched (401 without login).
- **X send-off:** the X mark over the clip is removed.
- **SEO/AEO:** see `docs/SEO_*.md` and `docs/SEO_IMPLEMENTATION_REPORT.md`.
- **Pronouns:** alt text no longer uses "his"; the owner's pronouns aren't stated.

### Revision 10: GitHub Pages mirror (2026-09-24, owner request)
- `GITHUB_PAGES=1` switches `next.config.ts` to `output: "export"`, `basePath: /portfolio`, `trailingSlash` (directory indexes), no headers, and a custom image loader (`lib/image-loader.ts`) that serves images unoptimised under the base path. Raw `<img>`/`<video>` URLs go through `asset()` (`lib/base-path.ts`).
- Metadata routes are `force-static`. Detail routes use `staticParams()`, which emits a placeholder only for an all-draft section on Pages; the workflow deletes it.
- The letter form posts to `NEXT_PUBLIC_POST_URL` (the Vercel endpoint) on Pages; `/api/post` answers CORS only for `POST_ALLOWED_ORIGINS`.
- Verified locally: the export serves under `/portfolio` with no failed requests or console errors, the Vercel build is unchanged, SEO tests pass, and CORS allows github.io and refuses other origins.
