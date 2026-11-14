# Builds a minimal, linear PowerPoint version of the presentation:
#     python presentation/tools/build_pptx.py
# Output: "sarvin docs/sarv - template.pptx". Text comes from js/data.js, images from media/.
import os, re, json, math
from PIL import Image, ImageDraw, ImageOps
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
PRES = os.path.dirname(HERE)
ROOT = os.path.dirname(PRES)
OUT = os.path.join(ROOT, "sarv - template.pptx")
CACHE = os.path.join(HERE, ".pptx_assets")
os.makedirs(CACHE, exist_ok=True)

BG, IVORY, MUTE, FAINT, ACCENT = "000000", "ECE8E1", "9A958E", "4D4A46", "D9B48A"
HEAD, BODY, MONO = "Segoe UI Light", "Segoe UI", "Consolas"

# ── read the text from js/data.js (single source of truth) ──────────────────
src = open(os.path.join(PRES, "js", "data.js"), encoding="utf-8").read()
man = open(os.path.join(PRES, "media", "manifest.js"), encoding="utf-8").read()
MEDIA = json.loads(man[man.index("{"):man.rindex("}") + 1])

def field(block, key):
    m = re.search(r"\b%s: '((?:[^'\\]|\\.)*)'" % key, block)
    return m.group(1).replace("\\'", "'") if m else ""

worlds_src = src[src.index("export const WORLDS"):src.index("WORLDS.forEach")]
WORLDS = []
for block in re.split(r"\n  \{ id: ", worlds_src)[1:]:
    wid = block.split("'")[1]
    w = {k: field(block, k) for k in ("year", "hero", "en", "fa", "short", "shortFa", "sub", "subFa", "blurb", "blurbFa")}
    w["label"] = w["short"] or w["en"]; w["labelFa"] = w["shortFa"] or w["fa"]
    w["id"] = wid; w["media"] = MEDIA.get(wid, [])
    w["n"] = f"{len(WORLDS) + 1:02d}"
    WORLDS.append(w)
IDX = {w["id"]: i for i, w in enumerate(WORLDS)}

edges_src = src[src.index("export const EDGES"):src.index("].map(([from")]
EDGES = []
for m in re.finditer(r"\['(\w+)', '(\w+)', '([^']*)', '([^']*)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\]", edges_src):
    EDGES.append(dict(f=IDX[m.group(1)], t=IDX[m.group(2)], k=m.group(3), kFa=m.group(4), text=m.group(5).replace("\\'", "'"), textFa=m.group(6)))

def hero(w):
    for m in w["media"]:
        if w["hero"] and (m["name"] == w["hero"] or m["name"].endswith("/" + w["hero"])):
            return m
    return next((m for m in w["media"] if m["type"] == "image"), None)

def media_path(m, big=True):
    return os.path.join(PRES, (m["src"] if big and m["type"] == "image" else m["thumb"]).replace("/", os.sep))

