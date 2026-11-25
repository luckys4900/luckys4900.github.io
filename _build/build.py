"""共通ヘッダ・フッタを付けて静的ページを書き出す。

使い方（リポジトリの直下で）: python -I _build/build.py
本文は _build/pages/*.html。各ファイルの先頭に次の形の見出しを書く。
    title: ページ名
    desc: 説明（meta description）
    out: 出力先（例 koyaku/index.html）
    layout: wide（省略時は読み物用の狭い本文。wide は本文側で section/wrap を組む）
    ---
    （本文の HTML）
_build/ は先頭が _ のため、GitHub Pages（Jekyll）では公開されない。
"""
import html
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, "_build", "pages")
SITE = "https://luckys4900.github.io"
UPDATED = "2026-11-25"
BRAND = "PS Tool Factory"


def _asset_version(name):
    """CSS・JS の中身から版番号を作る。中身が変わると URL も変わり、古いキャッシュが使われなくなる。"""
    import hashlib
    with open(os.path.join(ROOT, name), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:10]


ASSET_V = {n: _asset_version(n) for n in ("style.css", "main.js")}
YT_URL = "https://www.youtube.com/@pachinko_iinkai"

NAV = [
    ("/", "トップ"),
    ("/koyaku/", "小役番長"),
    ("/ledger/", "遊技収支ノート"),
    ("/guide/", "読み物"),
    ("/works/", "制作実績"),
    ("/about.html", "運営者情報"),
]
FOOT = [
    ("/about.html", "運営者情報"),
    ("/site-privacy.html", "プライバシーポリシー（サイト）"),
    ("/privacy.html", "プライバシーポリシー（アプリ）"),
    ("/terms.html", "利用規約"),
    ("/contact.html", "お問い合わせ"),
    ("/disclosure.html", "広告・PR の開示"),
    ("/related.html", "関連サービス（PR）"),
    ("/changelog.html", "更新履歴"),
]


def parse(path):
    raw = io.open(path, encoding="utf-8").read()
    head, body = raw.split("\n---\n", 1)
    meta = {}
    for line in head.splitlines():
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip()
    return meta, body.strip() + "\n"


def url_of(out):
    if out == "index.html":
        return "/"
    if out.endswith("/index.html"):
        return "/" + out[: -len("index.html")]
    return "/" + out


LAZY_SKIP = {"contact.html", "privacy.html", "site-privacy.html"}


def add_lazy(body):
    """最初の画像（ファーストビュー）以外の <img> に loading=lazy を付ける。"""
    import re
    n = [0]
    def f(m):
        tag = m.group(0)
        n[0] += 1
        if n[0] == 1 or "loading=" in tag or "fetchpriority=" in tag:
            return tag
        return tag[:-1].rstrip("/").rstrip() + ' loading="lazy">' if not tag.endswith("/>") else tag[:-2].rstrip() + ' loading="lazy" />'
    return re.sub(r"<img[^>]*>", f, body)


