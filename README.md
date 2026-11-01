# Pitch deck (Sci-Pitch 2026)

## Presenting

1. Open `index.html` in **Chrome or Edge** (double-click it, no internet needed).
2. Press **F** for full screen, then **Space** for each beat.

| Key | What it does |
|---|---|
| Space, Right, Down, PageDown | next beat (clickers send PageDown) |
| Left, Up, PageUp | previous beat (everything is reversible) |
| B or . | black screen on/off |
| D | switch theme: `paper` (light, for a lit hall) / `ink` (dark room) |
| V | backup demo video, full screen. V or Esc closes it. If the file is missing, a file picker opens |
| T | small timer in the header (turns red at 3:00). Shift+T resets it to 0:00 |
| P | presenter window: the line to say now, the next line, section, beat, timer |
| O | overview of the slides. Arrows + Enter jump, O or Esc closes |
| F | full screen |
| H or ? | key list |

Mouse clicks and the scroll wheel do nothing. F5 (the "start show" button on some clickers) is ignored.
If the page gets reloaded anyway, it comes back on the same beat (the beat number is after `#` in the address bar).

**Live demo (slide 3, third beat)**: the whole screen goes black. Alt+Tab to the real app, do the demo, Alt+Tab back, press Space.

**Presenter window**: press P, drag the new window to the laptop screen. Space and the arrows pressed in the presenter window also move the deck.

## Changing the words: edit `content.js` only

Save, then reload the page. If you break the file (a missing comma or quote), the deck shows a plain message instead of a blank page.

- `appName`: the product name. It appears wherever `{app}` is written.
- `teamName`, `members`, `school`: the team block on slide 1. An empty value is simply not shown.
- `theme`: `"paper"` (default) or `"ink"`. D switches live.
- `numbers`: only real numbers from your own survey and tests. `""` hides them.
  - `surveyAsked` + `surveyYes` filled: slide 4 shows "X of Y" instead of the TikTok comments.
  - `sentences` + `accuracy`: the two big figures on slide 5.
- `enabled: false` hides a whole slide (slide 6 "Business model" is off) or a single beat
  (the hidden-‘a’ beat on slide 5 is off). Hidden things are skipped everywhere: keys, numbering, print.
- In each beat, `show` is what appears on screen; `say` is the spoken line (presenter window only).
  `sayIfEmpty` / `showIfEmpty` are used when the numbers that beat needs are empty.
- Slide 2: each `card` is one tool (name, screenshot, verdict). Beat 6 `verdicts: true` lists the three verdicts automatically from those cards.
- `keycapLegend`: the word on the 3D key. Changing it needs a re-render (below).

## Files

- `assets/screenshots/`: the four real screenshots used on slides 2 and 4. They are shown exactly as they are.
- `assets/video/backup_demo.mp4`: the backup demo video (H.264 MP4). Put it there before presenting.
- `assets/renders/v2/`: the 3D renders (transparent, they work on both themes): `phone_voicenotes` (slide 1), `keycap` (slide 3), `phone_keyboard` (slide 7). `laptop` is no longer used.

## Print / PDF

Ctrl+P → Save as PDF gives one 16:9 page per slide, each in its final state, in the current theme.

## Old deck (v1)

`v1/index.html` still opens and works, as a fallback. It uses its own copy of the old `content.js` in `v1/`.

## Re-rendering the 3D (only if you change the scene)

Needs Blender 4.4+ (4.5 is installed at `C:\Program Files\Blender Foundation\Blender 4.5\blender.exe`) and Python with Pillow + fontTools.

```
python tools\make_textures_v2.py
"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe" -b --factory-startup -P blender\render_v2.py
python tools\encode_v2.py
```

Add `-- --preview` at the end of the Blender line for fast half-size test renders.

## Checking the deck

```
npm install
npx playwright install chromium
npm run check
```

Writes screenshots of every beat to `shots/` (plus `shots/contact-sheet.png` and `shots/print.pdf`).
