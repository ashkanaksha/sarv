# Builds presentation/media from the source folders next to the presentation.
# Re-run it whenever you add, remove or rename files in those folders:
#     python presentation/tools/prep_media.py
# A world is rebuilt from scratch when its source files change, and every item keeps its
# source file name ("name") and subfolder ("group"), so js/data.js can refer to files by name.
import os, glob, json, shutil, subprocess
from PIL import Image, ImageOps
import imageio_ffmpeg

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "presentation", "media")
FF = imageio_ffmpeg.get_ffmpeg_exe()

WORLDS = [
    ("music",       ["موسیقی"]),
    ("uni",         ["دانشگاه", "تئاتر"]),
    ("sculpture",   ["مجسمه سازی"]),
    ("argo",        ["آرگو"]),
    ("factory",     ["ایرانمال هفت و هشت"]),
    ("eureka",      ["یوریکا"]),
    ("bysarv",      ["پرسونال برند bysarv"]),
    ("pedar",       ["کار برای پدر"]),
    ("phase2",      ["فاز 2 کارگاه"]),
    ("competition", ["مسابقه معماری"]),
    ("qaraylou",    ["قرایلو استودیو"]),
    ("radikal",     ["رادیکال بتن"]),
]
IMG = (".jpg", ".jpeg", ".png")
VID = (".mp4",)


def sources(dirs):
    out = []
    for d in dirs:
        base = os.path.join(ROOT, d)
        for f in sorted(glob.glob(os.path.join(base, "**", "*"), recursive=True)):
            ext = os.path.splitext(f)[1].lower()
            if ext not in IMG + VID:
                continue
            rel = os.path.relpath(f, base).replace("\\", "/")
            sub = os.path.dirname(rel)
            group = sub if sub else (d if len(dirs) > 1 else "")
            out.append({"path": f, "name": rel, "group": group, "dir": d,
                        "size": os.path.getsize(f), "mtime": int(os.path.getmtime(f))})
    return out


def build_image(src, dst, th):
    im = Image.open(src); im.draft("RGB", (2400, 2400)); im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); bg = Image.new("RGB", im.size, (245, 245, 243)); bg.paste(im, mask=im.split()[-1]); im = bg
    im = im.convert("RGB")
    big = im.copy(); big.thumbnail((1920, 1920), Image.LANCZOS); big.save(dst, quality=84, optimize=True, progressive=True)
    sm = im.copy(); sm.thumbnail((520, 520), Image.LANCZOS); sm.save(th, quality=80)


def build_video(src, dst, poster):
    if os.path.getsize(src) > 40e6:   # heavy file -> 1080p web encode, metadata stripped
        subprocess.run([FF, "-v", "error", "-y", "-i", src, "-map_metadata", "-1", "-c:v", "libx264", "-crf", "24", "-preset", "medium",
                        "-vf", "scale='min(1920,iw)':-2", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", dst], check=True)
    else:
        shutil.copyfile(src, dst)
    subprocess.run([FF, "-v", "error", "-y", "-ss", "2", "-i", dst, "-frames:v", "1", "-vf", "scale=520:-2", poster], check=True)


manifest = {}
for wid, dirs in WORLDS:
    folder = os.path.join(OUT, wid)
    src = sources(dirs)
    stamp = [[s["name"], s["dir"], s["size"], s["mtime"]] for s in src]
    stamp_file = os.path.join(folder, "sources.json")
    old = json.load(open(stamp_file, encoding="utf-8")) if os.path.exists(stamp_file) else None
    if old != stamp:
        shutil.rmtree(folder, ignore_errors=True)
        print(f"{wid}: rebuilding ({len(src)} files)")
    os.makedirs(os.path.join(folder, "thumb"), exist_ok=True)
    items = []
    for n, s in enumerate(src, 1):
        ext = os.path.splitext(s["path"])[1].lower()
        if ext in IMG:
            name = f"{n:02d}.jpg"
            dst, th = os.path.join(folder, name), os.path.join(folder, "thumb", name)
            if not os.path.exists(dst):
                build_image(s["path"], dst, th)
            w, h = Image.open(dst).size
            items.append({"type": "image", "src": f"media/{wid}/{name}", "thumb": f"media/{wid}/thumb/{name}",
                          "w": w, "h": h, "name": s["name"], "group": s["group"]})
        else:
            name = f"{n:02d}.mp4"
            dst, poster = os.path.join(folder, name), os.path.join(folder, "thumb", f"{n:02d}.jpg")
            if not os.path.exists(dst):
                build_video(s["path"], dst, poster)
            w, h = Image.open(poster).size
            items.append({"type": "video", "src": f"media/{wid}/{name}", "thumb": f"media/{wid}/thumb/{n:02d}.jpg",
                          "w": w, "h": h, "name": s["name"], "group": s["group"]})
    json.dump(stamp, open(stamp_file, "w", encoding="utf-8"), ensure_ascii=False)
    manifest[wid] = items

# background music: "BACKGROUND MUSIC.mp4" next to the presentation (falls back to the choir recording).
# Rebuilt whenever the source file changes. Fades in at the start and out at the end so the loop is seamless.
os.makedirs(os.path.join(OUT, "audio"), exist_ok=True)
aud = os.path.join(OUT, "audio", "intro.mp3")
music_src = next((os.path.join(ROOT, f) for f in os.listdir(ROOT) if f.lower().startswith("background music")),
                 os.path.join(ROOT, "موسیقی", "هراتی.mp4"))
stamp = [os.path.basename(music_src), os.path.getsize(music_src), int(os.path.getmtime(music_src))]
stamp_file = os.path.join(OUT, "audio", "source.json")
if not os.path.exists(aud) or not os.path.exists(stamp_file) or json.load(open(stamp_file, encoding="utf-8")) != stamp:
    probe = subprocess.run([FF, "-i", music_src], capture_output=True, text=True, encoding="utf-8", errors="ignore").stderr
    h, m, sec = probe.split("Duration: ")[1].split(",")[0].split(":")
    dur = int(h) * 3600 + int(m) * 60 + float(sec)
    subprocess.run([FF, "-v", "error", "-y", "-i", music_src, "-vn", "-map_metadata", "-1",
                    "-af", f"afade=t=in:d=3,afade=t=out:st={max(0, dur - 3):.2f}:d=3",
                    "-c:a", "libmp3lame", "-q:a", "2", aud], check=True)
    json.dump(stamp, open(stamp_file, "w", encoding="utf-8"), ensure_ascii=False)
    print("music:", os.path.basename(music_src), f"({dur:.0f}s)")

# logo: crop + white-on-transparent PNG
lg = Image.open(os.path.join(ROOT, "logo sarv.png")).convert("RGBA")
lg = lg.crop(lg.getbbox()); lg.thumbnail((900, 900), Image.LANCZOS)
pad = Image.new("RGBA", (lg.width + 80, lg.height + 80), (0, 0, 0, 0)); pad.paste(lg, (40, 40))
pad.save(os.path.join(OUT, "logo.png"))

with open(os.path.join(OUT, "manifest.js"), "w", encoding="utf-8") as fh:
    fh.write("// generated by tools/prep_media.py — do not edit by hand\nexport const MEDIA = "
             + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n")
for wid, items in manifest.items():
    print(f"  {wid:12s} {len(items):3d} items")
print("done")
