# Report: deck v2 (typography-first rebuild)

Branch `v2`. Open `index.html`, press F, then Space. v1 still works from `v1/index.html`.

## Before you present (owner's checklist)

1. In `content.js`, fill in `teamName`, Jebisha's surname in `members`, and `realOutput` (copy both lines from the app, don't retype them).
2. Check that the four screenshots in `assets/screenshots/` look right on slides 2 and 4.
3. Put the backup video at `assets/video/backup_demo.mp4`. Without it, V opens a file picker.
4. Open the deck on the presenting laptop and click through every beat once. Try D in the hall: `paper` for a lit room, `ink` for a dark one.

## Placeholders still visible in rehearsal

| Where | What you see | Fix |
|---|---|---|
| Slide 3, steps 1 and 3 | Red dashed box: "Paste the real output in content.js" | Fill `realOutput.devanagari` and `realOutput.roman` |
| Slide 1, team block | Team name line missing (it's empty, so it's hidden) | Fill `teamName` |
| Slide 1, members | "Jebisha · Tanish Bhatta" | Add Jebisha's surname |
| Slide 4, evidence beat | TikTok comments (survey numbers are empty) | Fill `surveyAsked` + `surveyYes` only if you have a real survey |

## What's done

- **New design system.** Instrument Sans (variable, wght 400–700 + wdth 75–100; headlines at width 88%) for our statements, Instrument Serif Italic for spoken words, IBM Plex Mono for anything typed (Devanagari inside falls back to Noto Sans Devanagari at 1.1×), Noto Sans Devanagari for Devanagari. Only Swarnik's own output is in `--typed` teal. 8-token type scale, 12-column grid, fixed header (section number + name) and footer (progress segments + `03 / 07`), headline at the same spot (column 1, y = 192) on every slide.
- **Content follows the official brief, in order**: Idea, The problem, Your solution, Target users, Science and innovation, (Business model, off), Potential benefits, Conclusion and pitch. Numbering is 01–07 while slide 6 is off.
- **Beats.** Each Space shows the next component (420 ms rise). The newest one gets the 3 × 40 px accent rule; earlier ones stay at full strength. View changes (slide 1 beat 2, slide 4 evidence, slide 8 beats 2 and 3) use FLIP moves (600 ms). Slide changes move up 48 px and fade. Everything reverses with Left. `prefers-reduced-motion` gets opacity only.
- **Slide 2 evidence**: three cards with each tool's exact output typeset large (checked character for character against `content.js`), wavy accent underlines only on the `wrong` parts, the real screenshot below as proof (104 px tall, 1 px border, aspect kept), a verdict with a drawn ✕. Then "How we actually write" in mono.
- **Slide 4 evidence**: the three TikTok comments typeset verbatim in mono, whole-word underlines on "cha" / "xa" (not inside "birsexa"), the screenshot at 520 px tall as proof.
- **Slide 5**: "Tested on how we really talk.", 450 and 76% at statement size, "No ChatGPT inside" badge. The hidden-‘a’ beat (घर → gha·ra → ghar) is built and tested, and `enabled: false`.
- **Keys**: Space/arrows/PageUp/PageDown, B or ., D, F, V, T and Shift+T, P, O, H or ?. Ctrl/Alt/Meta pass through. Clicks and the wheel do nothing. F5 is ignored, and a reload returns to the same beat.
- **Presenter window** (P): the spoken line, the next line, section, beat x/y, timer. Synced by BroadcastChannel with a localStorage fallback. Arrows in the presenter window drive the deck.
- **Print**: one 16:9 page per enabled slide, final state (view B on slide 3, the evidence view on slide 4, the closing on slide 8), same theme, renders and screenshots included.
- **content.js** is exactly the version in the brief. A syntax error in it shows: "content.js didn’t load. Check the last thing you edited for a missing comma or quote." (plus the line number when the browser gives one).
- **Renders**: three transparent stills with real shadows (shadow catcher), one light rig (soft key upper left, weak fill, thin rim; only the key casts shadows), 85 mm lens, no depth of field. Screens drawn with the deck's own fonts (woff2 → TTF via fontTools): a plain chat box with `oye asti ko homework pathaidena` in Plex Mono, a plain chat field and keyboard. No invented Swarnik interface.

## Decisions I made (no one to ask)

