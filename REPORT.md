# Report: deck v2

Branch `v2`. Open `index.html`, press F, then Space. v1 still works from `v1/index.html`.
Latest round: **owner fixes round 2** (see the end of this file for what changed).

## Before you present (owner's checklist)

1. In `content.js`, fill in `teamName` and Jebisha's surname in `members`.
2. Check the four screenshots in `assets/screenshots/` on slides 2 and 4. **Retake `wispr_flow.png` zoomed in if you can** (see below).
3. Put the backup video at `assets/video/backup_demo.mp4`. Without it, V opens a file picker.
4. Open the deck on the presenting laptop and click through every beat once. Try D in the hall: `paper` for a lit room, `ink` for a dark one.

## Placeholders still visible in rehearsal

| Where | What you see | Fix |
|---|---|---|
| Slide 1, team block | No team-name line (it's empty, so it's hidden) | Fill `teamName` |
| Slide 1, team block | "Jebisha · Tanish Bhatta" | Add Jebisha's surname to `members` |
| Slide 4, last beat | TikTok comments (survey numbers are empty) | Fill `surveyAsked` + `surveyYes` only if you have a real survey |

There are no dashed "paste the output" boxes any more: `realOutput` is gone from the deck, and the live demo shows the output.

## Screenshot sizes (slide 2, one tool per beat)

Each screenshot is as large as the layout allows: full content width (1664 px), never taller than 540 px, never upscaled more than 2.5×, aspect ratio kept.

| Screenshot | File size | Shown at | Scale |
|---|---|---|---|
| English voice typing (Google) | 1230 × 250 | 1664 × 338 | 1.35× |
| Nepali voice typing | 920 × 180 | 1664 × 326 | 1.81× |
| Wispr Flow | 475 × 118 | 1188 × 295 | 2.50× (the limit) |

**Wispr Flow looks soft** at 2.5×: the text is readable but blurry from the back of a hall. Retake it zoomed in (Ctrl + in the Wispr window, or a higher-DPI screen) at about 1200 px wide and save it over `assets/screenshots/wispr_flow.png`. Nothing else needs to change. The Nepali one at 1.8× is acceptable; a sharper retake would help too.
The TikTok screenshot on slide 4 is shown 744 px tall (1.06×).

## What's on each slide now

1. **Idea**: the hook at 96 px serif italic (columns 1–7, at the headline position) with a large transparent phone render showing voice-note bubbles on the right (about 770 px of phone in an 880 px box). Beat 2 adds the team block bottom-left in `small` size.
2. **The problem**: headline, then "We said one normal sentence" + the spoken sentence. Beats 3–5 show one tool at a time: tool name, the screenshot large, the verdict at 36 px with a drawn ✕. The previous tool fades out as the next appears. Beat 6: the three verdicts stacked (✕ · tool · verdict), then "How we actually write" with the sentence in mono.
3. **Your solution**: the "Swarnik" block (wordmark, one-liner) on the left with the real Swarnik Windows app home screen (`assets/screenshots/swarnik_home.png`) presented on the right as a 3D-tilted floating window (732 × 609 px with a multi-step 3D extruded chassis and architectural plinth). Beat 2 adds "Hold one key → Speak → It types where your cursor is" under the one-liner. Beat 3 is the black demo. "How it works": three steps with 64 px titles, Borrowed/Ours tags, "Writes what you said in Devanagari" · होमवर्क → `homework` · "Turns the rest into how we text", filling the slide down to about y = 910.
4. **Target users**: headline + three columns; the evidence beat puts the comments in columns 1–6 and the TikTok screenshot 744 px tall in columns 7–12.
5. **Science and innovation**: 450 and 76% at 300 px across the full width, labels at 48 px, "No ChatGPT inside" directly under them.
6. (Business model: off.)
7. **Potential benefits**: unchanged except bigger labels (and a slightly larger phone render box).
8. **Conclusion and pitch**: one beat, the statement at 128 px, vertically centred. "Tapai bolnus. Swarnik lekhxa. Thank you." is in the presenter notes only.

Header: the section number + name only. Footer: the progress segments only.

## Decisions I made (no one to ask)