# ── image helpers ────────────────────────────────────────────────────────────
def trim(im):
    """Remove flat white or black frames (scans, screenshots) using row/column averages."""
    g = im.convert("L").resize((max(1, im.width // 4), max(1, im.height // 4)))
    W, H = g.size; px = g.load()
    col = [sum(px[x, y] for y in range(H)) / H for x in range(W)]
    row = [sum(px[x, y] for x in range(W)) / W for y in range(H)]
    flat = lambda v: v > 228 or v < 14
    l = 0
    while l < W // 4 and flat(col[l]): l += 1
    r = W
    while r > W * 3 // 4 and flat(col[r - 1]): r -= 1
    t = 0
    while t < H // 4 and flat(row[t]): t += 1
    b = H
    while b > H * 3 // 4 and flat(row[b - 1]): b -= 1
    if (l, t, r, b) != (0, 0, W, H):
        im = im.crop((l * 4 + 2 if l else 0, t * 4 + 2 if t else 0, r * 4 - 2 if r < W else im.width, b * 4 - 2 if b < H else im.height))
    return im

def cover(path, w_in, h_in, key, dpi=160, darken=0.0):
    out = os.path.join(CACHE, f"{key}.jpg")
    im = trim(ImageOps.exif_transpose(Image.open(path)).convert("RGB"))
    W, H = int(w_in * dpi), int(h_in * dpi)
    im = ImageOps.fit(im, (W, H), Image.LANCZOS)
    if darken:
        im = Image.blend(im, Image.new("RGB", im.size, (0, 0, 0)), darken)
    im.save(out, quality=86)
    return out

def circle(path, px, key, ring=True):
    out = os.path.join(CACHE, f"{key}.png")
    S = px * 4
    if path:
        im = ImageOps.fit(ImageOps.exif_transpose(Image.open(path)).convert("RGB"), (S, S), Image.LANCZOS).convert("RGBA")
    else:
        im = Image.new("RGBA", (S, S), (20, 20, 20, 255))
    mask = Image.new("L", (S, S), 0); ImageDraw.Draw(mask).ellipse((0, 0, S - 1, S - 1), fill=255)
    im.putalpha(mask)
    if ring:
        d = ImageDraw.Draw(im)
        d.ellipse((6, 6, S - 7, S - 7), outline=(236, 232, 225, 230), width=10)
    im.resize((px, px), Image.LANCZOS).save(out)
    return out

# ── pptx helpers ─────────────────────────────────────────────────────────────
prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
SW, SH = 13.333, 7.5
BLANK = prs.slide_layouts[6]

def rgb(h): return RGBColor.from_string(h)

def set_alpha(fill_or_line_color_elm, alpha):
    clr = fill_or_line_color_elm.find(qn("a:srgbClr"))
    a = etree.SubElement(clr, qn("a:alpha")); a.set("val", str(int(alpha * 100000)))

def new_slide(notes=""):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = rgb(BG)
    if notes:
        s.notes_slide.notes_text_frame.text = notes
    return s

def is_fa(t):
    fa = sum(1 for ch in t if '\u0600' <= ch <= '\u06ff')
    lat = sum(1 for ch in t if ch.isascii() and ch.isalpha())
    return fa > lat

def text(s, x, y, w, h, t, size=14, color=IVORY, font=BODY, align="l", rtl=None, anchor="t",
         spacing=None, line=None, bold=False, name=None, link=None):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name: tb.name = name
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}[anchor]
    if rtl is None: rtl = is_fa(t)
    if rtl and font in (MONO, HEAD): font = BODY
    lines = t.split("\n")
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = {"l": PP_ALIGN.LEFT, "c": PP_ALIGN.CENTER, "r": PP_ALIGN.RIGHT}[align]
        if line: p.line_spacing = line
        if rtl: p._pPr.set("rtl", "1") if p._pPr is not None else p._p.get_or_add_pPr().set("rtl", "1")
        r = p.add_run(); r.text = ln
        f = r.font; f.size = Pt(size); f.color.rgb = rgb(color); f.name = font; f.bold = bold
        rPr = r._r.get_or_add_rPr()
        for tag in ("a:ea", "a:cs"):
            e = rPr.find(qn(tag))
            if e is None: e = etree.SubElement(rPr, qn(tag))
            e.set("typeface", font if tag == "a:ea" and not rtl else BODY)
        if spacing is not None: rPr.set("spc", str(int(spacing * 100)))
        if rtl: rPr.set("lang", "fa-IR")
        if link: r.hyperlink.address = link
    return tb

def dot(s, cx, cy, d, color, alpha=None, name=None):
    sh = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx - d / 2), Inches(cy - d / 2), Inches(d), Inches(d))
    sh.fill.solid(); sh.fill.fore_color.rgb = rgb(color); sh.line.fill.background(); sh.shadow.inherit = False
    if alpha is not None: set_alpha(sh.fill._xPr.find(qn("a:solidFill")), alpha)
    if name: sh.name = name
    return sh

def hline(s, x1, y, x2, color=FAINT, width=0.75, dash=False, name=None):
    ln = s.shapes.add_connector(1, Inches(x1), Inches(y), Inches(x2), Inches(y))
    ln.line.color.rgb = rgb(color); ln.line.width = Pt(width)
    if dash:
        ln.line._get_or_add_ln().append(etree.fromstring('<a:prstDash xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="sysDot"/>'))
    if name: ln.name = name
    return ln

