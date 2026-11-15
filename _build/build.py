"""共通ヘッダ・フッタを付けて静的ページを書き出す。

使い方（リポジトリの直下で）: python -I _build/build.py
本文は _build/pages/*.html。各ファイルの先頭に次の形の見出しを書く。
    title: ページ名
    desc: 説明（meta description）
    out: 出力先（例 koyaku/index.html）
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
UPDATED = "2026-11-15"
BRAND = "PS Tool Factory"

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
    ("/privacy.html", "プライバシーポリシー"),
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


def render(meta, body):
    out = meta["out"]
    title = meta["title"]
    full_title = BRAND if out == "index.html" else f"{title} | {BRAND}"
    desc = meta.get("desc", "")
    url = url_of(out)
    cur = ' aria-current="page"'
    nav = " ".join(f'<a href="{h}"{cur if h == url else ""}>{t}</a>' for h, t in NAV)
    foot = " ".join(f'<a href="{h}">{t}</a>' for h, t in FOOT)
    desc_tag = f'<meta name="description" content="{html.escape(desc)}">\n' if desc else ""
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(full_title)}</title>
{desc_tag}<link rel="canonical" href="{SITE}{url}">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="site-header">
<a class="brand" href="/">{BRAND}<small>個人開発の記録アプリ</small></a>
<nav aria-label="サイト内">{nav}</nav>
</header>
<main>
{body}</main>
<footer class="site-footer">
<p>このサイトで紹介するアプリは、18歳以上の方を対象としています。遊技はご自身の判断で、のめり込みに注意し、無理のない範囲でお楽しみください。生活に支障が出るときは、相談窓口へ（お住まいの地域の精神保健福祉センターなど）。</p>
<nav aria-label="サイト情報">{foot}</nav>
<p>運営: {BRAND}（luckys4900）／ 最終更新: {UPDATED}</p>
<p>&copy; 2026 luckys4900</p>
</footer>
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
