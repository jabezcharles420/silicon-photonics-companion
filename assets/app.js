/* Silicon Photonics · Visual Companion — companion app logic.
   SECTIONS and CHAPTERS are injected by scripts/build_site.py. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var readSet = new Set(JSON.parse(localStorage.getItem('vc_read') || '[]'));
  var cur = -1;

  function esc(s) { var d = document.createElement('div'); d.textContent = (s == null ? '' : String(s)); return d.innerHTML; }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function updateProgress() {
    var n = readSet.size, t = SECTIONS.length;
    $('#progtext').innerHTML = '<b>' + n + '</b>&thinsp;/&thinsp;' + t + ' read';
    $('#progressline').style.width = (t ? (100 * n / t) : 0) + '%';
  }

  function buildSidebar(filter) {
    var side = $('#side'); side.innerHTML = '';
    var f = (filter || '').trim().toLowerCase();
    var count = 0;
    var frag = document.createDocumentFragment();
    CHAPTERS.forEach(function (ch) {
      var hits = [];
      ch.items.forEach(function (i) {
        var s = SECTIONS[i];
        var hay = s.id + ' ' + s.title + ' ' + (f.length > 2 ? s.html : '');
        if (!f || hay.toLowerCase().indexOf(f) !== -1) hits.push(i);
      });
      if (!hits.length) return;
      count += hits.length;
      var h = el('div', 'chname'); h.textContent = ch.name;
      frag.appendChild(h);
      hits.forEach(function (i) {
        var s = SECTIONS[i];
        var a = el('a', 'item' + (i === cur ? ' active' : '') + (readSet.has(s.id) ? ' read' : '') + (s.src ? ' src' : ''));
        a.href = '#s-' + s.id;
        var id = el('span', 'iid'); id.textContent = s.id;
        var t = el('span', 'it'); t.textContent = s.title;
        a.appendChild(id); a.appendChild(t);
        if (s.pend) { var p = el('span', 'pend'); p.textContent = '◌'; a.appendChild(p); }
        frag.appendChild(a);
      });
    });
    var hint = el('div', 'hint');
    hint.textContent = f ? (count + ' matching section' + (count === 1 ? '' : 's')) : (SECTIONS.length + ' sections · every chunk of the book');
    frag.insertBefore(hint, frag.firstChild);
    side.appendChild(frag);
  }

  function makeZoom(wrap, img) {
    var scale = 1, tx = 0, ty = 0, drag = false, sx = 0, sy = 0;
    function apply() { img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; }
    function zoomAt(mx, my, d) {
      var ns = Math.min(12, Math.max(0.5, scale * d));
      tx = mx - (mx - tx) * (ns / scale);
      ty = my - (my - ty) * (ns / scale);
      scale = ns; apply();
    }
    wrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = wrap.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.16 : 1 / 1.16);
    }, { passive: false });
    wrap.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = true; sx = e.clientX - tx; sy = e.clientY - ty;
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    });
    wrap.addEventListener('pointermove', function (e) { if (drag) { tx = e.clientX - sx; ty = e.clientY - sy; apply(); } });
    wrap.addEventListener('pointerup', function () { drag = false; });
    wrap.addEventListener('pointercancel', function () { drag = false; });
    wrap.addEventListener('dblclick', function () { scale = 1; tx = 0; ty = 0; apply(); });
    wrap.querySelector('.zin').onclick = function () { var r = wrap.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.35); };
    wrap.querySelector('.zout').onclick = function () { var r = wrap.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.35); };
    wrap.querySelector('.zrst').onclick = function () { scale = 1; tx = 0; ty = 0; apply(); };
    wrap.querySelector('.zfs').onclick = function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (wrap.requestFullscreen) wrap.requestFullscreen();
    };
  }

  function show(i) {
    if (i < 0 || i >= SECTIONS.length) return;
    cur = i;
    var s = SECTIONS[i];
    var v = $('#view'); v.innerHTML = '';

    var hd = el('div', 'shead');
    hd.innerHTML = '<span class="chip">' + esc(s.id) + '</span><h2>' + esc(s.title) + '</h2>' +
      (s.card ? '<span class="badge card">key-points card</span>' : '') +
      (s.src ? '<span class="badge src">source text</span>' : '') +
      (s.pend ? '<span class="badge pend">figure in production</span>' : '');
    v.appendChild(hd);

    var meta = el('div', 'smeta');
    var parts = [];
    if (s.spath && s.spath.length) parts.push(esc(s.spath.join(' › ')));
    parts.push('source: <b>file.md L' + s.lines[0] + '–' + s.lines[1] + '</b>');
    if (s.bp) parts.push('book p. ' + esc(s.bp));
    meta.innerHTML = parts.join(' &nbsp;·&nbsp; ');
    v.appendChild(meta);

    if (s.img) {
      var card = el('div', 'figcard');
      var wrap = el('div', 'figzoom');
      var img = el('img'); img.src = s.img; img.alt = s.title; img.draggable = false;
      wrap.appendChild(img);
      var ctl = el('div', 'zoomctl');
      ctl.innerHTML = '<button class="zout" title="Zoom out">−</button>' +
        '<button class="zin" title="Zoom in">+</button>' +
        '<button class="zrst" title="Reset">↺</button>' +
        '<button class="zfs" title="Fullscreen"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4"/></svg></button>';
      wrap.appendChild(ctl);
      card.appendChild(wrap);
      var cap = el('div', 'figcap');
      cap.innerHTML = '<b>' + (s.card ? 'Key-points card' : 'Explainer diagram') + ' · ' + esc(s.id) + '</b> — ' +
        'generated from the physics in the source text below, independently vision-reviewed. Scroll to zoom · drag to pan · double-click to reset.';
      card.appendChild(cap);
      v.appendChild(card);
      makeZoom(wrap, img);
    } else if (s.pend) {
      var pc = el('div', 'figcard');
      pc.innerHTML = '<div class="pending"><span class="pdot"></span><span class="pt"><b>' + (s.nod ? 'Key-points card' : 'Explainer diagram') + ' in production.</b> ' +
        'The autopilot is generating and vision-reviewing it right now — the source text below is final.</span></div>';
      v.appendChild(pc);
    }

    var d = document.createElement('details'); d.className = 'src';
    if (localStorage.getItem('vc_srcopen') !== '0') d.open = true;
    d.innerHTML = '<summary><span class="chev">›</span>Source text — verbatim from file.md L' + s.lines[0] + '–' + s.lines[1] + '</summary><div class="body">' + s.html + '</div>';
    d.addEventListener('toggle', function () { localStorage.setItem('vc_srcopen', d.open ? '1' : '0'); });
    v.appendChild(d);

    var pg = el('div', 'pager');
    if (i > 0) {
      var a = el('a', 'prv'); a.href = '#s-' + SECTIONS[i - 1].id;
      a.innerHTML = '<span>‹ Previous</span><b>' + esc(SECTIONS[i - 1].id) + ' · ' + esc(SECTIONS[i - 1].title) + '</b>';
      pg.appendChild(a);
    } else { var sp1 = el('span', 'prv'); sp1.style.flex = '1'; pg.appendChild(sp1); }
    if (i < SECTIONS.length - 1) {
      var b = el('a', 'nxt'); b.href = '#s-' + SECTIONS[i + 1].id;
      b.innerHTML = '<span>Next ›</span><b>' + esc(SECTIONS[i + 1].id) + ' · ' + esc(SECTIONS[i + 1].title) + '</b>';
      pg.appendChild(b);
    } else { var sp2 = el('span', 'nxt'); sp2.style.flex = '1'; pg.appendChild(sp2); }
    v.appendChild(pg);

    readSet.add(s.id);
    localStorage.setItem('vc_read', JSON.stringify(Array.from(readSet)));
    updateProgress();
    document.title = s.id + ' · ' + s.title + ' — Visual Companion';
    buildSidebar($('#search').value);
    window.scrollTo(0, 0);
    var act = $('#side a.active');
    if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
    $('#side').classList.remove('open');
  }

  function route() {
    var m = location.hash.match(/^#s-(.+)$/);
    if (m) {
      for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].id === m[1]) { show(i); return; }
    }
    show(0);
  }

  window.addEventListener('hashchange', route);
  var st;
  $('#search').addEventListener('input', function (e) {
    clearTimeout(st);
    var val = e.target.value;
    st = setTimeout(function () { buildSidebar(val); }, 140);
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowLeft' && cur > 0) location.hash = '#s-' + SECTIONS[cur - 1].id;
    if (e.key === 'ArrowRight' && cur < SECTIONS.length - 1) location.hash = '#s-' + SECTIONS[cur + 1].id;
  });
  var mb = $('#menubtn');
  if (mb) mb.addEventListener('click', function () { $('#side').classList.toggle('open'); });

  buildSidebar('');
  updateProgress();
  route();
})();
