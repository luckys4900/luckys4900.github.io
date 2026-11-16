// ヒカリ画像の表示監査（ブラウザのコンソール、またはブラウザ操作ツールで実行する）
// 使い方: ページを開き、全体を一度スクロールして遅延読み込み・表示アニメーションを出し切ってから、この関数を実行する。
// 調べること:
//   CLIPPED  … 画像が親要素の overflow や画面の端で切れている（見えている面積が 99% 未満）
//   OVERLAP  … 画像が、文字・ボタン・カードなど別の内容と 4px 以上重なっている
//   UNLOADED … 画像が読み込めていない
// 戻り値: { width, issues: [...] }。issues が空なら合格。
async function auditHikari() {
  for (let y = 0; y < document.documentElement.scrollHeight; y += 300) {
    scrollTo(0, y);
    await new Promise(r => setTimeout(r, 60));
  }
  // 遅延読み込みの画像も含めて、全部の読み込みを待つ
  await Promise.all([...document.images].filter(i => /\/img\/hikari\//.test(i.src)).map(i => {
    i.loading = 'eager';
    return Promise.race([i.decode().catch(() => {}), new Promise(r => setTimeout(r, 4000))]);
  }));
  scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 900));

  const abs = el => {
    const r = el.getBoundingClientRect();
    return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY, w: r.width, h: r.height };
  };
  const inter = (a, b) => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) });
  const area = x => Math.max(0, x.r - x.l) * Math.max(0, x.b - x.t);
  const name = el => {
    const s = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
    const sec = el.closest('section');
    return s + (sec ? ' @' + (sec.id || sec.className || 'section') : '');
  };

  // 要素のうち、overflow が visible でない祖先の内側に収まって実際に見えている範囲
  const visibleRect = el => {
    let v = abs(el);
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (/(hidden|clip|auto|scroll)/.test(s.overflow + s.overflowX + s.overflowY)) v = inter(v, abs(a));
    }
    return v;
  };

  const issues = [];
  const imgs = [...document.querySelectorAll('img')].filter(i => /\/img\/hikari\//.test(i.currentSrc || i.src));
  // 重なりを調べる相手: 文字や操作部品を持つ要素（画像自身の祖先・子孫は除く）
  const content = [...document.querySelectorAll('h1,h2,h3,h4,p,li,a,button,figure,.tile,.card,[class*=card],[class*=box],[class*=step],[class*=pt-]')]
    .filter(e => {
      const cs = getComputedStyle(e);
      // aria-hidden の飾り（背景の透かし文字など）は、重なってよい前提なので除く
      return cs.visibility !== 'hidden' && cs.display !== 'none' && e.getBoundingClientRect().width > 0 && !e.closest('.hk-fab') && !e.closest('[aria-hidden="true"]');
    });

  for (const img of imgs) {
    const cs = getComputedStyle(img);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (img.closest('.hk-fab')) continue; // 右下の追従ボタンは固定表示なので対象外
    if (!img.complete || img.naturalWidth === 0) { issues.push({ type: 'UNLOADED', img: name(img), src: img.currentSrc }); continue; }
    const R = abs(img);
    if (R.w < 2 || R.h < 2) continue;
    const isIcon = !!img.closest('.hk-ic'); // 円形アイコンは円の中で切り抜いて見せる設計なので、切れの検査は対象外

    // 1) 切れ: overflow が visible でない祖先との共通部分と、ページの横幅
    if (!isIcon) {
      let vis = { ...R };
      for (let a = img.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (/(hidden|clip|auto|scroll)/.test(s.overflow + s.overflowX + s.overflowY)) {
          const A = abs(a);
          // 横スクロールのカルーセルは、スクロールで見られるので横方向の切れは数えない
          const scrollX = /(auto|scroll)/.test(s.overflowX);
          vis = inter(vis, { l: scrollX ? vis.l : A.l, r: scrollX ? vis.r : A.r, t: A.t, b: A.b });
        }
      }
      vis = inter(vis, { l: 0, r: document.documentElement.clientWidth, t: -1e9, b: 1e9 });
      const ratio = area(vis) / area(R);
      if (ratio < 0.99) issues.push({ type: 'CLIPPED', img: name(img), src: (img.currentSrc || '').split('/').pop(), visible: Math.round(ratio * 1000) / 10 + '%' });
    }

    // 1b) はみ出し: 画像の入っているカード・帯（背景色や角丸を持つ一番近い祖先）の外へ 2px 以上出ている
    // 1c) 切り口: 素材の中で人物が画像の端で切れている（端の列に人物の画素が 15% 以上ある）のに、
    //     その端がカード・帯の端とそろっていない（カードの途中で体がぷつりと終わって見える）
    if (!isIcon) {
      let card = null;
      for (let a = img.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a);
        const bg = s.backgroundColor, hasBg = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg);
        if (hasBg || s.backgroundImage !== 'none' || parseFloat(s.borderTopLeftRadius) > 0) { card = a; break; }
      }
      if (card) {
        const K = abs(card), sK = getComputedStyle(card);
        const clips = /(hidden|clip)/.test(sK.overflow + sK.overflowX + sK.overflowY);
        const out = { l: K.l - R.l, t: K.t - R.t, r: R.r - K.r, b: R.b - K.b };
        if (!clips && Math.max(out.l, out.t, out.r, out.b) > 2) {
          issues.push({ type: 'PROTRUDE', img: name(img), src: (img.currentSrc || '').split('/').pop(), card: name(card), px: JSON.stringify(Object.fromEntries(Object.entries(out).filter(([, v]) => v > 2).map(([k, v]) => [k, Math.round(v)]))) });
        }
        // 素材の端に人物が掛かっているかを、縮小した画像で調べる
        try {
          const cv = document.createElement('canvas'); const W = 120, H = Math.max(1, Math.round(120 * img.naturalHeight / img.naturalWidth));
          cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, W, H);
          const d = g.getImageData(0, 0, W, H).data;
          // 人物の画素: 不透明で、白い背景や薄い灰色の影（3 色とも 215 超）ではないもの
          const subj = (x, y) => { const i = (y * W + x) * 4; return d[i + 3] > 40 && !(d[i] > 215 && d[i + 1] > 215 && d[i + 2] > 215); };
          const frac = (pts) => pts.filter(([x, y]) => subj(x, y)).length / pts.length;
          const edges = {
            b: frac([...Array(W).keys()].map(x => [x, H - 1])),
            t: frac([...Array(W).keys()].map(x => [x, 0])),
            l: frac([...Array(H).keys()].map(y => [0, y])),
            r: frac([...Array(H).keys()].map(y => [W - 1, y])),
          };
          // 見えている（切れた後の）画像の端と、カードの端の差
          const flush = { b: Math.abs(Math.min(R.b, clips ? K.b : R.b) - K.b), t: Math.abs(Math.max(R.t, clips ? K.t : R.t) - K.t), l: Math.abs(Math.max(R.l, clips ? K.l : R.l) - K.l), r: Math.abs(Math.min(R.r, clips ? K.r : R.r) - K.r) };
          for (const k of ['b', 'l', 'r']) { // 上端は帽子・髪で切れても目立ちにくいので下・左・右を見る
            // 切り口がカードの外（overflow で隠れる側）にあるなら見えないので問題なし
            const hiddenByClip = clips && ((k === 'b' && R.b > K.b + 1) || (k === 'l' && R.l < K.l - 1) || (k === 'r' && R.r > K.r + 1));
            if (edges[k] >= 0.15 && !hiddenByClip && flush[k] > 2) {
              issues.push({ type: 'CUT_EDGE', img: name(img), src: (img.currentSrc || '').split('/').pop(), edge: k, subjectOnEdge: Math.round(edges[k] * 100) + '%', gapToCardEdge: Math.round(flush[k]) + 'px' });
            } else if (edges[k] >= 0.15) {
              // ユーザー判断（2026-11-16）: 切り口を枠の端にそろえても「体が途中で切れた画像」に見えるので不可。
              // 円形の顔アイコン以外では、人物が素材の下・左・右の端で切れている画像は使わない（全身がそろった素材を使う）。
              issues.push({ type: 'CUT_SOURCE', img: name(img), src: (img.currentSrc || '').split('/').pop(), edge: k, subjectOnEdge: Math.round(edges[k] * 100) + '%' });
            }
          }
        } catch (e) { issues.push({ type: 'PIXEL_CHECK_FAILED', img: name(img), err: String(e) }); }
      }
    }

    // 2) 重なり: 画像の祖先でも子孫でもない内容要素と 4px 以上重なる
    const own = img.closest('figure,.hero-hk,.hk-ic,[class*=hk-]') || img.parentElement;
    for (const c of content) {
      if (c.contains(img) || img.contains(c) || own.contains(c) || c.contains(own)) continue;
      // 両方とも「実際に見えている部分」どうしで比べる（overflow で隠れている部分は重なりに数えない）
      const C = visibleRect(c);
      const I = inter(visibleRect(img), C);
      const w = I.r - I.l, h = I.b - I.t;
      if (w > 4 && h > 4) {
        issues.push({ type: 'OVERLAP', img: name(img), src: (img.currentSrc || '').split('/').pop(), with: name(c), text: (c.innerText || '').trim().slice(0, 24), px: Math.round(w) + 'x' + Math.round(h) });
      }
    }
  }
  // 同じ画像と同じ相手の重複報告をまとめる
  const seen = new Set();
  const uniq = issues.filter(x => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; });
  return { width: innerWidth, count: uniq.length, issues: uniq };
}
