"""Draws the flat UI textures used on the 3D screens, plus the screenshot placeholder.

    python tools/make_textures.py

Outputs
    blender/textures/phone_voice.png     slide 1 phone: chat with voice-note bubbles
    blender/textures/laptop_screen.png   slide 7 laptop: a text field with Roman Nepali in teal
    blender/textures/phone_keyboard.png  slide 7 phone: chat field + plain keyboard
    blender/textures/keycap_legend.png   white legend on transparent (text from content.js keycapLegend)
    assets/screenshots/gboard.png        labelled placeholder (only written if the file does not exist)

Flat shapes and text only. Everything is drawn at 2x and downsampled for clean edges.
"""
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "assets", "fonts")
TEX = os.path.join(ROOT, "blender", "textures")
os.makedirs(TEX, exist_ok=True)

TEAL = (63, 184, 170)
FG = (242, 237, 228)
FG2 = (140, 138, 133)


def font(weight, size):
    name = {"400": "Inter-Regular.woff2", "500": "Inter-Medium.woff2", "600": "Inter-SemiBold.woff2"}[weight]
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def mono(size):
    return ImageFont.truetype(os.path.join(FONTS, "ibm-plex-mono-latin-400-normal.woff2"), size)


def content_value(key, default):
    try:
        src = open(os.path.join(ROOT, "content.js"), encoding="utf-8").read()
        m = re.search(key + r'\s*:\s*"([^"]*)"', src)
        return m.group(1) if m else default
    except OSError:
        return default


class Canvas:
    """Draw at scale S, save downsampled."""

    def __init__(self, w, h, bg, s=2):
        self.s = s
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w * s, h * s), bg)
        self.d = ImageDraw.Draw(self.im)

    def rect(self, x, y, w, h, fill=None, r=0, outline=None, width=1):
        s = self.s
        box = [x * s, y * s, (x + w) * s - 1, (y + h) * s - 1]
        if r:
            self.d.rounded_rectangle(box, radius=r * s, fill=fill, outline=outline, width=width * s)
        else:
            self.d.rectangle(box, fill=fill, outline=outline, width=width * s)

    def circle(self, cx, cy, r, fill=None, outline=None, width=1):
        s = self.s
        self.d.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=fill, outline=outline, width=width * s)

    def poly(self, pts, fill):
        s = self.s
        self.d.polygon([(x * s, y * s) for x, y in pts], fill=fill)

    def line(self, pts, fill, width=1):
        s = self.s
        self.d.line([(x * s, y * s) for x, y in pts], fill=fill, width=width * s)

    def text(self, x, y, txt, f, fill, anchor="la"):
        s = self.s
        big = f.font_variant(size=f.size * s)
        self.d.text((x * s, y * s), txt, font=big, fill=fill, anchor=anchor)

    def textlen(self, txt, f):
        return self.d.textlength(txt, font=f)

    def save(self, path, mode="RGB"):
        out = self.im.resize((self.w, self.h), Image.LANCZOS)
        if mode == "RGB":
            out = out.convert("RGB")
        out.save(path, optimize=True)
        print("wrote", os.path.relpath(path, ROOT), out.size)


# Phone display: 67.7 x 143.7 mm  ->  1080 x 2292 px
PW, PH = 1080, 2292


def status_bar(c, y=44):
    c.text(84, y, "9:41", font("500", 40), FG)
    # signal + battery as plain shapes
    x = PW - 84
    c.rect(x - 64, y + 8, 56, 28, outline=FG, r=6, width=3)
    c.rect(x - 60, y + 12, 38, 20, fill=FG, r=3)
    c.rect(x - 6, y + 16, 4, 12, fill=FG)
    for i in range(4):
        h = 10 + i * 7
        c.rect(x - 150 + i * 16, y + 36 - h, 10, h, fill=FG)


def chat_header(c, title, sub):
    c.rect(0, 0, PW, 260, fill=(17, 18, 21))
    status_bar(c)
    # back chevron
    c.line([(84, 176), (62, 154), (84, 132)], FG, 5)
    c.circle(170, 154, 44, fill=(58, 60, 66))
    c.text(170, 154, title[:1], font("600", 40), FG, anchor="mm")
    c.text(240, 122, title, font("600", 42), FG)
    c.text(240, 176, sub, font("400", 30), FG2)
    c.rect(0, 259, PW, 1, fill=(42, 43, 48))


