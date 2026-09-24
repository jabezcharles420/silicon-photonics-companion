/* Silicon Photonics · Visual Companion — companion app logic.
   SECTIONS and CHAPTERS are injected by scripts/build_site.py.
   Reading model: one section per view; a section counts as read once you reach its end
   (the pager scrolls into view) or tick it by hand. State lives in localStorage. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var readSet = new Set(JSON.parse(store('vc_read') || '[]'));
  var openCh = new Set(JSON.parse(store('vc_open') || '[]'));
  var cur = -1, query = '';
  var chapOf = {};
  CHAPTERS.forEach(function (c, ci) { c.items.forEach(function (i) { chapOf[i] = ci; }); });

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function chLabel(c) { return c.num === 0 ? 'Front matter' : c.num === 99 ? 'Back matter' : 'Chapter ' + c.num; }
  function saveRead() { store('vc_read', JSON.stringify(Array.from(readSet))); }
  function saveOpen() { store('vc_open', JSON.stringify(Array.from(openCh))); }

  // plain text for search (built lazily)
  var plain = null;
  function buildPlain() {
    if (plain) return;
    var d = document.createElement('div');
    plain = SECTIONS.map(function (s) { d.innerHTML = s.html; return (d.textContent || '').replace(/\s+/g, ' '); });
  }

  /* ------------------------------------------------------------ progress */
  function ring(frac, size) {
    var r = (size - 4) / 2, c = 2 * Math.PI * r;
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="rt"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="rf" stroke-dasharray="' + (c * frac) + ' ' + c + '"' +
      ' transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
  }
  function updateProgress() {
    var n = 0; SECTIONS.forEach(function (s) { if (readSet.has(s.id)) n++; });
    var t = SECTIONS.length;
    $('#prog').innerHTML = ring(t ? n / t : 0, 22) + '<span><b>' + n + '</b> of ' + t + ' read</span>';
  }

  /* ------------------------------------------------------------ sidebar */
  function itemHTML(i, snippet) {
    var s = SECTIONS[i];
    var st = readSet.has(s.id) ? '<span class="st ok" title="Read">✓</span>' :
      (s.pend ? '<span class="st pd" title="Figure in production"></span>' : '<span class="st"></span>');
    return '<a class="item' + (i === cur ? ' active' : '') + (s.src ? ' src' : '') + '" href="#s-' + esc(s.id) + '" data-i="' + i + '">' +
      '<span class="iid">' + esc(s.id) + '</span><span class="it">' + esc(s.title) + (snippet || '') + '</span>' + st + '</a>';
  }

  function buildSidebar() {
    var side = $('#side');
    if (query.length >= 2) { buildResults(side); return; }
    var h = [];
    CHAPTERS.forEach(function (c, ci) {
      var n = c.items.length, r = 0;
      c.items.forEach(function (i) { if (readSet.has(SECTIONS[i].id)) r++; });
      var isOpen = openCh.has(ci) || chapOf[cur] === ci;
      h.push('<section class="chap' + (isOpen ? ' open' : '') + (chapOf[cur] === ci ? ' current' : '') + '" data-c="' + ci + '">' +
        '<button class="chhead" aria-expanded="' + isOpen + '">' +
        '<span class="cnum">' + (c.num === 0 ? 'FM' : c.num === 99 ? 'BM' : c.num) + '</span>' +
        '<span class="cname"><small>' + chLabel(c) + '</small>' + esc(c.name) + '</span>' +
        '<span class="ccount">' + (r ? r + '/' : '') + n + '</span>' +
        '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 4l4 4-4 4"/></svg>' +
        '</button><div class="cbar"><i style="width:' + (n ? 100 * r / n : 0) + '%"></i></div>' +
        '<div class="items">' + (isOpen ? c.items.map(function (i) { return itemHTML(i); }).join('') : '') + '</div></section>');
    });
    side.innerHTML = h.join('');
    var act = side.querySelector('a.active');
    if (act) act.scrollIntoView({ block: 'center' });
  }

  function buildResults(side) {
    buildPlain();
    var q = query.toLowerCase(), words = q.split(/\s+/).filter(Boolean);
    var hits = [];
    SECTIONS.forEach(function (s, i) {
      var title = (s.id + ' ' + s.title).toLowerCase(), body = plain[i].toLowerCase();
      var all = words.every(function (w) { return title.indexOf(w) !== -1 || body.indexOf(w) !== -1; });
      if (!all) return;
      var score = words.reduce(function (a, w) { return a + (title.indexOf(w) !== -1 ? 10 : 0) + Math.min(5, body.split(w).length - 1); }, 0);
      hits.push({ i: i, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    var re = new RegExp('(' + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    var out = ['<div class="rhead">' + (hits.length ? hits.length + ' section' + (hits.length === 1 ? '' : 's') + ' match <b>“' + esc(query) + '”</b>' : 'No sections match <b>“' + esc(query) + '”</b>') +
      '<button class="clear" id="sclear">Clear</button></div>'];
    hits.slice(0, 120).forEach(function (hit) {
      var t = plain[hit.i], lo = t.toLowerCase(), pos = -1;
      for (var k = 0; k < words.length && pos < 0; k++) pos = lo.indexOf(words[k]);
      var snip = '';
      if (pos >= 0) {
        var a = Math.max(0, pos - 50), b = Math.min(t.length, pos + 110);
        snip = '<span class="snip">' + (a ? '…' : '') + esc(t.slice(a, b)).replace(re, '<mark>$1</mark>') + (b < t.length ? '…' : '') + '</span>';
      }
      var s = SECTIONS[hit.i];
      out.push('<div class="rch">' + esc(chLabel(CHAPTERS[chapOf[hit.i]])) + '</div>' +
        itemHTML(hit.i, snip).replace('<span class="it">' + esc(s.title), '<span class="it">' + esc(s.title).replace(re, '<mark>$1</mark>')));
    });
    side.innerHTML = out.join('');
    var c = $('#sclear'); if (c) c.onclick = function () { setQuery(''); $('#search').focus(); };
  }

  $('#side').addEventListener('click', function (e) {
    var head = e.target.closest('.chhead');
    if (head) {
      var sec = head.parentNode, ci = +sec.getAttribute('data-c');
      if (sec.classList.contains('open')) { openCh.delete(ci); sec.classList.remove('open'); head.setAttribute('aria-expanded', 'false'); }
      else {
        openCh.add(ci); sec.classList.add('open'); head.setAttribute('aria-expanded', 'true');
        var box = sec.querySelector('.items');
        if (!box.innerHTML) box.innerHTML = CHAPTERS[ci].items.map(function (i) { return itemHTML(i); }).join('');
      }
      saveOpen();
      return;
    }
    if (e.target.closest('a.item')) closeDrawer();
  });

  /* ------------------------------------------------------------ drawer (mobile) */
  function openDrawer() { document.body.classList.add('drawer'); $('#menubtn').setAttribute('aria-expanded', 'true'); }
  function closeDrawer() { document.body.classList.remove('drawer'); $('#menubtn').setAttribute('aria-expanded', 'false'); }
  $('#menubtn').addEventListener('click', function () { document.body.classList.contains('drawer') ? closeDrawer() : openDrawer(); });
  $('#scrim').addEventListener('click', closeDrawer);

  /* ------------------------------------------------------------ search */
  var st;
  function setQuery(v) { query = v.trim(); $('#search').value = v; document.body.classList.toggle('searching', query.length >= 2); buildSidebar(); }
  $('#search').addEventListener('input', function (e) {
    clearTimeout(st); var v = e.target.value;
    st = setTimeout(function () { setQuery(v); if (v.trim().length >= 2) openDrawer(); }, 120);
  });
  $('#search').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setQuery(''); e.target.blur(); document.body.classList.remove('search-open'); }
    if (e.key === 'Enter') { var f = $('#side a.item'); if (f) { location.hash = f.getAttribute('href'); e.target.blur(); } }
  });
  $('#search').addEventListener('focus', function () { $('#skbd').style.opacity = 0; });
  $('#search').addEventListener('blur', function () { $('#skbd').style.opacity = ''; if (!query) document.body.classList.remove('search-open'); });
  $('#searchbtn').addEventListener('click', function () { document.body.classList.add('search-open'); $('#search').focus(); });

  /* ------------------------------------------------------------ lightbox viewer */
  var lb = $('#lb'), lbimg = $('#lbimg'), stage = $('#lbstage');
  var Z = { s: 1, x: 0, y: 0, fit: 1, w: 0, h: 0 }, ptrs = new Map(), pinch = null, lastFocus = null;
  // Resize the <img> itself (not a CSS scale) so the browser re-rasterises the SVG: text stays sharp at 12x.
  function lbApply() {
    lbimg.style.width = (Z.w * Z.s) + 'px'; lbimg.style.height = (Z.h * Z.s) + 'px';
    lbimg.style.transform = 'translate(' + Z.x + 'px,' + Z.y + 'px)';
    $('#lbpct').textContent = Math.round(100 * Z.s / Z.fit) + '%';
  }
  function lbFit() {
    var r = stage.getBoundingClientRect(), pad = window.innerWidth < 700 ? 8 : 40;
    Z.fit = Math.min((r.width - 2 * pad) / Z.w, (r.height - 2 * pad) / Z.h);
    Z.s = Z.fit; Z.x = (r.width - Z.w * Z.s) / 2; Z.y = (r.height - Z.h * Z.s) / 2; lbApply();
  }
  function lbZoom(mx, my, f) {
    var ns = Math.min(Z.fit * 12, Math.max(Z.fit * 0.6, Z.s * f));
    Z.x = mx - (mx - Z.x) * (ns / Z.s); Z.y = my - (my - Z.y) * (ns / Z.s); Z.s = ns; lbApply();
  }
  function openLB(s) {
    lastFocus = document.activeElement;
    Z.w = s.w || 1600; Z.h = s.h || 1200;
    lbimg.src = s.img; lbimg.alt = s.title;
    $('#lbtitle').innerHTML = '<span class="chip">' + esc(s.id) + '</span>' + esc(s.title);
    lb.hidden = false; document.body.classList.add('lb-open');
    requestAnimationFrame(lbFit);
    $('#lbclose').focus();
  }
  function closeLB() { lb.hidden = true; document.body.classList.remove('lb-open'); lbimg.removeAttribute('src'); if (lastFocus) lastFocus.focus(); }
  function center() { var r = stage.getBoundingClientRect(); return [r.width / 2, r.height / 2]; }
  $('#lbclose').onclick = closeLB;
  $('#lbin').onclick = function () { var c = center(); lbZoom(c[0], c[1], 1.4); };
  $('#lbout').onclick = function () { var c = center(); lbZoom(c[0], c[1], 1 / 1.4); };
  $('#lbfit').onclick = lbFit;
  $('#lb1').onclick = function () { var c = center(); lbZoom(c[0], c[1], 1 / Z.s); };
  stage.addEventListener('wheel', function (e) {
    e.preventDefault(); var r = stage.getBoundingClientRect();
    lbZoom(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)));
  }, { passive: false });
  stage.addEventListener('pointerdown', function (e) {
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    if (ptrs.size === 2) { var p = Array.from(ptrs.values()); pinch = { d: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) }; }
    stage.classList.add('grabbing');
  });
  stage.addEventListener('pointermove', function (e) {
    if (!ptrs.has(e.pointerId)) return;
    var prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2 && pinch) {
      var p = Array.from(ptrs.values()), d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
      var r = stage.getBoundingClientRect();
      lbZoom((p[0][0] + p[1][0]) / 2 - r.left, (p[0][1] + p[1][1]) / 2 - r.top, d / pinch.d); pinch.d = d;
    } else if (ptrs.size === 1) { Z.x += e.clientX - prev[0]; Z.y += e.clientY - prev[1]; lbApply(); }
  });
  function up(e) { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) stage.classList.remove('grabbing'); }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('dblclick', function (e) {
    var r = stage.getBoundingClientRect();
    if (Z.s > Z.fit * 1.05) lbFit(); else lbZoom(e.clientX - r.left, e.clientY - r.top, 2.5);
  });
  window.addEventListener('resize', function () { if (!lb.hidden) lbFit(); });

  /* ------------------------------------------------------------ section view */
  var readObs = null;
  function markRead(id, on) {
    if (on) readSet.add(id); else readSet.delete(id);
    saveRead(); updateProgress();
    var t = $('#readtoggle');
    if (t && SECTIONS[cur].id === id) { t.classList.toggle('on', on); t.querySelector('span').textContent = on ? 'Read' : 'Mark as read'; }
    var a = $('#side a.item[data-i="' + cur + '"] .st');
    if (a) { a.className = 'st' + (on ? ' ok' : (SECTIONS[cur].pend ? ' pd' : '')); a.textContent = on ? '✓' : ''; }
    var c = CHAPTERS[chapOf[cur]], sec = $('#side .chap[data-c="' + chapOf[cur] + '"]');
    if (sec) {
      var r = 0; c.items.forEach(function (i) { if (readSet.has(SECTIONS[i].id)) r++; });
      sec.querySelector('.ccount').textContent = (r ? r + '/' : '') + c.items.length;
      sec.querySelector('.cbar i').style.width = (100 * r / c.items.length) + '%';
    }
  }

  function show(i) {
    if (i < 0 || i >= SECTIONS.length) return;
    cur = i;
    var s = SECTIONS[i], c = CHAPTERS[chapOf[i]];
    var v = $('#view'), h = [];
    store('vc_last', s.id);

    h.push('<div class="kick">' + esc(chLabel(c)) + (c.num === 0 || c.num === 99 ? '' : ' · ' + esc(c.name)) + '</div>');
    h.push('<h1 class="stitle">' + esc(s.title) + '</h1>');
    var chips = ['<span class="chip id">' + esc(s.id) + '</span>'];
    if (s.src) chips.push('<span class="chip">Source text only</span>');
    else if (s.pend) chips.push('<span class="chip warn"><i class="pdot"></i>' + (s.card || s.nod ? 'Card' : 'Diagram') + ' in production</span>');
    else chips.push('<span class="chip ' + (s.card ? 'amber' : 'blue') + '">' + (s.card ? 'Key-points card' : 'Explainer diagram') + '</span>');
    if (s.spath && s.spath.length) chips.push('<span class="chip plain">' + esc(s.spath.slice(0, 2).join(' › ')) + '</span>');
    if (s.bp) chips.push('<span class="chip plain">Book p. ' + esc(s.bp) + '</span>');
    chips.push('<button class="chip toggle' + (readSet.has(s.id) ? ' on' : '') + '" id="readtoggle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg><span>' + (readSet.has(s.id) ? 'Read' : 'Mark as read') + '</span></button>');
    h.push('<div class="chips">' + chips.join('') + '</div>');

    if (s.img) {
      var ratio = s.w && s.h ? (' style="aspect-ratio:' + s.w + '/' + s.h + '"') : '';
      h.push('<figure class="figcard"><button class="figbtn" id="figbtn" aria-label="Open figure viewer"' + ratio + '>' +
        '<img src="' + esc(s.img) + '" alt="' + esc(s.title) + '" draggable="false"' + (s.w ? ' width="' + s.w + '" height="' + s.h + '"' : '') + '>' +
        '<span class="expand"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4"/></svg>Zoom</span></button>' +
        '<figcaption><span>' + (s.card ? 'Key-points card' : 'Explainer diagram') + ' generated from the source text below · independently vision-reviewed</span>' +
        '<a href="' + esc(s.img) + '" target="_blank" rel="noopener">Open SVG ↗</a></figcaption></figure>');
    } else if (s.pend) {
      h.push('<div class="figcard pending"><div class="sk"><i></i><i></i><i></i></div><div class="pmsg"><i class="pdot"></i><div><b>' +
        (s.card || s.nod ? 'Key-points card' : 'Explainer diagram') + ' in production.</b><span>It is being generated and vision-reviewed now. The book text below is final.</span></div></div></div>');
    }

    var srcOpen = store('vc_srcopen') !== '0';
    h.push('<section class="srcbox' + (srcOpen ? ' open' : '') + '" id="srcbox"><button class="srchead" id="srchead" aria-expanded="' + srcOpen + '">' +
      '<span class="t"><span class="lbl">From the book</span><span class="sub">verbatim · file.md lines ' + s.lines[0] + '–' + s.lines[1] + '</span></span>' +
      '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6l4 4 4-4"/></svg></button>' +
      '<div class="body prose">' + s.html + '</div></section>');

    var pg = ['<nav class="pager" id="pager">'];
    if (i > 0) pg.push('<a class="prv" href="#s-' + esc(SECTIONS[i - 1].id) + '"><span>← Previous</span><b>' + esc(SECTIONS[i - 1].title) + '</b></a>');
    else pg.push('<span></span>');
    if (i < SECTIONS.length - 1) pg.push('<a class="nxt" href="#s-' + esc(SECTIONS[i + 1].id) + '"><span>Next →</span><b>' + esc(SECTIONS[i + 1].title) + '</b></a>');
    pg.push('</nav><p class="keyhint"><kbd>←</kbd> <kbd>→</kbd> to move between sections · <kbd>/</kbd> to search</p>');
    h.push(pg.join(''));

    v.innerHTML = h.join('');
    $('#crumb').innerHTML = '<span>' + esc(chLabel(c)) + '</span>' + esc(c.num === 0 || c.num === 99 ? s.title : c.name);

    if (s.img) $('#figbtn').onclick = function () { openLB(s); };
    $('#readtoggle').onclick = function () { markRead(s.id, !readSet.has(s.id)); };
    $('#srchead').onclick = function () {
      var b = $('#srcbox'), o = !b.classList.contains('open');
      b.classList.toggle('open', o); this.setAttribute('aria-expanded', o); store('vc_srcopen', o ? '1' : '0');
    };

    if (readObs) readObs.disconnect();
    if ('IntersectionObserver' in window) {
      var armed = false;
      setTimeout(function () { armed = true; }, 1500);    // don't count a section read the instant it opens
      readObs = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && armed && !readSet.has(s.id)) { markRead(s.id, true); readObs.disconnect(); }
      }, { rootMargin: '0px 0px -10% 0px' });
      var pgEl = $('#pager');
      var tries = 0, iv = setInterval(function () { if (armed || ++tries > 20) { clearInterval(iv); readObs.observe(pgEl); } }, 100);
    }

    document.title = s.title + ' · ' + s.id + ' — Visual Companion';
    if (query.length < 2) buildSidebar();
    else { var old = $('#side a.item.active'); if (old) old.classList.remove('active'); var nw = $('#side a.item[data-i="' + i + '"]'); if (nw) nw.classList.add('active'); }
    window.scrollTo(0, 0);
  }

  function route() {
    var m = location.hash.match(/^#s-(.+)$/);
    if (m) {
      var id = decodeURIComponent(m[1]);
      for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].id === id) { show(i); return; }
    }
    var last = store('vc_last'), idx = 0;
    if (last) for (var j = 0; j < SECTIONS.length; j++) if (SECTIONS[j].id === last) { idx = j; break; }
    history.replaceState(null, '', '#s-' + SECTIONS[idx].id);
    show(idx);
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', function (e) {
    if (!lb.hidden) {
      if (e.key === 'Escape') closeLB();
      else if (e.key === '+' || e.key === '=') $('#lbin').click();
      else if (e.key === '-') $('#lbout').click();
      else if (e.key === '0') lbFit();
      return;
    }
    var tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#search').focus(); }
      return;
    }
    if (e.key === '/') { e.preventDefault(); document.body.classList.add('search-open'); $('#search').focus(); }
    else if ((e.key === 'ArrowLeft' || e.key === 'k') && cur > 0) location.hash = '#s-' + SECTIONS[cur - 1].id;
    else if ((e.key === 'ArrowRight' || e.key === 'j') && cur < SECTIONS.length - 1) location.hash = '#s-' + SECTIONS[cur + 1].id;
    else if (e.key === 'Escape') closeDrawer();
  });

  updateProgress();
  route();
})();
