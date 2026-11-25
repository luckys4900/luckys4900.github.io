"""画像の縮小版（webp）を作り、HTML の <img>・<source> に srcset / sizes を付ける。build.py から呼ばれる。

- 元画像: img/**/*.webp と img/hikari/master/*.png（元の幅が 480px を超えるもの。PNG は小さい顔アイコンなので 240px 版も作る）。
- 縮小版の置き場所の規則: img/r/<元の img/ からの相対パス（拡張子なし）>-<幅>w.webp
    例: img/works/pf/bigkatsu-howto.webp -> img/r/works/pf/bigkatsu-howto-480w.webp, -960w.webp
  幅は 480・960・1440 のうち、元の幅より小さいものだけ（拡大はしない）。縦横比は元のまま。
  元画像は srcset の最大の候補（元の幅の w 記述子）として残す。縮小版の方が小さくならない場合は作らない。
- 元画像の中身が変わったときだけ作り直す（_build/images.lock.json にハッシュを記録）。
- sizes: _build/sizes.json（画像の親要素のクラスの並び -> sizes の文字列）。
  実測して作り直すには、サイトを配信してから `node _build/measure_sizes.cjs <base_url>`。キーがなければ 100vw 相当。
"""
import hashlib
import io
import json
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img")
OUT = os.path.join(IMG, "r")
LOCK = os.path.join(ROOT, "_build", "images.lock.json")
SIZES = os.path.join(ROOT, "_build", "sizes.json")
WIDTHS = (480, 960, 1440)
SMALL_PNG_WIDTHS = (240,)
QUALITY = 80
IGNORE_CLASSES = {"reveal", "in", "js", "is-fold", "fade-l", "fade-r"}
VOID = {"img", "source", "br", "hr", "meta", "link", "input", "wbr", "area", "base", "col", "embed", "param", "track"}

_lock = None
_sizes = None


def _load(p):
    try:
        return json.load(io.open(p, encoding="utf-8"))
    except Exception:
        return {}


def _hash(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:16]


def _rel(src):
    """'/img/works/x.webp' -> 'works/x.webp'（img/ 直下からの相対）。対象外なら None。"""
    if not src.startswith("/img/") or src.startswith("/img/r/"):
        return None
    rel = src[len("/img/"):]
    if not rel.lower().endswith((".webp", ".png")):
        return None
    if rel.lower().endswith(".png") and not rel.startswith("hikari/master/"):
        return None
    return rel


def variants(src):
    """src に対する [(幅, URL)] を、小さい順に返す（元画像を最後に含む）。対象外・縮小版なしは []。"""
    global _lock
    if _lock is None:
        _lock = _load(LOCK)
    rel = _rel(src)
    if rel is None:
        return []
    path = os.path.join(IMG, *rel.split("/"))
    if not os.path.exists(path):
        return []
    from PIL import Image
    h = _hash(path)
    stem = os.path.splitext(rel)[0]
    with Image.open(path) as im:
        ow, oh = im.size
        widths = [w for w in (SMALL_PNG_WIDTHS if rel.endswith(".png") else ()) if w < ow] + [w for w in WIDTHS if w < ow]
        if not widths:
            return []
        res = []
        osz = os.path.getsize(path)
        for w in widths:
            op = os.path.join(OUT, *(f"{stem}-{w}w.webp").split("/"))
            url = f"/img/r/{stem}-{w}w.webp"
            ok = _lock.get(f"{rel}|{w}") == h and os.path.exists(op)
            if not ok:
                os.makedirs(os.path.dirname(op), exist_ok=True)
                nh = max(1, round(oh * w / ow))
                r = im.convert("RGBA") if _has_alpha(im) else im.convert("RGB")
                r = r.resize((w, nh), Image.LANCZOS)
                r.save(op, "WEBP", quality=QUALITY, method=6, alpha_quality=100)
                _lock[f"{rel}|{w}"] = h
            if os.path.getsize(op) < osz:
                res.append((w, url))
    if not res:
        return []
    # 元画像（PNG の場合は元の形式のまま）を最大候補に
    res.append((ow, src))
    return res


def _has_alpha(im):
    if im.mode == "RGBA":
        return im.getchannel("A").getextrema()[0] < 255
    return "transparency" in im.info or im.mode in ("LA", "PA")


def save_lock():
    if _lock is not None:
        s = json.dumps(_lock, ensure_ascii=False, indent=0, sort_keys=True) + "\n"
        if not os.path.exists(LOCK) or io.open(LOCK, encoding="utf-8").read() != s:
            io.open(LOCK, "w", encoding="utf-8", newline="\n").write(s)


def _key(stack):
    """親要素のクラスの並び（直近 2 つ）。measure_sizes.cjs と同じ作り方。"""
    parts = []
    for tag, classes in reversed(stack[-2:]):
        cl = [c for c in classes if c not in IGNORE_CLASSES]
        parts.append(tag + ("." + ".".join(cl) if cl else ""))
    return " < ".join(parts)


class _Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.items = []  # (tag名, key) を <img>・<source> の出現順に

    def handle_starttag(self, tag, attrs):
        if tag in ("img", "source"):
            self.items.append((tag, _key(self.stack)))
            return
        if tag in VOID:
            return
        cls = dict(attrs).get("class") or ""
        self.stack.append((tag, cls.split()))

    def handle_startendtag(self, tag, attrs):
        if tag in ("img", "source"):
            self.items.append((tag, _key(self.stack)))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break


def _sizes_for(key):
    global _sizes
    if _sizes is None:
        _sizes = _load(SIZES)
    return _sizes.get(key)


def _srcset(vs):
    return ", ".join(f"{u} {w}w" for w, u in vs)


def apply(html_text):
    """HTML 全体の <img>・<source> に srcset / sizes を付ける（すでにある srcset は元画像だけの 1 本なら置き換える）。"""
    sc = _Scan()
    sc.feed(html_text)
    items = iter(sc.items)
    tag_re = re.compile(r"<(img|source)\b[^>]*>")

    def f(m):
        tag = m.group(0)
        name, key = next(items)
        am = re.search(r'\b(?:src|srcset)="(/img/[^"\s,]+)"', tag)
        if not am:
            return tag
        src = am.group(1)
        vs = variants(src)
        if not vs:
            return tag
        sizes = _sizes_for(key) or "100vw"
        if name == "img":
            if "srcset=" in tag:
                return tag
            return tag.replace(f'src="{src}"', f'src="{src}" srcset="{_srcset(vs)}" sizes="{sizes}"', 1)
        # <source srcset="単一の画像"> を置き換える
        if f'srcset="{src}"' not in tag:
            return tag
        return tag.replace(f'srcset="{src}"', f'srcset="{_srcset(vs)}" sizes="{sizes}"', 1)

    if len(tag_re.findall(html_text)) != len(sc.items):
        raise RuntimeError("images.apply: <img>/<source> の数が HTML パーサーと一致しません（コメントやスクリプト内の img?）")
    return tag_re.sub(f, html_text)