def curve(s, p0, p1, p2, color=IVORY, width=0.75, alpha=0.5, steps=40, name=None):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        pts.append((Inches(x), Inches(y)))
    fb = s.shapes.build_freeform(pts[0][0], pts[0][1], scale=1.0)
    fb.add_line_segments(pts[1:], close=False)
    sh = fb.convert_to_shape()
    sh.fill.background(); sh.shadow.inherit = False
    sh.line.color.rgb = rgb(color); sh.line.width = Pt(width)
    set_alpha(sh.line._get_or_add_ln().find(qn("a:solidFill")), alpha)
    if name: sh.name = name
    return sh

def pic(s, path, x, y, w=None, h=None, name=None):
    p = s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w) if w else None, Inches(h) if h else None)
    if name: p.name = name
    return p

# the linear motif: 12 dots on a thin line, the current world lit
TL_X1, TL_X2, TL_Y = 0.9, SW - 0.9, 6.95
def tl_x(i): return TL_X1 + (TL_X2 - TL_X1) * i / (len(WORLDS) - 1)
def timeline(s, active=-1):
    hline(s, TL_X1, TL_Y, TL_X2, FAINT, 0.75, dash=True, name="Timeline")
    for i, w in enumerate(WORLDS):
        on = i == active
        if on: dot(s, tl_x(i), TL_Y, 0.30, ACCENT, alpha=0.18)
        dot(s, tl_x(i), TL_Y, 0.13 if on else 0.075, ACCENT if on else (IVORY if i < active else FAINT), name=f"Timeline dot {w['n']}")
        text(s, tl_x(i) - 0.3, TL_Y + 0.13, 0.6, 0.2, w["n"], 8, ACCENT if on else FAINT, MONO, "c")

def chapter_mark(s, n, label):
    text(s, 0.75, 0.55, 3, 0.25, f"{n}  ·  {label}", 9, FAINT, MONO, spacing=2)

def logo_small(s):
    pic(s, LOGO_SMALL, SW - 0.75 - 0.22, 0.45, h=0.38, name="sarv logo")

LOGO = os.path.join(PRES, "media", "logo.png")
lg = Image.open(LOGO); LOGO_AR = lg.width / lg.height
LOGO_SMALL = LOGO

# ── 1. cover ─────────────────────────────────────────────────────────────────
s = new_slide("Cover. Let the room settle; the presentation starts in silence.")
pic(s, LOGO, SW / 2 - 1.3 * LOGO_AR, 1.55, h=2.6, name="sarv logo")
text(s, 0, 4.75, SW, 0.6, "Sarvin", 30, IVORY, HEAD, "c", spacing=6)
text(s, 0, 5.4, SW, 0.4, "سروین", 18, MUTE, BODY, "c")
text(s, 0, 6.6, SW, 0.3, "A PRESENTATION IN FOUR CHAPTERS", 9, FAINT, MONO, "c", spacing=4)

# ── 2. 01 Who am I? ──────────────────────────────────────────────────────────
s = new_slide("01 — Who am I? No explanation about the person: only the works. Music plays; let the image speak.")
sc = hero(WORLDS[IDX["sculpture"]])
pic(s, cover(media_path(sc), SW, SH, "who_bg", dpi=120, darken=0.55), 0, 0, SW, SH, name="Background image")
text(s, 0.9, 0.7, 3, 0.3, "01", 12, ACCENT, MONO, spacing=3)
text(s, 0.9, 4.6, 8, 1.1, "Who am I?", 60, IVORY, HEAD)
text(s, 0.9, 5.75, 8, 0.6, "آغاز: من کیستم؟", 24, MUTE, BODY, "l")

# ── 3. 02 divider ────────────────────────────────────────────────────────────
def divider(n, en, fa_, line, notes):
    s = new_slide(notes)
    text(s, 0.9, 2.2, 3, 0.4, n, 14, ACCENT, MONO, spacing=3)
    text(s, 0.9, 2.75, 11, 1.2, en, 54, IVORY, HEAD)
    text(s, 0.9, 3.95, 11, 0.6, fa_, 24, MUTE, BODY)
    text(s, 0.9, 5.2, 7.5, 0.8, line, 14, MUTE, BODY, line=1.3)
    return s

divider("02", "The Multiverse of Me", "جهان‌های من",
        "Every experience became a world of its own — one each year. Together, in order, they draw a single line.",
        "02 — Each activity is a world. Walk the audience through them in order, one per year.")

