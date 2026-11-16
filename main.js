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
    bar.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-filter]");
      if (!b) return;
      var f = b.getAttribute("data-filter");
      bar.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      grid.querySelectorAll(".work,.wk").forEach(function (w) {
        w.hidden = !(f === "all" || (w.getAttribute("data-cat") || "").split(" ").indexOf(f) >= 0);
        if (!w.hidden) w.classList.add("in");
      });
    });
  });
  // /works/#web などのハッシュで、その種類に絞り込む
  (function () {
    var h = (location.hash || "").replace("#", "");
    if (!h) return;
    var b = d.querySelector('[data-filter-group] button[data-filter="' + h + '"]');
    if (b) b.click();
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
