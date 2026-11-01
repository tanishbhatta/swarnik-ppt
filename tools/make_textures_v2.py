"""Screen and legend textures for the v2 renders, drawn with the deck's own fonts.

    python tools/make_textures_v2.py

The woff2 files in assets/fonts are converted to TTF with fontTools (blender/_fonts/, not committed),
so the screens use exactly the faces the slides use: IBM Plex Mono for typed text, Instrument Sans for UI.

Outputs (blender/textures/)
    laptop_screen_v2.png    a plain chat window: one text box containing the demo sentence (Plex Mono)
    phone_keyboard_v2.png   a chat field plus a plain keyboard layout
    keycap_legend_v2.png    white legend on transparent (text from content.js keycapLegend)

No invented app interface: plain window, plain text box, plain keyboard.
"""
import os
import re

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "assets", "fonts")
TTF = os.path.join(ROOT, "blender", "_fonts")
TEX = os.path.join(ROOT, "blender", "textures")
os.makedirs(TTF, exist_ok=True)
os.makedirs(TEX, exist_ok=True)

INK = (20, 20, 20)
INK2 = (92, 88, 82)
RULE = (214, 207, 194)
PAPER = (250, 249, 246)
KEY = (255, 255, 255)
KEYBG = (226, 224, 219)


def ttf(woff2, out, axes=None):
    path = os.path.join(TTF, out)
    if not os.path.exists(path):
        f = TTFont(os.path.join(FONTS, woff2))
        if axes:
            f = instancer.instantiateVariableFont(f, axes)
        f.flavor = None
        f.save(path)
    return path


SANS500 = ttf("instrument-sans-latin-wdth-normal.woff2", "InstrumentSans-500.ttf", {"wght": 500, "wdth": 100})
SANS600 = ttf("instrument-sans-latin-wdth-normal.woff2", "InstrumentSans-600.ttf", {"wght": 600, "wdth": 100})
SANS400 = ttf("instrument-sans-latin-wdth-normal.woff2", "InstrumentSans-400.ttf", {"wght": 400, "wdth": 100})
MONO = ttf("ibm-plex-mono-latin-400-normal.woff2", "IBMPlexMono-400.ttf")


def sans(size, w=500):
    return ImageFont.truetype(SANS600 if w >= 600 else SANS500 if w >= 500 else SANS400, size)


def mono(size):
    return ImageFont.truetype(MONO, size)


def content_value(key, default):
    try:
        src = open(os.path.join(ROOT, "content.js"), encoding="utf-8").read()
        m = re.search(key + r'\s*:\s*"([^"]*)"', src)
        return m.group(1) if m and m.group(1) else default
    except OSError:
        return default


class Canvas:
    """Draw at 2x, save downsampled (clean edges)."""

    def __init__(self, w, h, bg, s=2):
        self.s, self.w, self.h = s, w, h
        self.im = Image.new("RGBA", (w * s, h * s), bg)
        self.d = ImageDraw.Draw(self.im)

    def rect(self, x, y, w, h, fill=None, r=0, outline=None, width=1):
        s = self.s
        box = [x * s, y * s, (x + w) * s - 1, (y + h) * s - 1]
        self.d.rounded_rectangle(box, radius=r * s, fill=fill, outline=outline, width=width * s) if r else \
            self.d.rectangle(box, fill=fill, outline=outline, width=width * s)

    def text(self, x, y, txt, f, fill, anchor="la"):
        big = f.font_variant(size=f.size * self.s)
        self.d.text((x * self.s, y * self.s), txt, font=big, fill=fill, anchor=anchor)

    def textlen(self, txt, f):
        return self.d.textlength(txt, font=f.font_variant(size=f.size * self.s)) / self.s

    def line(self, pts, fill, width=1):
        self.d.line([(x * self.s, y * self.s) for x, y in pts], fill=fill, width=width * self.s)

    def save(self, name, mode="RGB"):
        out = self.im.resize((self.w, self.h), Image.LANCZOS)
        if mode == "RGB":
            out = out.convert("RGB")
        path = os.path.join(TEX, name)
        out.save(path, optimize=True)
        print("wrote", os.path.relpath(path, ROOT), out.size)