- **The change request is folded in.** `CLAUDE_CODE_PROMPT_V2.md` was already the updated brief, so v2 was built from it directly: homework sentence, evidence screenshots, test numbers, single-beat `enabled`, mono for all typed text, no Gboard render or screen mapping in v2. The v1 pipeline (`render_all.py`, `screen_corners.json`, `gboard.png`) is untouched because `v1/` still uses it.
- **Slide 3 sequence is a vertical list** (Hold one key ↓ Speak ↓ It types where your cursor is), not a row in columns 1–7. The laptop render takes columns 6–12, and the three steps at 48 px don't fit side by side in five columns.
- **Slide 7 timeline runs full width** (stops on columns 1, 5, 9) under the phone render, instead of columns 1–7. In seven columns, "Learns your spelling:" broke awkwardly.
- **Slide 2 uses five text sizes** (80 headline, 64 spoken sentence, 48 typed sentence, 36 outputs, 28 verdicts). The brief's own slide-2 spec asks for each of these. Every other slide uses at most three plus `label`.
- **Slide 8 shrunk headline** keeps its semibold condensed cut at 28 px (instead of `small` 400), so the FLIP move is an exact scale with identical line breaks. A weight change would make the text jump mid-move.
- **Slide 4 evidence view**: the three user columns compress into one tight row over columns 1–7 (titles 48 → 36 px, descriptions fade), so the screenshot can use columns 9–12 at full height.
- **Accent rule** marks the newest component only when its view has more than one beat. A single-beat view needs no "you are here".
- **Small typographic rules** applied everywhere: hanging opening quotes, a short word plus punctuation never starts a line ("break it," stays together), no single short word alone on the last line, sentence-per-line for the closing statement.

## What failed or was cut

- Nothing failed. The laptop's tiny key legends reuse v1's texture (Inter), because Instrument Sans has no arrow glyphs and the legends are barely visible at render size.
- The brief mentions an RTX 5080; this machine has an **RTX 5070**. Renders ran on OptiX anyway.

## Renders

Blender 4.5, Cycles, OptiX on NVIDIA GeForce RTX 5070, AgX (Medium High Contrast), 224 samples (adaptive) + OpenImageDenoise.
keycap 1108×1140: 3.7 s · laptop 1628×1200: 6.5 s · phone_keyboard 992×840: 2.3 s · total 12.9 s.
`tools/encode_v2.py` writes WebP with alpha (quality 85) and fades the very soft floor shadow out at the image edges, so no rectangle shows on the paper background.

## Fonts

All four families load from `assets/fonts/` (checked with `document.fonts.check()` at the sizes used): Instrument Sans, Instrument Serif (italic), IBM Plex Mono (400/500), Noto Sans Devanagari (400/600). No system-font fallback. Arrows, ticks and crosses are inline SVG, never font glyphs.

## Tests (`npm run check`, Chrome, file://)

**All checks pass** (0 failures, 0 notes). What it covers:

- 1920×1080: zero console errors, warnings or page errors; zero non-`file://` requests; the four font families load; 7 slides, numbered 01–07; `<title>` filled from `content.js`.
- All 25 beats forwards (a screenshot of each in `shots/paper/` and `shots/ink/`), then all the way back: the end state equals the start state, in both themes.
- Every beat: no overlapping text boxes, nothing outside the stage, no clipped Devanagari.
- Slide 2 outputs and slide 4 comments match `content.js` character for character; underlines only on "cha"/"xa" as whole words; all 7 images keep their aspect ratio.
- Keys: B and ".", D, V (a 2 s test video made with ffmpeg, then deleted; a missing file opens the picker), T, Shift+T, the timer turning accent at 3:00, P (presenter in sync, and its arrows drive the deck), O (arrows + Enter jump), F, H and ?. Clicks and the wheel don't move the deck. F5 is ignored; a reload returns to the same beat.
- Print: 7 pages = 7 enabled slides (`shots/print.pdf`).
- 1366×768 and 1024×768 (4:3, letterboxed): all beats pass the same checks. At 1024×768 the smallest readable text (28 px) renders at 14.9 px and headlines at 42.7 px: readable on a projector.
- Variant (business slide on, hidden-‘a’ beat on, all numbers empty): 8 slides 01–08, 27 beats, no layout issues, print = 8 pages. Defaults restored (variants are injected in the browser; `content.js` is never modified).
- Variant (test survey numbers + test `realOutput`): "36 of 40" replaces the comments, both placeholders disappear, no layout issues. These test values exist only inside the test run.
- Reduced motion: all beats work.
- A `content.js` with a missing comma shows the plain error message (`shots/content-error.png`).
- `shots/contact-sheet.png`: the final state of every slide in both themes.

Two self-review passes against the checklist (screenshots and mid-animation frames) led to these fixes: inactive slides stayed visible (a visibility bug), crowding on the slide 2 cards, line breaks ("break / it,", a dangling "We" in the closing statement), Devanagari word spacing inside mono text, a fade glitch in the slide 4 FLIP, a gentler FLIP easing, presenter commands arriving twice, render edges visible on paper, and overexposed renders.

## Files

`index.html` · `presenter.html` · `content.js` · `css/deck.css` · `js/deck.js` · `js/components.js` ·
`blender/render_v2.py` (+ reused `build_scene.py`, `materials.py`) · `tools/make_textures_v2.py` · `tools/encode_v2.py` · `tools/check_deck.mjs` ·
`assets/renders/v2/` · `v1/` (fallback) · `shots/` (test output, not committed)
