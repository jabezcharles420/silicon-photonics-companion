/* Landing page: scroll reveal, stat counters, "continue reading" + per-chapter progress. */
(function () {
  'use strict';
  function store(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    els.forEach(function (e) { io.observe(e); });
  } else {
    els.forEach(function (e) { e.classList.add('in'); });
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.st b[data-count]').forEach(function (b) {
    if (reduce) return;
    var target = parseInt(b.getAttribute('data-count'), 10) || 0, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 950);
      b.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  // reading state from the companion
  var read = new Set(JSON.parse(store('vc_read') || '[]'));
  var last = store('vc_last');
  if (last) {
    var r = document.getElementById('resume');
    if (r) { r.hidden = false; r.href = 'app.html#s-' + encodeURIComponent(last); r.querySelector('.rs').textContent = last; }
    document.querySelectorAll('[data-continue]').forEach(function (a) { a.href = 'app.html#s-' + encodeURIComponent(last); });
    var main = document.querySelector('.cta [data-continue]');
    if (main) main.firstChild.textContent = 'Open the companion ';
  }
  if (read.size) {
    document.querySelectorAll('.chcard[data-ids]').forEach(function (c) {
      var ids = c.getAttribute('data-ids').split(' '), n = 0;
      ids.forEach(function (id) { if (read.has(id)) n++; });
      if (n) c.querySelector('.mine').textContent = n + ' of ' + ids.length + ' read';
    });
  }
})();