def voice_bubble(c, x, y, w, sent, dur, seed):
    bh = 132
    fill = (31, 54, 50) if sent else (34, 35, 40)
    c.rect(x, y, w, bh, fill=fill, r=34)
    # play triangle
    px, py = x + 70, y + bh / 2
    c.poly([(px - 16, py - 24), (px - 16, py + 24), (px + 24, py)], FG)
    # waveform
    import random
    rnd = random.Random(seed)
    wx = x + 130
    n = int((w - 300) / 14)
    for i in range(n):
        hgt = 10 + rnd.random() * 60 * (0.5 + 0.5 * abs(((i % 17) - 8) / 8.0))
        col = FG if i < n * 0.35 else (150, 156, 152)
        c.rect(wx + i * 14, py - hgt / 2, 7, hgt, fill=col, r=3)
    c.text(x + w - 46, py, dur, font("500", 32), FG2, anchor="rm")
    return bh


def text_bubble(c, x, y, txt, sent, f=None, maxw=720):
    f = f or font("400", 40)
    tw = c.textlen(txt, f)
    w = min(maxw, tw + 76)
    fill = (31, 54, 50) if sent else (34, 35, 40)
    if sent:
        x = PW - 60 - w
    c.rect(x, y, w, 104, fill=fill, r=34)
    c.text(x + 38, y + 52, txt, f, FG, anchor="lm")
    return 104


def input_bar(c, y, txt=None, txt_col=FG2, mic=True):
    c.rect(0, y - 40, PW, 1, fill=(42, 43, 48))
    c.rect(48, y, PW - 230, 112, fill=(30, 31, 36), r=56)
    c.text(100, y + 56, txt or "Message", font("400", 40), txt_col, anchor="lm")
    if mic:
        cx, cy = PW - 112, y + 56
        c.circle(cx, cy, 56, fill=(58, 60, 66))
        c.rect(cx - 13, cy - 30, 26, 42, fill=FG, r=13)
        c.line([(cx - 24, cy - 2), (cx - 24, cy + 4)], FG, 4)
        c.d.arc([(cx - 26) * 2, (cy - 16) * 2, (cx + 26) * 2, (cy + 26) * 2], 0, 180, fill=FG, width=8)
        c.rect(cx - 2, cy + 26, 5, 14, fill=FG)


def phone_voice():
    c = Canvas(PW, PH, (11, 12, 14, 255))
    chat_header(c, "Class 12 B", "group  ·  38 members")
    y = 330
    c.text(PW / 2, y + 10, "Today", font("500", 30), FG2, anchor="mm")
    y += 80
    y += text_bubble(c, 60, y, "assignment kaha cha?", False) + 36
    y += voice_bubble(c, PW - 60 - 640, y, 640, True, "0:14", 3) + 28
    y += text_bubble(c, 60, y, "voice note napathau na", False) + 36
    y += voice_bubble(c, PW - 60 - 560, y, 560, True, "0:09", 7) + 28
    y += voice_bubble(c, PW - 60 - 700, y, 700, True, "0:21", 11) + 28
    input_bar(c, PH - 220)
    c.rect(PW / 2 - 140, PH - 44, 280, 10, fill=(200, 200, 200), r=5)
    c.save(os.path.join(TEX, "phone_voice.png"))


