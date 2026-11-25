"""Noto Sans JP のサブセット（woff2）を作る。build.py の最後から呼ばれる。

- 元: C:\\Windows\\Fonts\\NotoSansJP-VF.ttf（可変フォント、SIL Open Font License 1.1）
  環境変数 NOTO_SANS_JP_VF で別の場所を指定できる。
- 文字集合: 公開 HTML・style.css・main.js で実際に使う文字 + 基本の記号・英数・かな全部。
- 方式: 静的インスタンス 400 / 700 / 900（サイトが以前 Google Fonts から読んでいた 3 ウェイトと同じ。
  それ以外の font-weight はブラウザが最も近い 3 つのどれかに寄せるので、見た目は変わらない）。
- 文字集合・元フォント・方式が変わらなければ、ファイルを書き換えない（キャッシュを壊さない）。
- 出力: fonts/notosansjp-{400,700,900}.woff2 と、状態の記録 _build/fonts.lock.json（公開されない）。
"""
import hashlib
import html as _html
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get("NOTO_SANS_JP_VF", r"C:\Windows\Fonts\NotoSansJP-VF.ttf")
OUT_DIR = os.path.join(ROOT, "fonts")
LOCK = os.path.join(ROOT, "_build", "fonts.lock.json")
WEIGHTS = (400, 700, 900)
METHOD = "static-v1"
# 使う機能だけ残す（サイトは palt・kern・縦書き互換のみ使用。残りは容量の無駄: 全部残すと +18%）
FEATURES = ["palt", "kern", "vert", "vrt2", "vkrn", "vpal", "ccmp", "locl", "rvrn",
            "calt", "liga", "clig", "rlig", "mark", "mkmk"]


def base_chars():
    cs = set()
    for lo, hi in ((0x20, 0x7E), (0xA0, 0xFF), (0x2010, 0x2027), (0x2030, 0x203E), (0x2190, 0x2193),
                   (0x3000, 0x303F), (0x3041, 0x3096), (0x309B, 0x309F), (0x30A0, 0x30FF),
                   (0xFF01, 0xFF5E), (0xFF61, 0xFF9F)):
        cs.update(chr(c) for c in range(lo, hi + 1))
    return cs


def used_chars():
    cs = set()
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if not x.startswith((".", "_")) and x not in ("node_modules", "fonts", "img")]
        for fn in files:
            if fn.endswith((".html", ".css", ".js")):
                t = io.open(os.path.join(d, fn), encoding="utf-8").read()
                cs.update(_html.unescape(t))
    return {c for c in cs if ord(c) >= 0x20 and c not in "\x7f"}


def charset():
    return sorted(base_chars() | used_chars())


def _read_lock():
    try:
        return json.load(io.open(LOCK, encoding="utf-8"))
    except Exception:
        return {}


def _file_hash(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:10]


def font_versions():
    """build.py が head に書くための、各ウェイトの版番号（ファイルの中身のハッシュ）。"""
    v = {}
    for w in WEIGHTS:
        p = os.path.join(OUT_DIR, f"notosansjp-{w}.woff2")
        if os.path.exists(p):
            v[w] = _file_hash(p)
    return v


def _make(chars):
    from fontTools import subset
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    opts = subset.Options()
    opts.layout_features = FEATURES
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.hinting = False
    opts.flavor = None
    out = {}
    for w in WEIGHTS:
        f = TTFont(SRC)
        sub = subset.Subsetter(opts)
        sub.populate(text="".join(chars))
        sub.subset(f)
        inst = instancer.instantiateVariableFont(f, {"wght": w})
        inst.flavor = "woff2"
        b = io.BytesIO()
        inst.save(b)
        out[w] = b.getvalue()
    cmap = TTFont(SRC).getBestCmap()
    missing = [c for c in chars if ord(c) not in cmap]
    return out, missing


def run():
    """文字集合が変わったときだけ woff2 を作り直す。戻り値: (書き換えたか, 版番号 dict)。"""
    if not os.path.exists(SRC):
        print("fonts: 元のフォントがないため、既存の fonts/ をそのまま使います:", SRC)
        return False, font_versions()
    chars = charset()
    key = hashlib.sha256(("".join(chars) + "|" + METHOD + "|" + ",".join(FEATURES) + "|" + str(os.path.getsize(SRC))).encode("utf-8")).hexdigest()
    lock = _read_lock()
    if lock.get("key") == key and all(os.path.exists(os.path.join(OUT_DIR, f"notosansjp-{w}.woff2")) for w in WEIGHTS):
        return False, font_versions()
    data, missing = _make(chars)
    os.makedirs(OUT_DIR, exist_ok=True)
    for w, b in data.items():
        p = os.path.join(OUT_DIR, f"notosansjp-{w}.woff2")
        old = open(p, "rb").read() if os.path.exists(p) else None
        if old != b:
            open(p, "wb").write(b)
    io.open(LOCK, "w", encoding="utf-8", newline="\n").write(json.dumps(
        {"key": key, "chars": len(chars), "not_in_font": "".join(missing)}, ensure_ascii=False, indent=1) + "\n")
    print(f"fonts: {len(chars)} 文字で作り直し、" + "、".join(f"{w}={len(b)//1024}KiB" for w, b in data.items()))
    return True, font_versions()


if __name__ == "__main__":
    print(run())
