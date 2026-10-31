# Overnight report

**State:** the deck is finished and presentable. All 8 slides, 23 steps (22 beats + the silent opening image),
real Blender renders with camera moves between slides, presenter window, print to PDF.
Open `index.html` in Chrome or Edge, press F, then Space.

## Before you present (checklist)

- [ ] **Gboard screenshot**: save the real one as `assets/screenshots/gboard.png` (it replaces a labelled placeholder that says "PLACEHOLDER").
- [ ] **Red outline** on the broken word: set `gboardHighlight` in `content.js` (percent of the screenshot, see README). Now `null` = no outline.
- [ ] **Slide 6 samples are placeholders**: replace the three `sample` strings in `content.js` with the real output of the app for "oee asti ko assignment pathaidena". The Devanagari line, the struck word and the final Roman line are my guesses, not measured results.
- [ ] **Backup video**: save as `assets/video/backup_demo.mp4` (H.264). Without it, V opens a file picker.
- [ ] **Numbers**: `numbers` are empty, so no numbers appear anywhere. Only fill them from your own test files.
- [ ] **Test on the presenting laptop**: open the deck from the folder (not from a zip), press F, step through once forwards and once backwards, press P for the presenter window, V for the video.
- [ ] If you change `keycapLegend`, re-render (README, "Re-rendering").

## What was built

| Part | Status |
|---|---|
| `index.html` + `css/deck.css` + `js/deck.js` | Done. 1920×1080 stage scaled to any screen, letterboxed in `#0E0F12`. |
| `content.js` | Your content exactly as given, plus `showOptional`, `numberLabels`, and `screenCorners` (written by the render script). |
| Beats | Keywords enter in sync with each Space press; earlier beats stay, dimmed to the secondary colour. |
| Camera moves | 6 pre-rendered Blender sequences (60 frames each, played over 1.5 s ≈ 40 fps), forwards or in reverse on a canvas. Text for the next slide enters at 70% of the move. |
| Slide 2 screenshot | Mapped onto the 3D phone screen with a CSS `matrix3d` homography from the 4 exported corners. Swap the PNG, no re-render needed. |
| Keys | Space/→/PgDn/↓, ←/PgUp/↑, B, V, T, Shift+T, P, O, F, H/?. Mouse and wheel do nothing. Ctrl/Alt combos pass through. |
| Presenter window (P) | Current line, next line, slide/beat, timer. Linked by BroadcastChannel + window messages + localStorage. Keys pressed there also drive the deck. |
| Print | Ctrl+P → exactly 8 landscape 16:9 pages, final state of each slide, renders included. Slide 5 prints black with "Live demo: … running on Windows". |
| Offline | Fonts bundled (Inter, Noto Sans Devanagari, IBM Plex Mono, all OFL). Zero network requests. |
| Blender | `blender/build_scene.py` builds everything procedurally (no downloaded models). `render_all.py` renders stills + sequences and exports the screen corners. `blender/scene.blend` saved with textures packed. |

## The scene (one continuous desk, travelling "down")

Phone with a voice-note chat (slide 1) → same phone close, screen off for the screenshot (slide 2) →
empty desk (slide 3) → keycap pad with a "HOLD" key (slide 4) → black (slide 5, demo) → empty desk (slide 6) →
laptop with Roman Nepali in a Notes field (slide 7, "Today") → phone lying flat with a chat field and keyboard (slide 7, "Next") →
camera pulls up over laptop + phone (slide 8).

Materials: satin aluminium phone frame, black glass, bead-blasted laptop aluminium (roughness 0.36, no anisotropy),
PBT keycaps with a fine grain bump and a dye-sub style legend, dark anodised pad, very dark desk with micro-texture.
Lighting: one large soft key (left), weak fill (right), a thin rim light behind each object (light-linked to that object only).
AgX, "Medium High Contrast". No depth of field, no motion blur, OpenImageDenoise.

## Render facts

- Blender **4.5.0** was already installed (no winget needed).
- Device: **OptiX on NVIDIA GeForce RTX 5070** (the brief said 5080; this machine has a 5070, 12 GB). Fallback order in the script: OptiX → CUDA → CPU.
- Stills: 1920×1080, 256 samples, adaptive, denoised. **~2–4 s each.**
- Sequences: 1600×900, 128 samples, 60 frames. **~1.1–1.5 s per frame, ~65–87 s per move.** Full set (8 stills + 6 moves): **~7.5 minutes.**
- Encoding: stills as **lossless** WebP (lossy WebP turned the dark desk into visible blocks), sequence frames WebP q90.
- **Asset size: 12.6 MB total** (renders 12.1 MB: stills 6.6 MB lossless, camera moves 5.6 MB) against the 150 MB budget.