# ── 4. overview: the line of worlds ──────────────────────────────────────────
s = new_slide("The whole path at a glance — twelve worlds, earliest on the left, the present on the right.")
chapter_mark(s, "02", "THE MULTIVERSE OF ME"); logo_small(s)
text(s, 0.75, 0.95, 9, 0.7, "Twelve worlds, one line", 32, IVORY, HEAD)
text(s, 0.75, 1.65, 9, 0.4, "دوازده جهان، یک مسیر", 16, MUTE, BODY)
LY = 4.15
hline(s, 0.5, LY, SW - 0.5, FAINT, 0.75, dash=True, name="Line of time")
for i, w in enumerate(WORLDS):
    x = tl_x(i); h = hero(w)
    pic(s, circle(media_path(h, big=False) if h else None, 300, f"c_{w['id']}"), x - 0.38, LY - 0.38, 0.76, 0.76, name=f"World {w['n']}")
    up = i % 2 == 0
    ty = LY - 1.45 if up else LY + 0.55
    text(s, x - 0.7, ty, 1.4, 0.22, w["n"] + (f" · {w['year']}" if w["year"] else ""), 9, ACCENT, MONO, "c")
    text(s, x - 0.7, ty + 0.24, 1.4, 0.5, w["label"], 11, IVORY, BODY, "c", line=1.0)
    text(s, x - 0.7, ty + 0.68, 1.4, 0.3, w["labelFa"], 10, MUTE, BODY, "c")
text(s, 0.5, LY + 1.75, 2, 0.25, "PAST  ·  گذشته", 8, FAINT, MONO, spacing=2)
text(s, SW - 2.5, LY + 1.75, 2, 0.25, "PRESENT  ·  اکنون", 8, FAINT, MONO, "r", spacing=2)

# ── 5–16. one slide per world ────────────────────────────────────────────────
IX, IY, IW, IH = 0.75, 0.75, 6.85, 5.5
CX, CW = 8.15, SW - 0.75 - 8.15
for i, w in enumerate(WORLDS):
    s = new_slide(f"{w['n']} — {w['en']}. {w['blurb']}")
    h = hero(w)
    if h:
        pic(s, cover(media_path(h), IW, IH, f"w_{w['id']}"), IX, IY, IW, IH, name="Cover image")
    else:
        box = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(IX), Inches(IY), Inches(IW), Inches(IH))
        box.fill.solid(); box.fill.fore_color.rgb = rgb("0E0E0E"); box.line.color.rgb = rgb(FAINT); box.line.width = Pt(0.75)
        box.line._get_or_add_ln().append(etree.fromstring('<a:prstDash xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="dash"/>'))
        box.shadow.inherit = False; box.name = "Image placeholder"
        text(s, IX, IY + IH / 2 - 0.55, IW, 0.5, "Listen to the explanations :)", 24, IVORY, HEAD, "c")
        text(s, IX, IY + IH / 2 + 0.05, IW, 0.4, "به توضیحات گوش بدین (:", 16, MUTE, BODY, "c")
    text(s, CX, 0.8, CW, 0.3, f"{w['n']}  /  12" + (f"   ·   {w['year']}" if w["year"] else ""), 11, ACCENT, MONO, spacing=1)
    two = len(w["en"]) * 0.2 > CW
    text(s, CX, 1.2, CW, 1.1 if two else 0.6, w["en"], 32, IVORY, HEAD, anchor="t", line=0.95)
    fy = 2.3 if two else 1.85
    text(s, CX, fy, CW, 0.45, w["fa"], 18, MUTE, BODY, "l")
    y = fy + 0.65
    text(s, CX, y, CW, 0.3, w["sub"].upper(), 9, FAINT, MONO, spacing=1.5)
    text(s, CX, y + 0.4, CW, 0.9, w["blurb"], 14, IVORY, BODY, line=1.2)
    text(s, CX, y + 1.35, CW, 0.9, w["blurbFa"], 13, MUTE, BODY, "r", line=1.3)
    # three more works from the world
    others = [m for m in w["media"] if m is not h][:3]
    tw, gap = (CW - 0.2) / 3, 0.1
    for k, m in enumerate(others):
        pic(s, cover(media_path(m, big=False), tw, 0.95, f"t_{w['id']}_{k}", dpi=200), CX + k * (tw + gap), 5.3, tw, 0.95, name=f"Work {k + 1}")
    if len(w["media"]) > 4:
        text(s, CX, 6.3, CW, 0.2, f"+ {len(w['media']) - 1 - len(others)} more", 8, FAINT, MONO, "r")
    timeline(s, i)

