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
      grid.querySelectorAll(".work").forEach(function (w) {
        w.hidden = !(f === "all" || (w.getAttribute("data-cat") || "").split(" ").indexOf(f) >= 0);
        if (!w.hidden) w.classList.add("in");
      });
    });
  });
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