def render(meta, body):
    out = meta["out"]
    if out not in LAZY_SKIP:
        body = add_lazy(body)
    title = meta["title"]
    full_title = f"{BRAND} | パチンコ・パチスロの制作工房" if out == "index.html" else f"{title} | {BRAND}（パチンコ・パチスロ）"
    desc = meta.get("desc", "")
    url = url_of(out)
    cur = ' aria-current="page"'
    def is_cur(h):
        return h == url or (h != "/" and h.endswith("/") and url.startswith(h)) or (h == "/guide/" and url.startswith("/guide/"))
    nav_inline = "".join(f'<a href="{h}"{cur if is_cur(h) else ""}>{t}</a>' for h, t in NAV if h != "/")
    menu_li = "".join(f'<li><a href="{h}"{cur if is_cur(h) else ""}>{t}</a></li>' for h, t in NAV)
    nav_li = "".join(f'<li><a href="{h}">{t}</a></li>' for h, t in NAV)
    foot_li = "".join(f'<li><a href="{h}">{t}</a></li>' for h, t in FOOT)
    desc_tag = f'<meta name="description" content="{html.escape(desc)}">\n' if desc else ""
    og_extra = ('<meta property="og:description" content="' + html.escape(desc) + '">' + chr(10)) if desc else ""
    layout = meta.get("layout", "page")
    if layout == "wide":
        main_html = '<main id="main" class="wide">\n' + body + '</main>'
    else:
        main_html = '<main id="main" class="page"><div class="prose">\n' + body + '</div></main>'
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(full_title)}</title>
{desc_tag}<link rel="canonical" href="{SITE}{url}">
<meta name="color-scheme" content="light dark">
<meta property="og:title" content="{html.escape(full_title)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}{url}">
{og_extra}<meta property="og:image" content="{SITE}/img/ogp.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&amp;family=Jost:wght@400;600&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css?v={ASSET_V['style.css']}">
<script src="/main.js?v={ASSET_V['main.js']}" defer></script>
</head>
<body>
<a class="skip" href="#main">本文へ移動</a>
<header class="site-header">
<div class="hd-bar">
<a class="logo" href="/"><small>PACHINKO / SLOT CREATIVE</small><b>{BRAND}</b></a>
<nav class="hd-nav" aria-label="サイト内">{nav_inline}</nav>
<div class="hd-cta"><a class="btn-out sm" href="{YT_URL}" rel="noopener">YouTube を見る</a><a class="btn-y sm" href="/contact.html">制作の相談をする</a></div>
<button type="button" class="hd-burger" id="hdBurger" aria-expanded="false" aria-controls="hdMenu" aria-label="メニューを開く"><i></i><i></i></button>
</div>
<div class="hd-menu" id="hdMenu" hidden>
<ul>{menu_li}</ul>
<p class="hd-menu-btns"><a class="btn-out" href="{YT_URL}" rel="noopener">YouTube を見る</a><a class="btn-y" href="/contact.html">制作の相談をする</a></p>
</div>
</header>
{main_html}
<footer class="site-footer">
<div class="wrap">
<div class="foot-grid">
<div>
<p class="fh">{BRAND}</p>
<p>パチンコ・パチスロ専門の制作工房です。分析・提案から、アプリ・Web・映像・レポートのデザイン、キャラクター・キャンペーンガールの制作、導線の構築まで、納品・公開後の運用まで一貫して担当します。</p>
<p><a href="/works/">制作実績を見る</a> ／ <a href="/contact.html">お問い合わせ</a></p>
</div>
<div>
<p class="fh">サイト内</p>
<ul>{nav_li}</ul>
</div>
<div>
<p class="fh">サイト情報</p>
<ul>{foot_li}</ul>
</div>
</div>
<div class="foot-note">
<p><span class="age">18+</span>このサイトで紹介するアプリは、18歳以上の方を対象としています。遊技はご自身の判断で、のめり込みに注意し、無理のない範囲でお楽しみください。生活に支障が出るときは、相談窓口へ（お住まいの地域の精神保健福祉センターなど）。</p>
<p class="ai-note">ヒカリ（サイトの案内役）は AI で生成したキャラクターです。実在の人物ではありません。</p>
<p>運営: {BRAND}（luckys4900）／ 最終更新: {UPDATED}</p>
<p>&copy; 2026 luckys4900</p>
</div>
</div>
</footer>
<div class="hk-fab" id="hkFab">
<div class="hk-menu" id="hkMenu" role="dialog" aria-label="ヒカリの案内（目次）" hidden>
<p class="hk-menu-say">どこに行く？ ヒカリが案内するね！</p>
<ul>{nav_li}</ul>
<p class="hk-menu-ai">AI で生成したキャラクターです。実在の人物ではありません。</p>
</div>
<p class="hk-tip" id="hkTip" aria-live="polite" hidden></p>
<button type="button" class="hk-fab-btn" id="hkBtn" aria-expanded="false" aria-controls="hkMenu" aria-label="ヒカリの案内を開く（目次）"><img src="/img/hikari/chibi-s00.webp" width="196" height="320" alt=""></button>
</div>
</body>
</html>
"""

def main():
    outs = []
    for name in sorted(os.listdir(PAGES)):
        if not name.endswith(".html"):
            continue
        meta, body = parse(os.path.join(PAGES, name))
        dst = os.path.join(ROOT, *meta["out"].split("/"))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        io.open(dst, "w", encoding="utf-8", newline="\n").write(render(meta, body))
        outs.append(meta["out"])
    # 公開用の全 HTML（_build で作らないページも含む）が、版番号付きの CSS・JS を読んでいるか確かめる。
    # 版番号がないと、以前に来た人のブラウザに古い CSS が残り、新しい HTML だけが崩れて表示される。
    bad = []
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if not x.startswith((".", "_"))]
        for fn in files:
            if fn.endswith(".html"):
                p = os.path.join(d, fn)
                t = io.open(p, encoding="utf-8").read()
                if 'href="/style.css"' in t or 'src="/main.js"' in t or (
                        "/style.css" in t and f"/style.css?v={ASSET_V['style.css']}" not in t):
                    bad.append(os.path.relpath(p, ROOT))
    if bad:
        print("版番号のない、または古い版番号の CSS・JS を読んでいるページ:\n  " + "\n  ".join(bad), file=sys.stderr)
        return 1
    # sitemap.xml
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for o in sorted(outs, key=lambda x: (x != "index.html", x)):
        lines.append(f"  <url><loc>{SITE}{url_of(o)}</loc><lastmod>{UPDATED}</lastmod></url>")
    lines.append("</urlset>")
    io.open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    print("\n".join(outs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
