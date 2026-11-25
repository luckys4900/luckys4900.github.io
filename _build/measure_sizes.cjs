// 各 <img> の実際の表示幅を 4 つの幅（480・900・1200・1440）で測り、_build/sizes.json を作る。
// 使い方: サイトを配信してから  node _build/measure_sizes.cjs http://127.0.0.1:8930  [playwright のフォルダ]
// キー（親要素のクラスの並び）は _build/images.py の _key と同じ作り方。同じキーの画像は最大の幅を採る。
const fs = require('fs'), path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8930';
const pw = require(process.argv[3] || process.env.PLAYWRIGHT_PATH || 'playwright');
const ROOT = path.resolve(__dirname, '..');
const IGN = new Set(['reveal', 'in', 'js', 'is-fold', 'fade-l', 'fade-r']);
function pages(d, out) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name.startsWith('.') || f.name.startsWith('_') || f.name === 'img' || f.name === 'node_modules') continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) pages(p, out); else if (f.name.endsWith('.html')) out.push('/' + path.relative(ROOT, p).split(path.sep).join('/').replace(/index\.html$/, ''));
  }
  return out;
}
(async () => {
  const urls = pages(ROOT, []).filter(u => !/privacy|contact/.test(u));
  const b = await pw.chromium.launch();
  const BPS = [480, 900, 1200, 1440];
  const acc = {};
  for (const w of BPS) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await c.newPage();
    for (const u of urls) {
      await p.goto(base + u, { waitUntil: 'load' });
      const r = await p.evaluate((ign) => {
        document.querySelectorAll('.is-fold').forEach(e => e.classList.remove('is-fold'));
        const kf = (e) => { const parts = []; let n = e.parentElement; for (let k = 0; n && k < 2; k++, n = n.parentElement) { const cl = String(n.getAttribute('class') || '').split(/\s+/).filter(x => x && !ign.includes(x)); parts.push(n.tagName.toLowerCase() + (cl.length ? '.' + cl.join('.') : '')); } return parts.join(' < '); };
        return [...document.querySelectorAll('img')].map(i => [kf(i), i.getBoundingClientRect().width]);
      }, [...IGN]);
      for (const [k, wd] of r) { (acc[k] = acc[k] || {}); acc[k][w] = Math.max(acc[k][w] || 0, wd); }
    }
    await c.close();
  }
  await b.close();
  const out = {};
  for (const k of Object.keys(acc).sort()) {
    const v = BPS.map(w => Math.max(10, Math.ceil((acc[k][w] || 0) / 10) * 10));
    const parts = [];
    for (let i = 0; i < 3; i++) if (v[i] !== v[i + 1]) parts.push(`(max-width:${BPS[i]}px) ${v[i]}px`);
    parts.push(`${v[3]}px`);
    out[k] = parts.join(', ');
  }
  fs.writeFileSync(path.join(__dirname, 'sizes.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(Object.keys(out).length + ' keys');
})();