def phone_keyboard():
    c = Canvas(PW, PH, (11, 12, 14, 255))
    chat_header(c, "Rohan", "online")
    y = 330
    y += text_bubble(c, 60, y, "oee asti ko assignment pathaidena", False, maxw=960) + 36
    # input field with teal output text and caret
    kb_top = PH - 900
    iy = kb_top - 170
    c.rect(0, iy - 40, PW, 1, fill=(42, 43, 48))
    c.rect(48, iy, PW - 96, 112, fill=(30, 31, 36), r=56)
    f = font("500", 44)
    t = "sorry, aaja pathauxu"
    c.text(100, iy + 56, t, f, TEAL, anchor="lm")
    tw = c.textlen(t, f.font_variant(size=f.size * 2)) / 2
    c.rect(100 + tw + 8, iy + 28, 4, 56, fill=FG)
    # keyboard
    c.rect(0, kb_top, PW, PH - kb_top, fill=(22, 23, 27))
    rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
    kw, kh, gap = 92, 128, 14
    ky = kb_top + 120
    # suggestion strip
    for i, wd in enumerate(["pathauxu", "pathaudai", "pathayo"]):
        c.text(PW / 6 + i * PW / 3, kb_top + 60, wd, font("500", 36), FG if i == 0 else FG2, anchor="mm")
    for ri, row in enumerate(rows):
        n = len(row)
        x0 = (PW - (n * kw + (n - 1) * gap)) / 2
        if ri == 2:
            x0 += 0
        for i, ch in enumerate(row):
            x = x0 + i * (kw + gap)
            c.rect(x, ky, kw, kh, fill=(52, 54, 60), r=14)
            c.text(x + kw / 2, ky + kh / 2, ch, font("400", 52), FG, anchor="mm")
        if ri == 2:
            c.rect(24, ky, 140, kh, fill=(40, 41, 46), r=14)
            c.poly([(94, ky + 36), (64, ky + 76), (82, ky + 76), (82, ky + 96), (106, ky + 96), (106, ky + 76), (124, ky + 76)], FG)
            c.rect(PW - 164, ky, 140, kh, fill=(40, 41, 46), r=14)
            c.poly([(PW - 134, ky + 64), (PW - 110, ky + 40), (PW - 54, ky + 40), (PW - 54, ky + 88), (PW - 110, ky + 88)], FG)
        ky += kh + 26
    # bottom row: 123, mic (the hold-to-speak key), space, return
    c.rect(24, ky, 170, kh, fill=(40, 41, 46), r=14)
    c.text(24 + 85, ky + kh / 2, "123", font("500", 40), FG, anchor="mm")
    c.rect(210, ky, 130, kh, fill=(40, 41, 46), r=14)
    mx, my = 275, ky + kh / 2
    c.rect(mx - 12, my - 30, 24, 40, fill=TEAL, r=12)
    c.d.arc([(mx - 24) * 2, (my - 16) * 2, (mx + 24) * 2, (my + 24) * 2], 0, 180, fill=TEAL, width=7)
    c.rect(mx - 2, my + 24, 5, 12, fill=TEAL)
    c.rect(356, ky, PW - 356 - 210, kh, fill=(52, 54, 60), r=14)
    c.text(356 + (PW - 356 - 210) / 2, ky + kh / 2, "space", font("400", 40), FG2, anchor="mm")
    c.rect(PW - 194, ky, 170, kh, fill=(40, 41, 46), r=14)
    c.line([(PW - 80, ky + 46), (PW - 80, ky + 80), (PW - 140, ky + 80)], FG, 5)
    c.poly([(PW - 150, ky + 80), (PW - 132, ky + 64), (PW - 132, ky + 96)], FG)
    c.rect(PW / 2 - 140, PH - 44, 280, 10, fill=(200, 200, 200), r=5)
    c.save(os.path.join(TEX, "phone_keyboard.png"))


def laptop_screen():
    W, H = 1920, 1200
    c = Canvas(W, H, (24, 25, 29, 255))
    # desktop: flat, very dark; one window
    c.rect(0, H - 64, W, 64, fill=(16, 17, 20))
    for i in range(4):
        c.rect(W / 2 - 110 + i * 60, H - 50, 36, 36, fill=(58, 60, 66), r=6)
    c.text(W - 40, H - 32, "10:42", font("400", 26), FG2, anchor="rm")
    wx, wy, ww, wh = 220, 130, 1480, 860
    c.rect(wx, wy, ww, wh, fill=(30, 31, 35), r=10)
    c.rect(wx, wy + 64, ww, 1, fill=(48, 49, 54))
    c.text(wx + 40, wy + 32, "Notes", font("500", 30), FG, anchor="lm")
    # window controls: minimise, maximise, close (plain lines)
    bx = wx + ww - 60
    c.line([(bx - 8, wy + 24), (bx + 8, wy + 40)], FG2, 2)
    c.line([(bx - 8, wy + 40), (bx + 8, wy + 24)], FG2, 2)
    c.rect(bx - 88, wy + 24, 16, 16, outline=FG2, width=2)
    c.line([(bx - 168, wy + 32), (bx - 152, wy + 32)], FG2, 2)
    # text field
    fx, fy, fw, fh = wx + 60, wy + 120, ww - 120, 300
    c.rect(fx, fy, fw, fh, fill=(20, 21, 24), r=8, outline=(64, 66, 72), width=2)
    f = font("500", 64)
    t1 = "oee asti ko assignment"
    t2 = "pathaidena"
    c.text(fx + 48, fy + 90, t1, f, TEAL, anchor="lm")
    c.text(fx + 48, fy + 190, t2, f, TEAL, anchor="lm")
    tw = c.textlen(t2, f.font_variant(size=f.size * 2)) / 2
    c.rect(fx + 48 + tw + 10, fy + 152, 5, 76, fill=FG)
    # a quiet line of earlier notes under it
    g = font("400", 34)
    c.text(fx, fy + fh + 70, "maths: page 42, 5 questions", g, FG2)
    c.text(fx, fy + fh + 130, "physics lab bholi 10 baje", g, FG2)
    c.save(os.path.join(TEX, "laptop_screen.png"))