## Test results (`node tools/check_deck.mjs`, Chrome, file://)

- 1920×1080 and 1366×768: every step forwards (screenshots in `shots/`), then back. Every step matches its forward state; rapid back-stepping returns to the exact start.
- **Console errors: 0. Warnings: 0. Non-file network requests: 0.**
- **Text overlaps: 0. Text outside the stage: 0.**
- Keys: B, V (generated test video plays, V/Esc close it; with no file a file picker opens), T / Shift+T, P (presenter follows and drives the deck), O (overview jump), F, H / ?. Click, right-click and wheel do not move the deck.
- **Print: 8 pages.**
- Extra checks I ran by hand: red outline with a test `gboardHighlight` (follows the phone's perspective), numbers row with test values,
  `showOptional: false` (22 steps), a deleted still (its flat labelled panel appears), a deleted sequence frame (falls back to a cross-fade).
- Frame pacing in headless Chrome: ~146 fps average during moves on this machine. Headless numbers are only indicative; check on the presenting laptop.
- I looked at every screenshot. Fixes made from that review: arrows now start the next line ("English voice typing / → can't understand us"),
  product lines no longer wrap, the keypad and laptop were moved clear of the text column, the screen reflection band on the second phone was removed,
  the laptop got printed key legends, a webcam and a proper gap above the trackpad, and a sliver of the keypad was framed out of the last shot.

## Decisions I made (no one to ask)

- **Slides 3 and 6** use near-black "empty desk" stills so the downward journey stays continuous; both are typographic slides on top of them.
- **Slide 8** shows the laptop and the phone (Today / Next) instead of every object; in a frame wide enough for all four, the phone and keycap were specks.
- **Camera-move frames are 1600×900** (spec allowed it). Only the two moves next to the current slide are kept decoded (~0.7 GB). On machines that report ≤ 4 GB RAM the frames are decoded at 1280×720 instead (~0.4 GB); the still at the end of each move is always full size.
- **Teal** (`#3FB8AA`) only for text the app outputs: slide 6 final line and "ghar", slide 7 "xa · cha · chha", slide 8 "… lekhxa.", and the typed text on the rendered screens.
- The key on slide 4 sits on a small generic 5-key pad (no brand). The legend text is read from `content.js` → `keycapLegend` at build time.
- Screen textures are flat UI I drew with Pillow: a group chat "Class 12 B" with voice notes, a chat with "Rohan" and a plain keyboard
  (shown under "Next", i.e. the planned phone keyboard, not a current feature), and a Notes window with the demo sentence. Names are props, not people.
- Added small safety features: F5 (a clicker's "start show" button) is ignored so it can't reload the deck; `.` is an alias for black (common on clickers);
  a reload returns to the same beat (`#step` in the address bar); the mouse cursor hides after 1.5 s.
- `{app}` is replaced everywhere from `appName`; the name is not written in any code file (the test checks this).
- Flat-design rules: no gradients, shadows, blur, glow, emoji or bouncy easing anywhere in the HTML/CSS (checked with a grep).
  Corner radius is 2px on tags; the one exception is the screenshot on slide 2, which is clipped to the same rounded corners
  as the rendered phone screen so it sits exactly on the glass.

## Known issues / limits

- If a render file listed in `assets/renders/manifest.js` is deleted, the deck falls back cleanly but Chrome still prints its own "file not found" line in the console. Re-run `tools/encode_frames.py` after changing renders.
- Same for V when there is no backup video: the file picker opens, and the browser logs the missing file.
- Pressing Esc while in browser full screen also leaves full screen (browser behaviour). V alone closes the video without leaving full screen.
- The two Blender texture fonts (Inter, Plex Mono) are bundled; the Devanagari samples only appear in HTML, never in renders.

## Files

`index.html` (deck) · `presenter.html` · `content.js` (edit this) · `css/deck.css` · `js/deck.js` · `js/sequence.js` ·
`assets/fonts` · `assets/renders` (+ `manifest.js`, `screen_corners.json`) · `assets/screenshots/gboard.png` (placeholder) ·
`blender/build_scene.py`, `materials.py`, `render_all.py`, `scene.blend`, `textures/` · `tools/make_textures.py`, `encode_frames.py`, `check_deck.mjs` ·
`shots/` (test output, not committed).