# ── 17. 03 divider ───────────────────────────────────────────────────────────
divider("03", "Connecting the Dots", "اتصال نقطه‌ها",
        "The experiences were never separate. Each arc is an earlier world shaping a later one.",
        "03 — The most important part: how the seemingly scattered experiences shaped each other.")

# ── 18. the arcs ─────────────────────────────────────────────────────────────
s = new_slide("Every arc rises from an earlier world to a later one. The dots only connect looking backwards.")
chapter_mark(s, "03", "CONNECTING THE DOTS"); logo_small(s)
text(s, 0.75, 0.95, 9, 0.7, "How the worlds shaped each other", 32, IVORY, HEAD)
text(s, 0.75, 1.65, 9, 0.4, "هر کمان: جهانی قدیمی‌تر که جهان بعدی را شکل داد", 16, MUTE, BODY)
AY = 5.55
hline(s, 0.6, AY, SW - 0.6, FAINT, 0.75, dash=True)
for k, e in enumerate(EDGES):
    a, b = tl_x(e["f"]), tl_x(e["t"])
    span = abs(e["t"] - e["f"])
    curve(s, (a, AY), ((a + b) / 2, AY - 0.6 - span * 0.42), (b, AY), ACCENT if span >= 5 else IVORY, 0.9, 0.55 if span >= 5 else 0.35, name=f"Arc {e['k']}")
for i, w in enumerate(WORLDS):
    h = hero(w)
    pic(s, circle(media_path(h, big=False) if h else None, 200, f"c_{w['id']}_s"), tl_x(i) - 0.22, AY - 0.22, 0.44, 0.44, name=f"World {w['n']}")
    ly = AY + 0.32 + (0.42 if i % 2 else 0)
    text(s, tl_x(i) - 0.5, ly, 1.0, 0.2, w["n"], 8, ACCENT, MONO, "c")
    text(s, tl_x(i) - 0.6, ly + 0.2, 1.2, 0.4, w["label"], 9, MUTE, BODY, "c", line=1.0)

# ── 19. key connections ──────────────────────────────────────────────────────
s = new_slide("Four of the nineteen connections, told one by one.")
chapter_mark(s, "03", "CONNECTING THE DOTS"); logo_small(s)
text(s, 0.75, 0.95, 9, 0.7, "Four threads", 32, IVORY, HEAD)
text(s, 0.75, 1.65, 9, 0.4, "چهار رشته", 16, MUTE, BODY)
picks = [("music", "sculpture"), ("uni", "qaraylou"), ("sculpture", "competition"), ("competition", "radikal")]
cw, gx = (SW - 1.5 - 3 * 0.35) / 4, 0.35
for k, (fa_id, to_id) in enumerate(picks):
    e = next(e for e in EDGES if e["f"] == IDX[fa_id] and e["t"] == IDX[to_id])
    x = 0.75 + k * (cw + gx); y = 2.3
    card = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(cw), Inches(4.35))
    card.adjustments[0] = 0.04; card.fill.solid(); card.fill.fore_color.rgb = rgb("101010")
    card.line.color.rgb = rgb("262422"); card.line.width = Pt(0.75); card.shadow.inherit = False; card.name = f"Thread {k + 1}"
    A, B = WORLDS[e["f"]], WORLDS[e["t"]]
    pic(s, circle(media_path(hero(A), big=False), 240, f"c_{A['id']}_m"), x + 0.3, y + 0.3, 0.7, 0.7)
    pic(s, circle(media_path(hero(B), big=False), 240, f"c_{B['id']}_m"), x + cw - 1.0, y + 0.3, 0.7, 0.7)
    hline(s, x + 1.1, y + 0.65, x + cw - 1.1, ACCENT, 1)
    text(s, x + 0.3, y + 1.15, cw - 0.6, 0.25, f"{A['n']}  →  {B['n']}", 9, ACCENT, MONO, "c")
    text(s, x + 0.3, y + 1.4, cw - 0.6, 0.3, f"{A['en']} → {B['en']}", 11, MUTE, BODY, "c")
    text(s, x + 0.3, y + 1.8, cw - 0.6, 0.45, e["k"], 22, IVORY, HEAD, "c")
    text(s, x + 0.3, y + 2.3, cw - 0.6, 0.3, e["kFa"], 13, ACCENT, BODY, "c")
    text(s, x + 0.25, y + 2.7, cw - 0.5, 0.7, e["text"], 11, IVORY, BODY, "c", line=1.1)
    text(s, x + 0.25, y + 3.5, cw - 0.5, 0.65, e["textFa"], 11, MUTE, BODY, "c", line=1.2)

