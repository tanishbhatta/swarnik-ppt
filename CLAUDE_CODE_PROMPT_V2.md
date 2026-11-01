# Swarnik pitch deck v2: typography-first rebuild

You are rebuilding the HTML presentation for a 3-minute school pitch (Sci-Pitch, Trinity International SS & College, Kathmandu). The prelim is **tomorrow, 2 November 2026**. Two students present: **Jebisha** and **Tanish**. The product is **Swarnik**, a Windows app: hold one key, speak mixed Nepali and English, and it types chat-style Roman Nepali wherever the cursor is.

A first version (v1) already exists in this folder. The owner rejected it because **the typography and visual style are bad** and **the content doesn't follow the official slide brief**. Your job is a complete redesign of the deck (not the app).

The owner may not be watching. **Never stop to ask questions.** Make a sensible decision, write it down in `REPORT.md`, and keep going. Aim to finish in about **2.5 hours**, and **commit to git after every phase** so the latest commit is always presentable.

---

## 1. Read these first

- `reference/v1_slide1.png`: a screenshot of v1. **This is what not to do.**
- `reference/brief.png`: the organisers' official "What to present" slide. (Its full text is in section 3.)
- `assets/screenshots/`: four **real screenshots** the owner made. They are the evidence for slides 2 and 4:
  - `english_voice_google.png`: English voice typing (Google) heard the sentence as "oye ostiko homework what I dinner".
  - `nepali_voice.png`: a Nepali voice typing tool wrote "ओइ अस्तिको होमवर्क पठाइदेन".
  - `wispr_flow.png`: Wispr Flow (AI voice typing) wrote "ओइ, अस्तिको homework पठाइदे न।".
  - `tiktok_comments.png`: real TikTok comments written in Roman Nepali (usernames and profile pictures already hidden).
  They are already cropped. **Use them exactly as they are. Never retouch, re-crop in a way that changes meaning, or "improve" what they show.**
- The existing v1 files (`index.html`, `content.js`, `css/`, `js/`, `blender/`, `assets/`). Reuse the infrastructure (fonts folder, Blender scene, keys, presenter window). **Throw away the visual design.**

### Why v1 failed (fix every one of these)
1. **No hierarchy.** Every line was the same size and weight, so the eye didn't know where to start.
2. **Low contrast.** Mid-grey text on near-black. On a projector in a lit school hall it washes out.
3. **Broken sentences.** Short sentences were chopped into 3-line fragments, and "=" was used as a word ("= a message you didn't type").
4. **No structure.** No section label, no footer, no grid anchors. The text floated on the left, a small dark phone floated on the right, and a big dead gap sat between them.
5. **Template feel.** One generic grotesk at huge size with nothing else. It looked like a default.
6. **Wall of text.** Earlier beats piled up in grey, so by the last beat the slide was a paragraph.
7. **Weak figure-ground.** A dark phone render on a dark background disappeared.

---

## 2. Before you start (Phase 0, ~10 min)

1. `git status`. Commit anything uncommitted as "v1 state before rebuild".
2. Create a branch: `git checkout -b v2`.
3. **Keep v1 as a fallback**: copy v1's `index.html`, `presenter.html`, `content.js`, `css/`, `js/` into a folder `v1/`, and fix the relative asset paths inside `v1/` (e.g. `../assets/...`) so `v1/index.html` still opens and works. Commit: "Keep v1 as fallback in v1/".
4. Build v2 at the root, reusing `assets/` (fonts, screenshots, video) and `blender/`.

If this folder turns out to be empty (no v1), create the structure in section 9 from scratch and build the Blender scene described in section 6.

---

## 3. The official brief (follow its order and its questions)

| Slide | Title | Questions it must answer |
|---|---|---|
| 1 | **Idea** | Idea or product name. Team name and members. One-line description of the idea. |
| 2 | **The Problem** | What problem are you solving? Who experiences it? Why does it matter? Include an example, observation, or survey finding. |
| 3 | **Your Solution** | Explain your product or service. Show a sketch, diagram, or prototype. Explain how it works. |
| 4 | **Target Users** | Who will use or buy your product? Where can you find these users? What evidence shows they need your solution? |
| 5 | **Science and Innovation** | Which scientific concepts do you apply? What makes your solution useful or different? How will you build and test it? |
| 6 | **Business Model (Optional)** | Estimated cost of making one unit. Proposed selling price. How the business will earn money. Potential customers and sales channels. |
| 7 | **Potential Benefits** | Benefits for users and the community. Environmental, social, or economic impact. Potential for future growth. |
| 8 | **Conclusion and Pitch** | Why should people support your idea? What are your next steps? End with a clear, memorable statement. |

Rules for using it:
- Use these sections **in this order**. Each slide shows its section name as a small label in the header (judges score with this list in front of them, so they should be able to tick each section off).
- **Do not copy the organisers' look** (red band, circles). Follow the structure, not the style.
- Slide 6 is optional. It exists in `content.js` with `enabled: false`. When it's disabled, it's skipped everywhere (navigation, numbering, print), and the numbering becomes 01–07.
- The live demo happens inside slide 3 as a full-black beat. It is not a separate slide.