def laptop_screen():
    W, H = 1920, 1200
    c = Canvas(W, H, PAPER + (255,))
    sentence = content_value("demoSentence", "oye asti ko homework pathaidena")
    # window title bar + hairline
    c.text(96, 64, "Chat", sans(40), INK, anchor="lm")
    c.rect(0, 128, W, 2, fill=RULE)
    # the text box, low on the screen like any chat app
    bx, by, bw, bh = 96, 760, W - 192, 260
    c.rect(bx, by, bw, bh, fill=(255, 255, 255), r=16, outline=RULE, width=3)
    f = mono(84)
    c.text(bx + 56, by + bh / 2, sentence, f, INK, anchor="lm")
    tw = c.textlen(sentence, f)
    c.rect(bx + 56 + tw + 12, by + bh / 2 - 52, 6, 104, fill=INK)
    c.save("laptop_screen_v2.png")


def phone_keyboard():
    W, H = 1080, 2292
    c = Canvas(W, H, PAPER + (255,))
    sentence = content_value("demoSentence", "oye asti ko homework pathaidena")
    # status bar
    c.text(84, 66, "9:41", sans(40), INK, anchor="lm")
    c.rect(W - 148, 52, 60, 28, outline=INK, r=7, width=3)
    c.rect(W - 143, 57, 42, 18, fill=INK, r=3)
    c.rect(W - 84, 60, 5, 12, fill=INK)
    # header
    c.text(84, 196, "Chat", sans(52), INK, anchor="lm")
    c.rect(0, 268, W, 2, fill=RULE)
    # keyboard
    kb_top = H - 900
    c.rect(0, kb_top, W, H - kb_top, fill=KEYBG)
    # chat field just above the keyboard
    fy = kb_top - 200
    c.rect(48, fy, W - 96, 136, fill=(255, 255, 255), r=68, outline=RULE, width=3)
    f = mono(44)
    c.text(100, fy + 68, sentence, f, INK, anchor="lm")
    tw = c.textlen(sentence, f)
    c.rect(100 + tw + 8, fy + 38, 5, 60, fill=INK)
    rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
    kw, kh, gap = 92, 132, 14
    ky = kb_top + 64
    for ri, row in enumerate(rows):
        n = len(row)
        x0 = (W - (n * kw + (n - 1) * gap)) / 2
        for i, ch in enumerate(row):
            x = x0 + i * (kw + gap)
            c.rect(x, ky, kw, kh, fill=KEY, r=14)
            c.text(x + kw / 2, ky + kh / 2, ch, sans(54, 400), INK, anchor="mm")
        if ri == 2:
            # shift and backspace: plain keys with drawn marks (no font glyphs)
            c.rect(24, ky, 132, kh, fill=(206, 203, 197), r=14)
            c.line([(90, ky + 40), (62, ky + 74), (78, ky + 74), (78, ky + 96), (102, ky + 96), (102, ky + 74), (118, ky + 74), (90, ky + 40)], INK, 3)
            c.rect(W - 156, ky, 132, kh, fill=(206, 203, 197), r=14)
            c.line([(W - 128, ky + 66), (W - 106, ky + 44), (W - 52, ky + 44), (W - 52, ky + 88), (W - 106, ky + 88), (W - 128, ky + 66)], INK, 3)
        ky += kh + 28
    # bottom row: 123, space, return
    c.rect(24, ky, 200, kh, fill=(206, 203, 197), r=14)
    c.text(124, ky + kh / 2, "123", sans(40), INK, anchor="mm")
    c.rect(240, ky, W - 240 - 240, kh, fill=KEY, r=14)
    c.text(W / 2, ky + kh / 2, "space", sans(40, 400), INK2, anchor="mm")
    c.rect(W - 224, ky, 200, kh, fill=(206, 203, 197), r=14)
    c.text(W - 124, ky + kh / 2, "return", sans(40), INK, anchor="mm")
    c.rect(W / 2 - 140, H - 40, 280, 10, fill=INK, r=5)
    c.save("phone_keyboard_v2.png")


def keycap_legend():
    legend = content_value("keycapLegend", "Hold")
    W, H = 1024, 512
    c = Canvas(W, H, (0, 0, 0, 0))
    c.text(W / 2, H / 2 + 6, legend, sans(250, 600), (255, 255, 255, 255), anchor="mm")
    c.save("keycap_legend_v2.png", mode="RGBA")


if __name__ == "__main__":
    laptop_screen()
    phone_keyboard()
    keycap_legend()