# ── 20. 04 All at Once ───────────────────────────────────────────────────────
s = new_slide("04 — All at once. Not as an architect, a musician or a sculptor, but as the person made of all these experiences.")
text(s, 0.9, 0.7, 3, 0.3, "04  ·  ALL AT ONCE", 9, FAINT, MONO, spacing=2)
CXc, CYc, R = SW / 2, 3.05, 2.35
for i, w in enumerate(WORLDS):
    a = math.pi / 2 - i / 12 * 2 * math.pi
    x, y = CXc + math.cos(a) * R * 1.35, CYc - math.sin(a) * R
    s_ln = s.shapes.add_connector(1, Inches(CXc), Inches(CYc), Inches(x), Inches(y))
    s_ln.line.color.rgb = rgb(FAINT); s_ln.line.width = Pt(0.5)
for i, w in enumerate(WORLDS):
    a = math.pi / 2 - i / 12 * 2 * math.pi
    x, y = CXc + math.cos(a) * R * 1.35, CYc - math.sin(a) * R
    h = hero(w)
    pic(s, circle(media_path(h, big=False) if h else None, 200, f"c_{w['id']}_r"), x - 0.27, y - 0.27, 0.54, 0.54, name=f"World {w['n']}")
dot(s, CXc, CYc, 2.1, BG)
pic(s, LOGO, CXc - 0.85 * LOGO_AR, CYc - 0.85, h=1.7, name="sarv logo")
text(s, 1.5, 5.85, SW - 3, 0.4, "Not an architect, a musician or a sculptor — a person made of every one of these.", 17, IVORY, HEAD, "c")
text(s, 1.5, 6.35, SW - 3, 0.4, "نه معمار، نه نوازنده، نه مجسمه‌ساز؛ انسانی که حاصل تمام این تجربه‌هاست.", 14, MUTE, BODY, "c")
text(s, SW - 3.0, 6.95, 2.25, 0.25, "@by.sarv", 10, ACCENT, MONO, "r", link="https://www.instagram.com/by.sarv/")
text(s, 0.75, 6.95, 3, 0.25, "SARVIN  ·  سروین", 9, FAINT, MONO, spacing=2)

# ── theme fonts/colours so edits in PowerPoint stay on-brand ────────────────
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
theme = prs.slide_master.part.part_related_by(RT.THEME)
xml = theme.blob.decode("utf-8")
xml = re.sub(r'(<a:majorFont>\s*<a:latin typeface=")[^"]*', r'\g<1>' + HEAD, xml)
xml = re.sub(r'(<a:minorFont>\s*<a:latin typeface=")[^"]*', r'\g<1>' + BODY, xml)
for tag, val in (("dk1", "000000"), ("lt1", IVORY), ("dk2", "1A1A1A"), ("lt2", MUTE), ("accent1", ACCENT), ("hlink", ACCENT), ("folHlink", ACCENT)):
    xml = re.sub(r'(<a:%s>)\s*<a:(?:sysClr|srgbClr)[^>]*/>' % tag, r'\1<a:srgbClr val="%s"/>' % val, xml)
xml = re.sub(r'<a:theme ([^>]*)name="[^"]*"', r'<a:theme \1name="sarv"', xml, count=1)
theme._blob = xml.encode("utf-8")
prs.core_properties.title = "sarv — Sarvin"
prs.core_properties.author = "sarv"

prs.save(OUT)
print("saved", OUT, len(prs.slides._sldIdLst), "slides")