---

## 4. Design system

### 4.1 Direction
**Editorial and Swiss**: a strict grid, real typographic hierarchy, flat colour, hairline rules, generous white space. Think of a well-designed book or magazine spread, or a product keynote on a light background. References for feel (not to copy): Swiss International Typographic Style, Stripe Press book design, Pentagram presentation decks, Apple product slides on light backgrounds.

The deck should read like it was **set by a typographer**, not generated.

### 4.2 The type system has meaning (this is the core idea)
The product turns **speech** into **typed text**. The typography shows this difference everywhere:

| Role | Typeface | Used for |
|---|---|---|
| **Statements** (our voice as presenters) | **Instrument Sans** (variable: weight + width) | Headlines, labels, body, tables |
| **Spoken words** (what a person says out loud) | **Instrument Serif Italic** | Quotes: “oye asti ko homework pathaidena”, the hook, “Tapai bolnus.” |
| **Typed text** (anything typed: by people in chats, by other tools, by Swarnik) | **IBM Plex Mono**, with Devanagari characters falling back to **Noto Sans Devanagari** inside the same string | Tool outputs on slide 2, chat comments on slide 4, Swarnik's output. **Only Swarnik's own output also gets the `--typed` colour.** Everything else typed stays `--text`. |
| **Devanagari** on its own | **Noto Sans Devanagari** | होमवर्क, the speech model's Devanagari output |

The closing slide pays this off: "Tapai bolnus." (you speak) is set in serif italic, and "Swarnik lekhxa." (Swarnik writes) is set in mono, in the `--typed` colour.

