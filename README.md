# PS Tool Factory（luckys4900.github.io）

個人で作っている Android の記録アプリ「小役番長」「遊技収支ノート」の紹介サイトです（18歳以上向け。遊技・賭け・換金の機能はありません）。

## 編集のしかた

- 各ページの本文は `_build/pages/*.html`（先頭に title / desc / out を書く）。
- `python -I _build/build.py` で共通ヘッダ・フッタを付けた HTML と `sitemap.xml` を書き出す。
- `_build/` は先頭が `_` のため GitHub Pages では公開されない。
- `/privacy.html` などのポリシーの URL は Play Console に登録済みのため変えないこと。

お問い合わせは Issues へ（個人情報や収支の記録は書かないでください）。
