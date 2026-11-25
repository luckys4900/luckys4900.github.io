/* PS Tool Factory — 最小限の動き（スクロール表示・制作実績の絞り込み） */
(function () {
  var d = document;
  d.documentElement.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = d.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }
  d.querySelectorAll("[data-filter-group]").forEach(function (bar) {
    var grid = d.getElementById(bar.getAttribute("data-filter-group"));
    if (!grid) return;
    bar.hidden = false;
    // P1-B: 「すべて」では各カテゴリの先頭 3 件だけ見せ、残りは「もっと見る」で展開する（HTML には全件ある）
    var SHOW = 3, groups = [], cur = null;
    Array.prototype.forEach.call(grid.children, function (el) {
      if (el.classList.contains("wk-say")) { cur = { cat: el.getAttribute("data-cat"), items: [], open: false }; groups.push(cur); }
      else if (cur && el.classList.contains("wk")) cur.items.push(el);
    });
    groups = groups.filter(function (g) { return g.items.length > SHOW; });
    groups.forEach(function (g) {
      var rest = g.items.slice(SHOW), ids = [];
      rest.forEach(function (el, i) { if (!el.id) el.id = "wk-" + g.cat + "-" + (SHOW + i + 1); ids.push(el.id); });
      g.rest = rest;
      g.wrap = d.createElement("div"); g.wrap.className = "wk-fold";
      g.btn = d.createElement("button"); g.btn.type = "button"; g.btn.className = "wk-fold-btn";
      g.btn.setAttribute("aria-controls", ids.join(" "));
      g.btn.addEventListener("click", function () { g.open = !g.open; fold(); });
      g.wrap.appendChild(g.btn);
      g.items[g.items.length - 1].insertAdjacentElement("afterend", g.wrap);
    });
    var current = "all";
    function fold() {
      groups.forEach(function (g) {
        g.rest.forEach(function (el) {
          var f = current === "all" && !g.open;
          el.classList.toggle("is-fold", f);
          if (!f && !el.hidden) el.classList.add("in");
        });
        g.wrap.hidden = current !== "all";
        g.btn.setAttribute("aria-expanded", g.open ? "true" : "false");
        g.btn.textContent = g.open ? "代表の 3 件だけにする" : "もっと見る（あと " + g.rest.length + " 件）";
      });
    }
    fold();
    bar.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-filter]");
      if (!b) return;
      var f = b.getAttribute("data-filter");
      current = f;
      bar.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      grid.querySelectorAll(".work,.wk,.wk-say,.wk-band").forEach(function (w) {
        w.hidden = !(f === "all" || (w.getAttribute("data-cat") || "").split(" ").indexOf(f) >= 0);
        if (!w.hidden) w.classList.add("in");
      });
      fold();
      // 横スクロールの絞り込みバーで、選んだボタンが見える位置にする
      var l = b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2;
      if (bar.scrollWidth > bar.clientWidth) bar.scrollLeft = Math.max(0, l);
    });
    // 横スクロールのはみ出しを示すフェードの端判定
    function edges() {
      var max = bar.scrollWidth - bar.clientWidth;
      bar.classList.toggle("fade-l", bar.scrollLeft > 4);
      bar.classList.toggle("fade-r", max > 4 && bar.scrollLeft < max - 4);
    }
    bar.addEventListener("scroll", edges, { passive: true });
    window.addEventListener("resize", edges);
    edges();
  });
  // /works/#web などのハッシュで、その種類に絞り込む
  (function () {
    var h = (location.hash || "").replace("#", "");
    if (!h) return;
    var b = d.querySelector('[data-filter-group] button[data-filter="' + h + '"]');
    if (!b) return;
    b.click();
    var bar = b.closest("[data-filter-group]");
    function go() {
      var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      bar.scrollIntoView({ behavior: rm ? "auto" : "smooth", block: "start" });
    }
    if (d.readyState === "complete") requestAnimationFrame(go);
    else window.addEventListener("load", function () { requestAnimationFrame(go); });
  })();
  // ヘッダーのハンバーガー
  (function () {
    var b = d.getElementById("hdBurger"), m = d.getElementById("hdMenu");
    if (!b || !m) return;
    function set(o) { m.hidden = !o; b.setAttribute("aria-expanded", o ? "true" : "false"); b.setAttribute("aria-label", o ? "メニューを閉じる" : "メニューを開く"); }
    b.addEventListener("click", function (e) { e.stopPropagation(); set(m.hidden); });
    m.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    d.addEventListener("click", function (e) { if (!m.hidden && !m.contains(e.target)) set(false); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && !m.hidden) { set(false); b.focus(); } });
  })();
  // 横スクロールのカルーセル（左右ボタン）
  d.querySelectorAll(".car-wrap").forEach(function (wr) {
    var car = wr.querySelector(".carousel");
    var btns = wr.querySelectorAll(".car-btn");
    if (!car) return;
    btns.forEach(function (b) {
      b.hidden = false;
      b.addEventListener("click", function () {
        var step = Math.max(240, car.clientWidth * 0.8) * Number(b.getAttribute("data-car"));
        car.scrollBy({ left: step, behavior: reduce ? "auto" : "smooth" });
      });
    });
  });
  // 右下のヒカリ（目次）
  (function () {
    var fab = d.getElementById("hkFab");
    if (!fab) return;
    var btn = d.getElementById("hkBtn"), menu = d.getElementById("hkMenu"), tip = d.getElementById("hkTip");
    var secs = Array.prototype.slice.call(d.querySelectorAll("main [data-nav-label][id]"));
    if (secs.length > 1) {
      var ul = menu.querySelector("ul");
      var site = ul.innerHTML;
      ul.innerHTML = "";
      secs.forEach(function (s) {
        var li = d.createElement("li"), a = d.createElement("a");
        a.href = "#" + s.id; a.textContent = s.getAttribute("data-nav-label");
        li.appendChild(a); ul.appendChild(li);
      });
      var sep = d.createElement("li"); sep.className = "sep"; sep.textContent = "ほかのページ"; ul.appendChild(sep);
      ul.insertAdjacentHTML("beforeend", site);
    }
    function set(open) {
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) tip.hidden = true;
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); set(menu.hidden); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    d.addEventListener("click", function (e) { if (!fab.contains(e.target)) set(false); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { set(false); btn.focus(); } });
    // いま見ているセクションに合わせて一言（スクロール追従）
    if (secs.length > 1 && "IntersectionObserver" in window) {
      var cur = null, timer = null;
      var so = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting || e.target === cur) return;
          cur = e.target;
          var say = cur.getAttribute("data-hk-say");
          if (!say || !menu.hidden || cur === secs[0]) return;
          tip.textContent = say; tip.hidden = false;
          clearTimeout(timer);
          timer = setTimeout(function () { tip.hidden = true; }, 3800);
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      secs.forEach(function (s) { so.observe(s); });
    }
  })();
  // 画像の拡大表示（.gallery の a.zoom）
  (function () {
    var links = d.querySelectorAll("a.zoom");
    if (!links.length) return;
    var lb = d.createElement("div");
    lb.className = "lb"; lb.hidden = true;
    lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "画像の拡大表示");
    lb.innerHTML = '<button type="button" aria-label="閉じる">×</button><div><img alt=""><p></p></div>';
    d.body.appendChild(lb);
    var img = lb.querySelector("img"), cap = lb.querySelector("p"), close = lb.querySelector("button"), last = null;
    function hide() { lb.hidden = true; img.removeAttribute("src"); if (last) last.focus(); }
    links.forEach(function (a) {
      a.addEventListener("click", function (ev) {
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
        ev.preventDefault(); last = a;
        var t = a.querySelector("img"), fc = a.closest("figure") && a.closest("figure").querySelector("figcaption");
        img.src = a.getAttribute("href"); img.alt = t ? t.alt : "";
        cap.textContent = fc ? fc.textContent : "";
        lb.hidden = false; close.focus();
      });
    });
    lb.addEventListener("click", function (e) { if (e.target !== img) hide(); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lb.hidden) hide(); });
  })();
  d.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a.yt[data-yt]");
    if (!a || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    ev.preventDefault();
    var f = d.createElement("iframe");
    f.className = "yt-frame";
    f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(a.getAttribute("data-yt")) + "?autoplay=1&rel=0";
    f.title = a.getAttribute("data-title") || "YouTube の動画";
    f.loading = "lazy";
    f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    a.replaceWith(f);
  });
})();