**Fonts must be bundled locally** (the deck runs offline from `file://`):
- `npm pack @fontsource-variable/instrument-sans @fontsource/instrument-serif @fontsource/ibm-plex-mono @fontsource/noto-sans-devanagari` (one at a time if needed), extract, copy the needed `.woff2` files into `assets/fonts/`.
- Instrument Sans: prefer the file that contains both `wght` and `wdth` axes. Check its axes with fontTools (`fvar` table). If only `wght` exists, use that and drop the width settings.
- Instrument Serif: regular + italic. IBM Plex Mono: 400 and 500 (Latin). Noto Sans Devanagari: 400 and 600 (Devanagari subset).
- `@font-face` with relative URLs and `font-display: block`.
- **Verify fonts actually load**: in the test script, check `document.fonts.check()` for every family at the sizes used. A silent fallback to system fonts is a failure.
- **Never rely on font glyphs for arrows, ticks or crosses** (the Latin subsets don't include →). Draw them as inline SVG with a 2px stroke in `currentColor`.

### 4.3 Type scale (px at 1920×1080; nothing else)
| Token | Size / line-height | Use |
|---|---|---|
| `label` | 20 / 1.2, mono 400, letter-spacing +0.02em | Header, footer, captions, tags, sources |
| `small` | 28 / 1.3, sans 400 | Secondary text, sub-lines, verdicts |
| `body` | 36 / 1.3, sans 400 | Table values, notes, typed outputs |
| `sub` | 48 / 1.15, sans 500 | Column titles, step titles |
| `quote` | 64 / 1.12, serif italic | Spoken quotes |
| `headline` | 80 / 1.04, sans 600, width ~88%, letter-spacing -0.02em | One headline per slide |
| `statement` | 112 / 1.02, sans 600, letter-spacing -0.025em | Big claims, big figures |
| `wordmark` | 240 / 0.95, sans 650, letter-spacing -0.04em | "Swarnik" on slide 1 only |

Rules:
- **At most 3 sizes per slide**, plus `label`.
- **Nothing the judges must read is smaller than 28px.** `label` is only for header, footer, captions and tags.
- Headlines: max 2 lines, max ~10 columns wide, `text-wrap: balance`. Body: `text-wrap: pretty`. **No orphan words, no sentence chopped into fragments.**
- Sentence case everywhere, labels included. No all caps.
- Real punctuation: curly quotes “ ” and apostrophes ’, the middle dot ·, an en dash for ranges. Never "=" as a word.
- Numbers: `font-variant-numeric: tabular-nums lining-nums`.
- Devanagari: render about 1.1× the Latin size next to it (it looks smaller optically), `line-height` ≥ 1.5, and **check that no matra or descender is clipped**.

### 4.4 Colour (flat fills only)
Two themes, switchable with the **D** key and set in `content.js` (`theme`). **Default: `paper`**, because a light background stays readable on a projector in a lit hall.

| Token | `paper` (default) | `ink` (dark rooms) | Use |
|---|---|---|---|
| `--bg` | `#F3EFE7` | `#121212` | Background |
| `--text` | `#141414` | `#F1EDE4` | All primary text |
| `--text-2` | `#5C5852` | `#A29C92` | Secondary text, captions (contrast ≥ 4.5:1) |
| `--rule` | `#D6CFC2` | `#2C2C2C` | 1px hairlines, inactive progress, screenshot borders |
| `--accent` | `#B3302A` | `#E04A3E` | Markers only: current-beat rule, ✕ marks, wavy "wrong" underlines, index numbers. **Use sparingly.** |
| `--typed` | `#0E6B60` | `#4FC1B1` | **Only** for Swarnik's own output (mono text) |

The demo beat is pure `#000000` in both themes.

### 4.5 Grid and frame
- Stage: 1920×1080, scaled to fit any screen and letterboxed with `--bg` (or black on the demo beat).
- Margins: 128px left and right, 96px top, 88px bottom. **12 columns**, 32px gutters (each column ≈ 109px). 8px spacing unit; every spacing value is a multiple of 8.
- **Header** (fixed, top 56px): left: section number in `label` + `--accent` (e.g. `03`), 16px gap, section name in `label` + `--text-2` (e.g. `Your solution`). Right: `Swarnik · Sci-Pitch 2026` in `label` + `--text-2`.
- **Footer** (fixed, bottom 48px): left: a progress row of one 40×3px segment per enabled slide (8px gaps): done = `--text`, current = `--accent`, future = `--rule`. Right: `03 / 07` in `label`.
- Header and footer **never animate**. They anchor the deck.
- **Headline position is identical on every slide**: column 1, top of text at y = 192px. The eye always knows where to look.
- At least **40% of each slide is empty** (slide 2's evidence beat may go lower, but never cramped). At most **~30 words of our own text visible** at once.
- Renders and screenshots sit in their own columns and never sit under text.

### 4.6 Beats: the screen follows the speech
Each slide is a sequence of **beats**. The presenter presses Space as each line is spoken, and the next **component** appears: a row, a card, a column, a step, a figure. The on-screen words echo the key words of the spoken line, so the screen moves in parallel with the speech.

- Revealed components **stay at full strength**. (Don't grey them out like v1.)
- The **newest** component gets a 3px × 40px `--accent` rule on its left edge (or top edge, for columns and cards). The rule moves to the next component on the next beat. That's the only "you are here" cue.
- Components stack **downward** (or fill columns left to right).
- When a slide changes "view" inside the same section (slide 1 beat 2, slide 3 after the demo, slide 4 beat 4, slide 8 beat 2), use a FLIP move: the kept element glides to its new spot and shrinks, the rest fades. 600ms.

### 4.7 Motion
- Component reveal: opacity 0→1 plus translateY 12px→0, 420ms, `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- Slide change, **moving down**: the current slide's content moves up 48px and fades out (280ms), then the next slide's content comes in from +48px and fades in (480ms). The header label and footer progress update instantly.
- Renders: fade in 500ms. Optionally settle from scale 1.02 to 1.
- Respect `prefers-reduced-motion` (then use opacity only).
- Nothing else moves. No loops, no idle animation.

### 4.8 Hard bans
- CSS gradients of any kind, gradient text
- glow, text-shadow, box-shadow halos, blur, backdrop-filter, glassmorphism
- particles, floating dots, animated grids, perspective floors, noise overlays
- emoji, icon packs, clip-art, stock illustrations
- rounded "cards everywhere" (corner radius ≤ 2px, and only on tags)
- bouncy/elastic easing, spinning, pulsing, typewriter effects, looping animation
- centred-everything layouts (left-align to the grid; centre only the closing line if it looks clearly better)
- grey-on-black low-contrast text
- invented numbers, fake logos, fake testimonials, lorem ipsum

---

## 5. Slide-by-slide layouts

All layouts sit inside the frame from 4.5. Column numbers refer to the 12-column grid.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 03  Your solution                                Swarnik · Sci-Pitch 2026 │  header
│                                                                        │
│ Headline here, two lines at most,                 ┌──────────────────┐ │
│ always at the same position.                      │  render          │ │
│                                                   │  columns 8–12    │ │
│ ▌component (newest has the accent rule)           │                  │ │
│  component                                        └──────────────────┘ │
│  component                                                             │
│                                                                        │
│ ▬ ▬ ━ ▬ ▬ ▬ ▬                                                   03 / 07 │  footer
└────────────────────────────────────────────────────────────────────────┘
```

**01 · Idea**
- Beat 1: only the hook as a `quote` (serif italic, 64px), columns 1–8, vertically centred. No render.
- Beat 2 (FLIP): the hook glides up to y = 192 and shrinks to `small` in `--text-2`. The wordmark "Swarnik" appears (`wordmark` size), with the one-line description under it in `body` (columns 1–7). The team block sits bottom-left above the footer: team name, members joined with " · ", school, all in `label` (hide any empty field). The keycap render comes in on the right, large (columns 8–12).

**02 · The problem** (the evidence slide: three real tools, worst to best, all miss)
- Beat 1: headline.
- Beat 2: `label` "We said one normal sentence", then the sentence as a `quote` (columns 1–8).
- Beats 3–5: three **evidence cards**, one per beat, in three columns (1–4, 5–8, 9–12), separated by vertical hairlines. Each card, top to bottom:
  1. the tool name in `label` + `--text-2`,
  2. **the tool's exact output, typeset large** (mono, `body` size; Devanagari falls back to Noto Sans Devanagari at ~1.1×). Copy it from `content.js`, which matches the screenshot character for character,
  3. the wrong parts marked with a flat `--accent` wavy underline (`text-decoration: underline wavy`, 2px, `text-underline-offset` ~8px), only on the substrings listed in `wrong`,
  4. the real screenshot below as **proof**: small (max 160px tall, aspect ratio preserved), 1px `--rule` border, no shadow, no rounding,
  5. a one-line verdict in `small` with an SVG ✕ in `--accent`.
  The typeset output must be readable from the back of a hall. The screenshot only proves it's real.
- Beat 6: a full-width row under the cards: `label` "How we actually write", then the sentence in mono `sub` size, `--text` colour (it's how people type, not Swarnik's output yet).

**03 · Your solution** (two views + the demo)
- View A, beat 1: headline "Swarnik is a Windows app." A tag "Working prototype" (1px `--text` border, `label` text, padding 8×12, radius 2px). The laptop render on the right, large (columns 6–12, may bleed into the right margin).
- Beat 2: a sequence row (columns 1–7): "Hold one key" → "Speak" → "It types where your cursor is", in `sub` size, with SVG arrows.
- Beat 3: **demo**. The whole stage goes pure black, header and footer included. No text, no sound, nothing focusable.
- View B (FLIP from black), beats 4–6: headline "How it works". Three numbered columns (1–4, 5–8, 9–12), one per beat, separated by vertical hairlines. Each column: number in `label` + `--accent`, title in `sub`, a tag ("Borrowed" with a `--text-2` outline, or "Ours" with a `--text` outline and bold text), then the sample:
  1. the real Devanagari output (Noto Sans Devanagari)
  2. होमवर्क, an SVG down-arrow, then `homework` in mono + `--typed`
  3. the final Roman output in mono + `--typed`

**04 · Target users**
- Beat 1: headline + column 1. Beats 2–3: columns 2 and 3 (three columns: 1–4, 5–8, 9–12). Each column: title in `sub`, description in `small`, the platform in `label` + `--text-2`.
- Beat 4 (FLIP): the three columns compress upward into one tight row, and an **evidence block** fills the lower half.
  - If survey numbers exist: the figure "X of Y" in `statement` size, label in `body`, source in `label`.
  - **If they're empty (the current default):** left (columns 1–7): three real comments, typeset in mono `body` size, one per line, separated by hairlines, verbatim from `content.js` (no usernames, no emoji). Underline the whole words listed in `underline` ("cha", "xa") with a 3px `--accent` underline, because that's the spelling difference the speaker points out. Right (columns 9–12): the TikTok screenshot as proof, up to 520px tall, aspect ratio preserved, 1px `--rule` border, caption in `label`: "TikTok comments".

**05 · Science and innovation** (now about testing)
- Beat 1: headline "Tested on how we really talk." Under it, two figures side by side in `statement` size: **450** ("real sentences we actually say") and **76%** ("of words right"), with `small` labels and a 1px vertical hairline between them. A badge bottom-left: "No ChatGPT inside" (1px `--accent` border, `label` text in `--accent`). Keep the slide calm: these two numbers are the slide.
- Beat 2 is **off by default** (`enabled: false` on the beat). When switched on, it shows the hidden-‘a’ transformation: **घर** (Devanagari, ~200px) → **gha·ra** (sans, `statement`, `--text-2`, 4px `--accent` strike) → **ghar** (mono, `statement`, `--typed`), with captions "written", "letter by letter", "how we say it". Build it so it works when switched on.

**06 · Business model** (`enabled: false` by default)
- Beat 1: headline "Free for students." plus a 3-row hairline table (Cost per user, Price, How people find it).

**07 · Potential benefits**
- Beat 1: headline + row 1 of a 2-row hairline table (who | benefit). The phone-keyboard render on the right.
- Beat 2: row 2.
- Beat 3: a timeline (columns 1–7): a 1px rule with three flat 12px dots, labelled "Today", "Next", "Then" (`label`; `--accent` on the current stop "Today"), titles in `body`. In the third stop, "xa · cha · chha" is set in mono + `--typed`.

**08 · Conclusion and pitch**
- Beat 1: `label` "Next step" in `--accent`, then the headline "100 students try it and break it, before 22 November."
- Beat 2 (FLIP): the headline shrinks to `small` + `--text-2` at the top. The statement appears in `statement` size: "We didn’t ask anyone to change how they write. We made the computer catch up."
- Beat 3: everything clears except the header and footer. Left-aligned at column 1, vertically centred: "Tapai bolnus." in Instrument Serif Italic (~150px, `--text`), and under it "Swarnik lekhxa." in IBM Plex Mono (~128px, `--typed`). Names bottom-left in `label`: "Jebisha · Tanish".

---

## 6. 3D renders (realistic, supporting the type, never competing)

Reuse `blender/build_scene.py` and `blender/scene.blend` from v1 if they exist. If they don't, build a procedural scene (no downloaded models): a modern slab phone (~71×147×8 mm, satin aluminium frame, glass front, precise bevels ≈0.4 mm), a thin aluminium laptop (~304×212×15 mm, lid ~110°), and a 1.5u PBT keycap (slightly dished top, fine texture, matte) on a short strip of keyboard deck.

**v2 renders are transparent, with real shadows**, so they sit on either theme:
- `scene.render.film_transparent = True`, plus a floor plane with `is_shadow_catcher = True`.
- Cycles on GPU (OptiX on the RTX 5080; fall back to CUDA, then CPU, and log which), AgX colour management, 128–256 samples, OpenImageDenoise. No depth of field, no motion blur. **Sharp.**
- Lighting: one large soft key light from the upper left, a weak fill, a thin rim light. **The same rig, light direction and lens (~85mm) for every render**, so they look like one photo shoot.
- Materials: plausible and restrained. Bead-blasted aluminium (roughness ~0.35), glass, matte PBT. **Nothing puffy, glossy-toy or clay-like.**
- Screen textures: draw with Pillow using **the deck's own fonts** (convert the woff2 files to TTF with fontTools), so the screens match the slides. The laptop screen shows a plain chat text box containing `oye asti ko homework pathaidena` in IBM Plex Mono. **Do not invent a Swarnik interface.** The keyboard phone shows a chat field plus a plain keyboard layout.

Render these stills (PNG with alpha → WebP with alpha, quality ~85, into `assets/renders/v2/`):

| File | Slide | Shot |
|---|---|---|
| `keycap.webp` | 01 | Keycap close-up, three-quarter view, legend from `content.js` |
| `laptop.webp` | 03 | Laptop, three-quarter view, screen texture as above |
| `phone_keyboard.webp` | 07 | Phone lying slightly tilted, keyboard screen texture |

Slides 2 and 4 use the owner's real screenshots as flat evidence (section 5), not renders. No screen mapping is needed in v2.

If Blender fails, keep going: the layouts must still look complete without renders (render columns simply stay empty). Log it in `REPORT.md`.

---

## 7. `content.js` (the only file the owner edits)

It must define a global (not a module, not fetched JSON, because `file://` blocks `fetch`): `window.DECK = { ... }`.

- `{app}`, `{demoSentence}`, `{numbers.x}` and `{realOutput.x}` are replaced with their values everywhere (screen, presenter window, print, `<title>`). The app name must appear nowhere except `appName`.
- Any element whose value is `""` or `null` is **not rendered at all** (no empty boxes).
- `enabled: false` works on whole slides **and** on single beats. Disabled items are skipped everywhere.
- Beats with `needs: "survey"` or `needs: "tests"` use `say`/`show` when those numbers are filled, and `sayIfEmpty`/`showIfEmpty` when they aren't.
- **If `content.js` has a syntax error**, `index.html` must show a plain message on screen instead of a blank page: "content.js didn't load. Check the last thing you edited for a missing comma or quote." (Detect `window.DECK === undefined`, and report the line number from `window.onerror` if available.)

Component fields used inside `show` (build one render function per type in `js/components.js`):
`headline`, `label`, `quote`, `statement`, `note`, `tag`, `badge`, `wordmark`, `oneLiner`, `team`, `image`, `names`,
`sequence: [..]`, `rows: [{ label, value?, chat?, typed?, mark? }]` (`chat` = mono in `--text`, `typed` = mono in `--typed`),
`card: { tool, output, wrong: [..], image, verdict }`, `column: { title, sub, where }`,
`comments: { lines: [..], underline: [..], image, caption }`, `figure`, `figures: [..]`,
`step: { n, title, tag, devanagari?, from?, to?, typed? }`, `transform: [..]`, `timeline: [..]`, `closing: { spoken, typed }`.

Write it with exactly this content:

```js
window.DECK = {
  appName: "Swarnik",
  event: "Sci-Pitch 2026",
  teamName: "",                       // fill in: your team name
  members: ["Jebisha", "Tanish Bhatta"],
  school: "Trinity International SS & College",

  theme: "paper",                     // "paper" (light, default) or "ink" (dark). Press D to switch live.
  keycapLegend: "Hold",

  // Only real numbers from your own survey and tests/results. "" = hidden.
  numbers: {
    surveyAsked: "",
    surveyYes: "",
    sentences: "450",
    accuracy: "76"
  },

  demoSentence: "oye asti ko homework pathaidena",
  // Paste the app's REAL output for the demo sentence (copy it from the app, don't retype).
  realOutput: {
    devanagari: "",                   // what the speech model wrote
    roman: ""                         // what Swarnik typed
  },

  images: {
    keycap: "assets/renders/v2/keycap.webp",
    laptop: "assets/renders/v2/laptop.webp",
    phoneKeyboard: "assets/renders/v2/phone_keyboard.webp",
    englishVoice: "assets/screenshots/english_voice_google.png",
    nepaliVoice: "assets/screenshots/nepali_voice.png",
    wisprFlow: "assets/screenshots/wispr_flow.png",
    tiktok: "assets/screenshots/tiktok_comments.png"
  },
  backupVideo: "assets/video/backup_demo.mp4",

  slides: [
    { id: "idea", section: "Idea", speaker: "Jebisha", enabled: true, beats: [
      { say: "Every voice note you’ve ever sent was a message you didn’t feel like typing.",
        show: { quote: "Every voice note is a message you didn’t feel like typing." } },
      { say: "We’re Jebisha and Tanish, and this is {app}. You talk the way you talk, and it types the way we chat.",
        show: { wordmark: "{app}",
                oneLiner: "A Windows app that turns spoken Nepali and English into Roman Nepali, the way we chat.",
                team: true, image: "keycap" } }
    ]},

    { id: "problem", section: "The problem", speaker: "Jebisha", enabled: true, beats: [
      { say: "Typing Roman Nepali on a phone is slow, so we tried talking instead.",
        show: { headline: "Voice typing doesn’t write the way we chat." } },
      { say: "We said one normal sentence: “oye asti ko homework pathaidena.”",
        show: { label: "We said one normal sentence", quote: "“{demoSentence}”" } },
      { say: "English voice typing heard “oye ostiko homework what I dinner.” (Wait for the laugh.)",
        show: { card: { tool: "English voice typing · Google",
                        output: "oye ostiko homework what I dinner",
                        wrong: ["ostiko", "what I dinner"],
                        image: "englishVoice",
                        verdict: "Can’t understand Nepali" } } },
      { say: "Nepali voice typing wrote it all in Devanagari, even “homework.”",
        show: { card: { tool: "Nepali voice typing",
                        output: "ओइ अस्तिको होमवर्क पठाइदेन",
                        wrong: ["होमवर्क"],
                        image: "nepaliVoice",
                        verdict: "All Devanagari, even “homework”" } } },
      { say: "And Wispr Flow, one of the best AI voice typing apps, kept “homework” in English, but wrote the rest in Devanagari.",
        show: { card: { tool: "Wispr Flow · AI voice typing",
                        output: "ओइ, अस्तिको homework पठाइदे न।",
                        wrong: [],
                        image: "wisprFlow",
                        verdict: "Keeps “homework”, rest in Devanagari" } } },
      { say: "None of them write the way we actually write.",
        show: { rows: [ { label: "How we actually write", chat: "{demoSentence}" } ] } }
    ]},

    { id: "solution", section: "Your solution", speaker: "Tanish", enabled: true, beats: [
      { say: "{app} is a Windows app, and it’s running on this laptop right now.",
        show: { headline: "{app} is a Windows app.", tag: "Working prototype", image: "laptop" } },
      { say: "You hold one key, you speak, and it types wherever your cursor is. Let’s try it.",
        show: { sequence: ["Hold one key", "Speak", "It types where your cursor is"] } },
      { demo: true,
        say: "TANISH (Alt+Tab to Instagram): Same sentence. (Hold the key.) “Oye asti ko homework pathaidena.” (Let go.) JEBISHA, while it processes: Your voice doesn’t go anywhere. It’s all happening on this laptop. (Text appears. Two seconds of silence.) JEBISHA: Just like that. TANISH: “Homework” stayed in English, and the rest is exactly how we’d text it. (Alt+Tab back, press Space.)" },
      { view: "how",
        say: "After you let go, a free speech model writes what you said in Devanagari. We didn’t build that part.",
        show: { headline: "How it works",
                step: { n: "1", title: "Speech model", tag: "Borrowed", devanagari: "{realOutput.devanagari}" } } },
      { say: "Then our code puts the English words back in English,",
        show: { step: { n: "2", title: "English words back", tag: "Ours", from: "होमवर्क", to: "homework" } } },
      { say: "and our rules turn the rest into how we text.",
        show: { step: { n: "3", title: "Chat spelling", tag: "Ours", typed: "{realOutput.roman}" } } }
    ]},

    { id: "users", section: "Target users", speaker: "Jebisha", enabled: true, beats: [
      { say: "And it’s not just us. It’s students in every group chat,",
        show: { headline: "Anyone who writes Nepali in English letters.",
                column: { title: "Students", sub: "Every group chat", where: "Messenger" } } },
      { say: "creators who write their scripts in Roman Nepali,",
        show: { column: { title: "Creators", sub: "Scripts and captions in Roman Nepali", where: "TikTok" } } },
      { say: "and people selling things online, all over Messenger, Instagram and TikTok.",
        show: { column: { title: "Online sellers", sub: "Posts and replies in Roman Nepali", where: "Instagram" } } },
      { needs: "survey",
        say: "We asked {numbers.surveyAsked} students, and {numbers.surveyYes} of them type Nepali in English letters.",
        show: { figure: { value: "{numbers.surveyYes} of {numbers.surveyAsked}",
                          label: "students we asked type Nepali in English letters",
                          source: "Our survey" } },
        sayIfEmpty: "Open any Nepali comment section and look at how people write. (Point.) One person writes “cha”, the next one writes “xa”.",
        showIfEmpty: { comments: {
          lines: [
            "Afnai ghar lanu bhayo jasto cha",
            "passenger xa vanera birsinu vaye jasto xa",
            "usko pachade passenger car vaney ne birsexa"
          ],
          underline: ["cha", "xa"],
          image: "tiktok",
          caption: "TikTok comments" } } }
    ]},

    { id: "science", section: "Science and innovation", speaker: "Tanish", enabled: true, beats: [
      { needs: "tests",
        say: "We tested it on {numbers.sentences} real sentences we actually say, and it got {numbers.accuracy}% of the words right.",
        show: { headline: "Tested on how we really talk.",
                figures: [
                  { value: "{numbers.sentences}", label: "real sentences we actually say" },
                  { value: "{numbers.accuracy}%", label: "of words right" }
                ],
                badge: "No ChatGPT inside" },
        sayIfEmpty: "We test it on real sentences we actually say, and check every word.",
        showIfEmpty: { headline: "Tested on how we really talk.", badge: "No ChatGPT inside" } },
      { enabled: false,
        say: "The tricky part is that every Nepali consonant hides an ‘a’. Read घर letter by letter and you get ‘gha-ra’, but we say ‘ghar’, so our rules decide when to drop it.",
        show: { transform: [
          { devanagari: "घर", caption: "written" },
          { struck: "gha·ra", caption: "letter by letter" },
          { typed: "ghar", caption: "how we say it" }
        ] } }
    ]},

    { id: "business", section: "Business model", speaker: "Tanish", enabled: false, beats: [
      { say: "It’s free for students. It runs on your own laptop, so there are no servers to pay for.",
        show: { headline: "Free for students.", rows: [
          { label: "Cost per user", value: "About zero. It runs on your laptop, no servers." },
          { label: "Price", value: "Free" },
          { label: "How people find it", value: "College group chats and word of mouth" }
        ] } }
    ]},

    { id: "benefits", section: "Potential benefits", speaker: "Jebisha", enabled: true, beats: [
      { say: "It means typing as fast as you talk,",
        show: { headline: "Type as fast as you talk.",
                rows: [ { label: "Students", value: "Your own words, your own spelling" } ],
                image: "phoneKeyboard" } },
      { say: "and if typing is hard for you, you can just say it.",
        show: { rows: [ { label: "If typing is hard for you", value: "Just say it" } ] } },
      { say: "Next is a phone keyboard that learns how you spell, because some of us write xa, some cha, some chha, and nobody’s actually wrong.",
        show: { timeline: [
          { when: "Today", what: "Windows app" },
          { when: "Next", what: "Phone keyboard" },
          { when: "Then", what: "Learns your spelling:", typed: "xa · cha · chha" }
        ] } }
    ]},

    { id: "close", section: "Conclusion and pitch", speaker: "Tanish", enabled: true, beats: [
      { say: "Before the final, we want a hundred students to try it and break it.",
        show: { label: "Next step", headline: "100 students try it and break it, before 22 November." } },
      { say: "We didn’t ask anyone to change how they write. We made the computer catch up.",
        show: { statement: "We didn’t ask anyone to change how they write. We made the computer catch up." } },
      { say: "BOTH: Tapai bolnus. {app} lekhxa. (Hold still for two seconds.) Thank you.",
        show: { closing: { spoken: "Tapai bolnus.", typed: "{app} lekhxa." }, names: "Jebisha · Tanish" } }
    ]}
  ]
};
```

**If `realOutput` is empty**, the step samples on slide 3 show a dashed outline with the text "Paste the real output in content.js" so the owner notices it in rehearsal. List it in `REPORT.md`.

---

## 8. Controls, presenter window, print

- **Space / → / PageDown / ↓**: next beat. **← / PageUp / ↑**: previous beat. Every beat is fully reversible (FLIP moves too). Presentation clickers send PageDown/PageUp.
- **Mouse clicks and the scroll wheel do nothing.**
- **B**: black screen toggle. **D**: switch theme (paper/ink). **F**: fullscreen.
- **V**: play `backupVideo` fullscreen; if the file is missing or fails, open a file picker. **V** or **Esc** closes it.
- **T**: small timer in the header area (counts up from 0:00, turns `--accent` at 3:00). **Shift+T** resets.
- **P**: open `presenter.html`: the current spoken line (large), the next line, section, beat x/y, timer. Syncs with `BroadcastChannel`, falling back to `localStorage` events.
- **O**: overview of the enabled slides; arrows + Enter to jump; O/Esc to close. **H** or **?**: key list.
- Ctrl/Alt/Meta combinations pass through to the browser.

**Print** (`@media print`): Ctrl+P gives **one landscape 16:9 page per enabled slide**, each in its final state (all enabled beats shown, view B for slide 3, the evidence view for slide 4), same theme colours, renders and screenshots included. The demo beat doesn't print.

---

## 9. Folder structure (v2)

```
swarnik-pitch/
  index.html          ← v2 deck
  presenter.html
  content.js          ← the owner edits only this
  css/deck.css
  js/deck.js          ← navigation, beats, FLIP, keys, theme
  js/components.js    ← one render function per component type
  assets/
    fonts/
    renders/v2/       ← transparent renders
    screenshots/      ← english_voice_google.png, nepali_voice.png, wispr_flow.png, tiktok_comments.png
    video/backup_demo.mp4
  blender/            ← reused, with v2 render script
  reference/          ← v1_slide1.png, brief.png
  tools/check_deck.mjs
  shots/              ← test screenshots + contact-sheet.png
  v1/                 ← old deck, still working, as a fallback
  README.md
  REPORT.md
```

---

## 10. Phases

| Phase | Target time | Work | Commit message |
|---|---|---|---|
| 0 | 10 min | Section 2 (branch, v1 fallback, fonts) | "v2: setup, v1 kept as fallback" |
| 1 | 70 min | Design system, frame, all components, all slides, content.js, keys, presenter, print. Render columns empty. | "v2: typography and layouts" |
| 2 | 30 min | Transparent renders, integrate | "v2: renders" |
| 3 | 40 min | Tests, two self-review passes, fixes, contact sheet, README, REPORT | "v2: tested and reviewed" |

Spend leftover time on **typographic polish**, not features.

---

## 11. Testing and self-review

`tools/check_deck.mjs` with Playwright (`npm i -D playwright`, `npx playwright install chromium`):
1. Open `index.html` via `file://` at **1920×1080**, **1366×768**, and **1024×768** (4:3 school projectors: confirm the letterboxed text is still readable).
2. **Zero** console errors, warnings or page errors. **Zero** non-`file://` network requests.
3. `document.fonts.check()` passes for all four families.
4. Step through every beat forwards (screenshot each into `shots/`), then all the way back, and confirm the end state matches the start. Do it in both themes.
5. For every beat, check that no visible text box overlaps another, nothing leaves the stage, and no Devanagari is clipped (compare each element's `scrollHeight` with its `clientHeight`).
6. Check that the typeset outputs on slide 2 and the comments on slide 4 match `content.js` exactly, and that every screenshot keeps its aspect ratio.
7. Test every key: B, D, V (with a short test video you make with ffmpeg and delete afterwards), T, Shift+T, P, O, F, H. Confirm that clicks and the wheel don't change the beat.
8. Print to PDF and check the page count equals the number of enabled slides.
9. Switch on the business slide and the optional science beat, and empty the numbers, then run the checks again. Then restore the defaults.
10. Make `shots/contact-sheet.png`: the final state of every slide, in both themes, on one image.

**Then review the screenshots yourself (open the PNGs) against this checklist, fix everything, and repeat at least twice:**
- [ ] In one second, can you tell what the slide is about? (The headline dominates.)
- [ ] No more than 3 text sizes plus `label`?
- [ ] Every left edge sits on a grid line, and the headline is in the same spot on every slide?
- [ ] No orphan words, no chopped sentences, no awkward line breaks?
- [ ] Everything readable is ≥ 28px, and contrast is good in both themes?
- [ ] Enough empty space, and nothing crowding anything else? (Slide 2's cards especially.)
- [ ] Serif italic = spoken, mono = typed, sans = statements, used correctly everywhere? `--typed` only on Swarnik's output?
- [ ] `--accent` used sparingly?
- [ ] Renders sharp, consistently lit and scaled; screenshots crisp, bordered, undistorted?
- [ ] Would this pass as the work of a good design studio? If any slide looks like a template, redesign that slide.

---

## 12. Honesty rules (non-negotiable)

- **Never invent numbers**, users, quotes, survey results or test results. Empty means hidden. (450 and 76% come from the owner.)
- Never write "No AI". The speech model is AI and is labelled "Borrowed". "No ChatGPT inside" is true and allowed.
- Don't claim anything the app doesn't do. If unsure, leave it out and note it in `REPORT.md`.
- Never alter what a screenshot shows.
- Every placeholder is visible on screen in rehearsal and listed in `REPORT.md`.

---

## 13. README.md and REPORT.md

**README.md** (plain language, short): how to present (open `index.html` in Chrome or Edge, press F, then Space), the key list, and how to edit `content.js`: `appName`, `teamName`, `numbers`, `realOutput`, `theme`, `enabled` (slides and beats), `say` vs `show`. Also where the screenshots and the backup video go, and how to open `v1/` as a fallback.

**REPORT.md** (readable in 2 minutes): what's done, what's a placeholder, what failed or was cut and why, the render device and times, font check results, test results, and the owner's checklist before presenting:
1. Fill in `teamName`, Jebisha's surname in `members`, and `realOutput` (copied from the app).
2. Check the four screenshots in `assets/screenshots/` look right on slides 2 and 4.
3. Put the backup video in `assets/video/`.
4. Open the deck on the presenting laptop and click through every beat once.