- **Smallest text is now 28 px.** "Nothing the audience reads under 28 px" applies to the `label` style too, so the header, tags (Borrowed / Ours), the badge, captions, step numbers, timeline labels and the slide 2 / 4 labels all went from 20 to 28 px. The test script now fails on any visible text under 28 px.
- **Slide 1 render box starts at column 8, not 7**, so the 96 px hook (columns 1–7) never sits over the image. The phone itself is drawn well inside the box.
- **Slide 3 sequence is set at 36 px (`body`, medium weight) on one row.** At 48 px the three steps and two arrows don't fit in one row under the one-liner (columns 1–7).
- **Slide 3 "How it works" titles are 64 px** (semibold, condensed like the headlines). At 80 px "English words back" would break onto two lines in a four-column step.
- **Slide 4 headline wraps to two lines in columns 1–6** in both views, so the big screenshot has columns 7–12 to itself and the headline never re-wraps during the move.
- **Slide 4 screenshot is 744 px tall** (asked: about 780) so its caption stays inside the content area above the footer.
- **Slide 8 statement is 128 px** (the scale's statement size is 112). At 128 it still sits on three lines, one sentence per line block, and fills the slide.
- **The hidden-‘a’ beat (slide 5, still off)** now replaces the figures when switched on, instead of stacking under them. With 300 px figures there's no room for both.
- **Only one "you are here" rule per beat** (the first new component), and none on the first beat of a slide unless it starts a series (cards, columns, steps, rows).
- **The "stray small slide thumbnail" on slide 3**: I found no thumbnail element in the deck. The likeliest culprit was the laptop render in the bottom-right of that beat: its screen showed a light page with a small "Chat" label and one line of text, which reads like a mini slide. The laptop render is gone from slide 3 now (`laptop.webp` is unused but kept). If you still see something, tell me which beat and where.
- `output` and `wrong` were removed from the slide 2 cards in `content.js`, because the typeset outputs are no longer shown. Beat 6 uses `verdicts: true`, which builds the summary from the three cards above it.

## Renders

Blender 4.5, Cycles, OptiX on NVIDIA GeForce RTX 5070, AgX (Medium High Contrast), 224 samples (adaptive) + OpenImageDenoise. Transparent film, shadow catcher, one light rig (soft key upper left, weak fill, thin rim; only the key casts shadows), 85 mm, no depth of field.

| Render | Size | Time | Slide |
|---|---|---|---|
| `phone_voicenotes.webp` (new: v1's voice-note screen texture, re-rendered the v2 way) | 1204 × 1320 | 4.6 s | 1 |
| `keycap.webp` | 1108 × 1140 | 3.7 s | 3 |
| `phone_keyboard.webp` | 992 × 840 | 2.3 s | 7 |
| `laptop.webp` (no longer used) | 1628 × 1200 | 6.5 s | – |

The voice-note phone screen keeps v1's texture as asked; its small UI text is in Inter (v1's font), not the deck fonts.

## Fonts

All four families load from `assets/fonts/` (checked with `document.fonts.check()`): Instrument Sans, Instrument Serif (italic), IBM Plex Mono, Noto Sans Devanagari. Arrows, ticks and crosses are inline SVG.

## Tests (`npm run check`, Chrome, file://)

**All checks pass** (0 failures, 0 notes) after this round. What it covers:

- 1920×1080: zero console errors, warnings or page errors; zero non-`file://` requests; the four font families load; 7 slides; header shows only the section label, footer only the 7 progress segments.
- All 23 beats forwards (a screenshot of each in `shots/paper/` and `shots/ink/`), then all the way back: the end state equals the start state, in both themes.
- Every beat: no overlapping text, nothing outside the stage, no clipped Devanagari, and **no visible text under 28 px** (new check).
- Slide 2: exactly one tool card visible per beat; each screenshot at its largest size within 1664 × 540 and ≤ 2.5× (sizes in the table above); verdicts at 36 px.
- Slide 4 comments match `content.js` character for character; underlines only on "cha"/"xa" as whole words; all 7 on-screen images keep their aspect ratio.
- Keys: B and ".", D, V (a test video made with ffmpeg, then deleted; a missing file opens the picker), T, Shift+T, the timer turning accent at 3:00, P (presenter in sync, and its arrows drive the deck), O, F, H and ?. Clicks and the wheel do nothing. F5 is ignored; a reload returns to the same beat.
- Print: 7 pages = 7 enabled slides (`shots/print.pdf`).
- 1366×768 and 1024×768 (4:3, letterboxed): same checks pass. At 1024×768 the smallest text (28 px) renders at 14.9 px.
- Variants, injected in the browser (`content.js` is never modified): slide 6 + hidden-‘a’ beat on + numbers empty gives 8 slides and 8 print pages, with no layout issues. Survey numbers + team name filled: "36 of 40" replaces the comments, and the team name shows.
- Reduced motion works. A `content.js` with a missing comma shows the plain error message.
- `shots/contact-sheet.png`: the final state of every slide, both themes.

Two self-review passes this round (every beat at full size, then the contact sheet in both themes). They led to these fixes: two accent rules on slide 2 beat 6 (now one per beat), a doubled hairline above "How we actually write", "Devanagari" left alone on its own line, the Wispr screenshot rounding a pixel over the 2.5× cap, and hidden slide 4 descriptions still counting as text.

## Files

`index.html` · `presenter.html` · `content.js` · `css/deck.css` · `js/deck.js` · `js/components.js` ·
`blender/render_v2.py` (+ reused `build_scene.py`, `materials.py`) · `tools/make_textures_v2.py` · `tools/encode_v2.py` · `tools/check_deck.mjs` ·
`assets/renders/v2/` · `v1/` (fallback) · `shots/` (test output, not committed)

## Round 2 changes (owner fixes)

1. Header: right-side "Swarnik · Sci-Pitch 2026" removed.
2. Footer: "01 / 07" counter removed.
3. Slide 1: hook at 96 px + voice-note phone render; team block on beat 2; new say lines.
4. Slide 3 beat 1: the Swarnik block from slide 1 (replaces the headline, tag and laptop); beat 2 adds the sequence under the one-liner; the laptop render is gone.
5. Slide 2: one tool per beat with a large screenshot, typeset outputs removed, beat 6 summary.
6. Slide 3 "How it works": samples and dashed boxes removed, one-line descriptions, bigger; `realOutput` removed everywhere.
7. Slide 4 evidence: screenshot 744 px tall in columns 7–12, comments in columns 1–6.
8. Slide 5: 300 px figures across the full width, 48 px labels, badge under the figures.
9. Slide 8: "Next step" beat removed.
10. Slide 8: closing beat removed from the screen; one centred statement; Tapai bolnus in the notes.
