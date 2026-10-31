# Pitch deck (Sci-Pitch 2026)

## Presenting

1. Open `index.html` in **Chrome or Edge** (double-click it, no internet needed).
2. Press **F** for full screen, then **Space** to start.
3. The first screen is the quiet opening image. Space shows the first line.

| Key | What it does |
|---|---|
| Space, →, PageDown, ↓ | next beat (clickers send PageDown) |
| ←, PageUp, ↑ | previous beat (camera moves play backwards) |
| B (or .) | black screen on/off |
| V | backup demo video, full screen. V or Esc closes it |
| T | small timer, top right (turns red at 3:00). Shift+T resets it |
| P | presenter window: what to say now, what comes next, timer |
| O | overview of all 8 slides. Arrows + Enter jump, O or Esc closes |
| F | full screen |
| H or ? | key list |

Mouse clicks and the scroll wheel do nothing, so the deck never moves by accident.
F5 (the "start show" button on many clickers) is ignored so it can't reload the page.
If the page does get reloaded, it comes back on the same beat (the beat number is in the address bar after `#`).
To start from the very beginning, remove the `#…` from the address bar and reload.

**Presenter window:** press P, drag the new window to the laptop screen. Keys pressed in
the presenter window (Space, arrows, PageUp/PageDown, B, T) also drive the deck.

**Live demo (slide 5)** is pure black and silent. Alt+Tab to the real app, then come back and press Space.

## Changing the words

Edit **`content.js` only**, save, reload the page.

- `appName`: the product name. It appears wherever `{app}` is written. Change it once here.
- `slides` → `beats`: each Space press shows one beat.
  - `show`: the words on screen. Each string is one line.
  - `say`: the spoken line. Only shown in the presenter window (P).
- `numbers`: only real measured numbers, e.g. `sentences: "120"`. Empty `""` hides it. If all
  three are empty there is no numbers row at all. They appear bottom-left on slide 6, with the labels in `numberLabels`.
- `gboardHighlight`: red outline around the broken word on the Gboard screenshot (slide 2, last beat).
  Percent of the screenshot: `{ x: 30, y: 52, w: 25, h: 4 }` = starts 30% from the left, 52% from the top, 25% wide, 4% tall.
  `null` = no outline. Tip: open the screenshot in Paint, read the pixel position of the word, divide by the image width/height.
- `showOptional`: `false` skips the optional "hidden 'a'" beat on slide 6.
- `screenCorners`: written automatically by the Blender render script. Don't edit by hand.
- `keycapLegend`: the word printed on the 3D key. Changing it needs a re-render (below).

## Files to drop in

- **Gboard screenshot:** save it as `assets/screenshots/gboard.png` (replace the placeholder).
  Any phone screenshot size works; it is fitted onto the 3D phone screen automatically.
- **Backup demo video:** save it as `assets/video/backup_demo.mp4` (H.264 MP4 plays in Chrome and Edge).
  If it is missing, pressing V opens a file picker instead.

## Re-rendering the 3D (only if you change the scene)

Needs Blender 4.4+ (4.5 is installed at `C:\Program Files\Blender Foundation\Blender 4.5\blender.exe`).

```
set B="C:\Program Files\Blender Foundation\Blender 4.5\blender.exe"
python tools\make_textures.py                                     (screen textures + keycap legend)
%B% -b --factory-startup -P blender\build_scene.py                (rebuilds blender\scene.blend)
%B% -b blender\scene.blend -P blender\render_all.py               (stills + camera moves, ~6 min on the RTX 5070)
%B% -b blender\scene.blend -P blender\render_all.py -- --preview  (fast low-res stills, to check framing)
python tools\encode_frames.py                                     (PNG → WebP + manifest)
```

`render_all.py` also writes the phone-screen corners into `content.js` (`screenCorners`).

## Checking the deck

```
npm install            (once; installs Playwright and a test-only ffmpeg)
npx playwright install chromium
node tools\check_deck.mjs
```

It steps every beat at 1920×1080 and 1366×768, saves screenshots in `shots/`, checks overlaps,
console errors, offline loading, every key, and that printing gives 8 pages.

## Printing / PDF

Ctrl+P → Save as PDF gives 8 landscape pages, one per slide, in their final state.
Set "Background graphics" on if the browser asks.
