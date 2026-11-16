// 5 ページを同じ幅で続けて検査する（同じオリジンの iframe に読み込んで auditHikari を実行）
// 使い方: ローカルサーバーのページで eval してから await auditAllPages() を呼ぶ。
async function auditAllPages() {
  const pages = ['/', '/works/', '/works/youtube.html', '/works/hikari.html', '/works/reports.html'];
  const src = await (await fetch('/_build/audit_hikari.js?' + Date.now())).text();
  const out = {};
  for (const p of pages) {
    const f = document.createElement('iframe');
    f.style.cssText = `position:fixed;left:0;top:0;width:${innerWidth}px;height:${innerHeight}px;border:0;opacity:0;pointer-events:none;z-index:-1`;
    document.body.appendChild(f);
    await new Promise(r => { f.onload = r; f.src = p + '?audit=' + Date.now(); });
    const w = f.contentWindow;
    w.eval(src);
    const r = await w.auditHikari();
    out[p] = r.count ? r.issues : 0;
    f.remove();
  }
  return { width: innerWidth, result: out };
}