# Laptop keyboard layout, in laptop-local metres. Keep in sync with blender/build_scene.py (build_laptop).
LAP_PITCH = 0.01905
LAP_Y0 = 0.031                       # centre line of the key block
LAP_BOUNDS = (-7 * LAP_PITCH, LAP_Y0 - 3.0 * LAP_PITCH - 0.0005, 7 * LAP_PITCH, LAP_Y0 + 3.0 * LAP_PITCH)  # x0, y0, x1, y1


def laptop_legends():
    rows = [
        ["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "del"],
        ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "⌫"],
        ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
        ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "#", "enter"],
        ["shift", "\\", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "↑", "shift"],
    ]
    bottom = [(-6.5, "ctrl"), (-5.5, "fn"), (-4.5, "⊞"), (-3.5, "alt"), (2.5, "alt"), (3.5, "ctrl"), (4.5, "←"), (5.5, "↓"), (6.5, "→")]
    x0, y0, x1, y1 = LAP_BOUNDS
    ppm = 2800 / (x1 - x0)            # pixels per metre
    W, H = 2800, int(round((y1 - y0) * ppm))
    c = Canvas(W, H, (0, 0, 0, 0), s=1)
    big, small = font("500", 40), font("500", 24)
    col = (255, 255, 255, 255)

    def put(xm, ym, label):
        px, py = (xm - x0) * ppm, (y1 - ym) * ppm
        f = big if len(label) == 1 else small
        c.text(px, py, label, f, col, anchor="mm")

    for r, row in enumerate(rows):
        ym = LAP_Y0 + (2.5 - r) * LAP_PITCH
        for k, label in enumerate(row):
            put((-6.5 + k) * LAP_PITCH, ym, label)
    yb = LAP_Y0 - 2.5 * LAP_PITCH - 0.0005
    for xu, label in bottom:
        put(xu * LAP_PITCH, yb, label)
    c.save(os.path.join(TEX, "laptop_legends.png"), mode="RGBA")


def keycap_legend():
    legend = content_value("keycapLegend", "HOLD")
    W, H = 1024, 512
    c = Canvas(W, H, (0, 0, 0, 0))
    f = font("500", 150)
    c.text(W / 2, H / 2 + 6, legend, f, (255, 255, 255, 255), anchor="mm")
    c.save(os.path.join(TEX, "keycap_legend.png"), mode="RGBA")


def gboard_placeholder(force=False):
    path = os.path.join(ROOT, "assets", "screenshots", "gboard.png")
    if os.path.exists(path) and not force:
        print("kept existing", os.path.relpath(path, ROOT))
        return
    W, H = 1080, 2340
    c = Canvas(W, H, (22, 23, 27, 255))
    c.rect(0, H - 860, W, 1, fill=(42, 43, 48))
    kw, kh = 84, 120
    for r, n in enumerate([10, 9, 7]):
        x0 = (W - (n * kw + (n - 1) * 18)) / 2
        for i in range(n):
            c.rect(x0 + i * (kw + 18), H - 760 + r * 150, kw, kh, outline=(52, 54, 60), width=2, r=10)
    c.text(W / 2, 760, "PLACEHOLDER", mono(40), FG2, anchor="mm")
    c.text(W / 2, 880, "Gboard screenshot", font("500", 64), FG, anchor="mm")
    c.text(W / 2, 980, "replace this file with the real one:", font("400", 40), FG2, anchor="mm")
    c.text(W / 2, 1060, "assets/screenshots/gboard.png", mono(38), FG2, anchor="mm")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    c.save(path)


if __name__ == "__main__":
    only = sys.argv[1:]
    if not only or "screens" in only:
        phone_voice()
        phone_keyboard()
        laptop_screen()
    if not only or "legend" in only:
        keycap_legend()
        laptop_legends()
    if not only or "placeholder" in only:
        gboard_placeholder(force="--force" in only)
