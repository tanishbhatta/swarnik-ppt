/* ───────────────────────────────────────────────────────────────────────────
   Deck runtime: builds the slides from content.js, then runs beats, views
   (FLIP moves), slide changes, keys, timer, presenter sync, video, overview,
   help and print. To change the words, edit content.js, not this file.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var D = window.DECK;
  if (!D) return;                                   // index.html shows the content.js message
  var T = window.DeckText, C = window.DeckComponents;

  var EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
  var EASE_OUT = 'cubic-bezier(0.4, 0, 1, 1)';
  var EASE_GLIDE = 'cubic-bezier(0.45, 0, 0.15, 1)';   // FLIP: a visible glide, no overshoot
  var MS = { out: 280, in: 480, flip: 600 };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CHANNEL = 'pitch-deck';

  /* Slide-specific views. A view is a different arrangement of the same section.
     VIEWS: a field in `show` that starts a new view on that slide.
     KEEP:  roles that stay on screen (and glide to a new spot) when that view starts. */
  var VIEWS = {
    idea: { wordmark: 'brand' },
    users: { comments: 'evidence', figure: 'evidence' },
    close: { statement: 'statement', closing: 'closing' }
  };
  var KEEP = {
    idea: { brand: ['quote'] },
    users: { evidence: ['headline', 'column'] },
    close: { statement: ['label', 'headline'] }
  };
  // where each role goes (slide CSS positions the regions)
  var REGION = {
    headline: 'head', tag: 'head', statement: 'statement', note: 'flow', badge: 'badge',
    wordmark: 'brand', oneLiner: 'brand', team: 'team', names: 'names', image: 'render',
    sequence: 'seq', row: 'rows', card: 'cards', column: 'cols', step: 'steps',
    comments: 'comments', proof: 'proof', figure: 'figure', figures: 'figs',
    transform: 'transform', timeline: 'timeline', closing: 'closing', quote: 'quote'
  };

  /* ── helpers ──────────────────────────────────────────────────────────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function mk(tag, cls, inner) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (inner != null) e.innerHTML = inner;
    return e;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function enabled(x) { return x && x.enabled !== false; }

  /* ── content → model ──────────────────────────────────────────────────── */
  var NEEDS = { survey: ['surveyAsked', 'surveyYes'], tests: ['sentences', 'accuracy'] };
  function numbersFilled(keys) {
    return keys.every(function (k) { return !T.empty(D.numbers && D.numbers[k]); });
  }
  function resolveBeat(b) {
    var o = {};
    for (var k in b) o[k] = b[k];
    if (b.needs && NEEDS[b.needs] && !numbersFilled(NEEDS[b.needs])) {
      o.say = b.sayIfEmpty != null ? b.sayIfEmpty : b.say;
      o.show = b.showIfEmpty != null ? b.showIfEmpty : null;
    }
    return o;
  }

  var slides = (D.slides || []).filter(enabled).map(function (s, i) {
    var beats = (s.beats || []).filter(enabled).map(resolveBeat);
    if (!beats.length) beats = [{ say: '', show: null }];
    var sl = { id: String(s.id || 's' + i), section: s.section || '', speaker: s.speaker || '', beats: beats };
    var view = 'main', trig = VIEWS[sl.id] || {};
    sl.views = beats.map(function (b) {
      if (b.demo) return 'demo';
      if (b.view) view = String(b.view);
      else if (b.show) Object.keys(b.show).forEach(function (k) { if (trig[k]) view = trig[k]; });
      return view;
    });
    return sl;
  });
  var N = slides.length;
  var steps = [];
  slides.forEach(function (sl, si) { sl.beats.forEach(function (b, bi) { steps.push({ s: si, b: bi }); }); });

  /* ── build ────────────────────────────────────────────────────────────── */
  var stage = $('#stage'), slidesBox = $('#slides');

  function laterViews(sl, view) {
    var out = [], seen = {};
    var start = sl.views.indexOf(view);
    for (var i = start; i < sl.views.length; i++) {
      var v = sl.views[i];
      if (v === 'demo' || v === view || seen[v]) continue;
      seen[v] = 1;
      out.push(v);
    }
    return out;
  }

  function buildSlide(sl, si) {
    var sec = mk('section', 'slide');
    sec.dataset.id = sl.id;
    sec.dataset.index = si;
    sec.dataset.view = sl.views[0];
    var content = mk('div', 'content');
    sec.appendChild(content);
    var regions = {};
    function region(name, view) {
      var key = name + '|' + view;
      if (!regions[key]) {
        var r = mk('div', 'r r-' + name + ' v-' + view);
        r.dataset.region = name;
        content.appendChild(r);
        regions[key] = r;
      }
      return regions[key];
    }
    sl.comps = [];
    sl.beats.forEach(function (b, bi) {
      if (!b.show) return;
      var view = sl.views[bi];
      var keys = Object.keys(b.show);
      var hasHeadline = keys.indexOf('headline') !== -1;
      var made = [];
      keys.forEach(function (k) {
        var fn = C[k];
        if (!fn) return;
        fn(b.show[k]).forEach(function (el) { made.push({ key: k, el: el }); });
      });
      made.forEach(function (m, i) {
        var role = m.el.dataset.role, rname;
        if (role === 'label') {
          if (hasHeadline && keys.indexOf('label') < keys.indexOf('headline')) rname = 'kicker';
          else {
            var nextEl = made[i + 1];
            rname = nextEl ? (REGION[nextEl.el.dataset.role] || 'flow') : 'flow';
          }
        } else rname = REGION[role] || 'flow';
        var el = m.el;
        el.dataset.beat = bi;
        el.dataset.view = view;
        var keep = KEEP[sl.id] || {};
        var views = [view];
        laterViews(sl, view).every(function (v) {
          if ((keep[v] || []).indexOf(role) === -1) return false;
          views.push(v);
          return true;
        });
        el.dataset.views = views.join(' ');
        if (views.length > 1) el.dataset.flip = '1';
        region(rname, view).appendChild(el);
        sl.comps.push(el);
      });
    });
    // regions that hold rows/cards/columns/steps get a class so CSS can lay them out as tables / trios
    sl.el = sec;
    sl.content = content;
    // images that fail to load are removed: the column simply stays empty
    $$('img', sec).forEach(function (im) {
      im.addEventListener('error', function () {
        var holder = im.closest('.c-image, .card-shot, .proof');
        if (holder && holder.classList.contains('c-image')) holder.classList.add('missing');
        im.remove();
      });
      im.addEventListener('load', function () { im.dataset.loaded = '1'; });
    });
    return sec;
  }

  slides.forEach(function (sl, si) { slidesBox.appendChild(buildSlide(sl, si)); });

  /* ── frame: header + footer ───────────────────────────────────────────── */
  var hdrNum = $('.hdr-num'), hdrSec = $('.hdr-sec'), folio = $('.ftr-folio'), prog = $('.ftr-progress');
  $('.hdr-brand').textContent = [D.appName, D.event].filter(function (s) { return !T.empty(s); }).join(' · ');
  document.title = [D.appName, D.event].filter(function (s) { return !T.empty(s); }).join(' · ') || 'Pitch deck';
  for (var i = 0; i < N; i++) prog.appendChild(mk('span', 'seg'));
  var segs = $$('.seg', prog);

  function setChrome(si) {
    hdrNum.textContent = pad2(si + 1);
    hdrSec.textContent = slides[si].section;
    folio.textContent = pad2(si + 1) + ' / ' + pad2(N);
    segs.forEach(function (s, i) {
      s.className = 'seg' + (i < si ? ' done' : i === si ? ' cur' : '');
    });
  }

  /* ── state ────────────────────────────────────────────────────────────── */
  function compOn(c, sl, bi) {
    var view = sl.views[bi];
    return view !== 'demo' && +c.dataset.beat <= bi && c.dataset.views.split(' ').indexOf(view) !== -1;
  }
  function setSlideState(sl, bi) {
    var view = sl.views[bi];
    sl.el.dataset.view = view;
    var beatsInView = sl.views.filter(function (v) { return v === view; }).length;
    sl.comps.forEach(function (c) {
      var on = compOn(c, sl, bi);
      c.classList.toggle('on', on);
      c.classList.toggle('cur', on && +c.dataset.beat === bi && !!c.dataset.mark && beatsInView > 1);
    });
  }
  function setDemo(on) {
    stage.classList.toggle('demo', on);
    document.body.classList.toggle('is-demo', on);
  }

  // animations we may need to finish early when keys come fast
  var running = [];
  function run(el, frames, opts, done) {
    var a = el.animate(frames, opts);
    var rec = { a: a, done: done, fired: false };
    a.onfinish = function () { fire(rec); };
    running.push(rec);
    return rec;
  }
  function fire(rec) {
    if (rec.fired) return;
    rec.fired = true;
    var i = running.indexOf(rec);
    if (i !== -1) running.splice(i, 1);
    if (rec.done) rec.done();
  }
  function finishAll() {
    var guard = 0;
    while (running.length && guard++ < 50) {
      var r = running[0];
      try { r.a.finish(); } catch (e) { /* already done */ }
      fire(r);
    }
  }

  var scale = 1;
  function stageRect(el) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { left: (r.left - s.left) / scale, top: (r.top - s.top) / scale, width: r.width / scale, height: r.height / scale };
  }

  function activate(sl) {
    slides.forEach(function (o) { o.el.classList.toggle('active', o === sl); });
  }

  function instant(sl, fn) {
    sl.el.classList.add('instant');
    fn();
    void sl.el.offsetWidth;
    sl.el.classList.remove('instant');
  }

  // FLIP: kept elements glide to their new place and size; everything else fades.
  function flipTo(sl, bi) {
    var targets = [];
    sl.comps.forEach(function (c) {
      if (!c.dataset.flip || !c.classList.contains('on') || !compOn(c, sl, bi)) return;
      var parts = $$('[data-flip-part]', c);
      if (parts.length) targets.push.apply(targets, parts); else targets.push(c);
    });
    var first = targets.map(function (t) { return { r: stageRect(t), fs: parseFloat(getComputedStyle(t).fontSize) }; });
    sl.el.classList.add('vchange');
    setSlideState(sl, bi);
    var last = targets.map(function (t) { return { r: stageRect(t), fs: parseFloat(getComputedStyle(t).fontSize) }; });
    setTimeout(function () { sl.el.classList.remove("vchange"); }, MS.flip + 400);
    if (reduced) return;
    targets.forEach(function (t, i) {
      var f = first[i], l = last[i];
      if (!l.r.width || !f.r.width) return;
      var s = (t.tagName === 'IMG' || t.tagName === 'FIGURE' || !f.fs || !l.fs) ? f.r.width / l.r.width : f.fs / l.fs;
      var dx = f.r.left - l.r.left, dy = f.r.top - l.r.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(s - 1) < 0.002) return;
      run(t, [
        { transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' },
        { transformOrigin: '0 0', transform: 'translate(0,0) scale(1)' }
      ], { duration: MS.flip, easing: EASE_GLIDE });
    });
  }

  function slideChange(prev, next) {
    var a = slides[prev.s], b = slides[next.s];
    var dir = next.s > prev.s ? 1 : -1;
    var dy = reduced ? 0 : 48 * dir;
    a.el.classList.add('leaving');
    b.content.style.opacity = '0';
    instant(b, function () { setSlideState(b, next.b); });
    run(a.content, [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(' + (-dy) + 'px)', opacity: 0 }
    ], { duration: MS.out, easing: EASE_OUT, fill: 'forwards' }, function () {
      a.el.classList.remove('leaving');
      a.content.getAnimations().forEach(function (x) { x.cancel(); });
      activate(b);
      b.content.style.opacity = '';
      run(b.content, [
        { transform: 'translateY(' + dy + 'px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ], { duration: MS.in, easing: EASE });
    });
  }

  var cur = -1;
  function go(i) {
    if (i < 0 || i >= steps.length || i === cur) return;
    finishAll();
    var prev = cur >= 0 ? steps[cur] : null, next = steps[i];
    cur = i;
    var sl = slides[next.s];
    if (!prev) {
      activate(sl);
      instant(sl, function () { setSlideState(sl, next.b); });
    } else if (prev.s === next.s) {
      var vOld = sl.views[prev.b], vNew = sl.views[next.b];
      if (vOld !== vNew && vOld !== 'demo' && vNew !== 'demo') flipTo(sl, next.b);
      else setSlideState(sl, next.b);
    } else {
      slideChange(prev, next);
    }
    setDemo(sl.views[next.b] === 'demo');
    setChrome(next.s);
    broadcast();
    // remember the beat in the address, so an accidental reload comes back to the same place
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) { /* ignore */ }
  }
  function next() { go(cur + 1); }
  function prev() { go(cur - 1); }

  /* ── fit the 1920×1080 stage to the window ────────────────────────────── */
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / 1920, vh / 1080);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = Math.round((vw - 1920 * scale) / 2) + 'px';
    stage.style.top = Math.round((vh - 1080 * scale) / 2) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  /* ── theme ────────────────────────────────────────────────────────────── */
  var theme = D.theme === 'ink' ? 'ink' : 'paper';
  function setTheme(t) {
    theme = t;
    document.documentElement.dataset.theme = t;
    broadcast();
  }
  setTheme(theme);

  /* ── timer (T shows/hides, Shift+T resets) ────────────────────────────── */
  var timerEl = $('#timer');
  var timer = { start: null, shown: false };
  function timerText() {
    var s = timer.start ? Math.floor((Date.now() - timer.start) / 1000) : 0;
    return Math.floor(s / 60) + ':' + pad2(s % 60);
  }
  function tick() {
    timerEl.textContent = timerText();
    timerEl.classList.toggle('over', !!timer.start && Date.now() - timer.start >= 180000);
  }
  setInterval(tick, 250);
  function toggleTimer() {
    if (!timer.start) timer.start = Date.now();
    timer.shown = !timer.shown;
    timerEl.hidden = !timer.shown;
    tick();
    broadcast();
  }
  function resetTimer() {
    timer.start = Date.now();
    tick();
    broadcast();
  }

  /* ── black screen (B) ─────────────────────────────────────────────────── */
  var blackout = $('#blackout');
  function toggleBlack(force) {
    var on = force != null ? force : !blackout.classList.contains('on');
    blackout.classList.toggle('on', on);
  }

  /* ── fullscreen (F) ───────────────────────────────────────────────────── */
  function toggleFullscreen() {
    var d = document;
    if (d.fullscreenElement) { if (d.exitFullscreen) d.exitFullscreen().catch(function () {}); }
    else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(function () {});
  }

  /* ── backup video (V) ─────────────────────────────────────────────────── */
  var vLayer = $('#video-layer'), video = $('#video'), picker = $('#video-pick');
  var videoOpen = false, triedPicker = false;
  function openVideo() {
    videoOpen = true;
    triedPicker = false;
    vLayer.hidden = false;
    var src = D.backupVideo;
    if (T.empty(src)) { pickVideo(); return; }
    video.src = src;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* error handler opens the picker */ });
  }
  function pickVideo() {
    if (triedPicker) return;
    triedPicker = true;
    try { picker.click(); } catch (e) { closeVideo(); }
  }
  video.addEventListener('error', function () { if (videoOpen) pickVideo(); });
  picker.addEventListener('change', function () {
    var f = picker.files && picker.files[0];
    if (!f) { closeVideo(); return; }
    video.src = URL.createObjectURL(f);
    video.play().catch(function () {});
    picker.value = '';
  });
  picker.addEventListener('cancel', function () { closeVideo(); });
  function closeVideo() {
    videoOpen = false;
    try { video.pause(); } catch (e) { /* ignore */ }
    video.removeAttribute('src');
    video.load();
    vLayer.hidden = true;
  }

  /* ── presenter window (P) and sync ────────────────────────────────────── */
  var chan = null;
  try { chan = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null; } catch (e) { chan = null; }
  function sayOf(st) {
    if (!st) return '';
    var b = slides[st.s].beats[st.b];
    return T.typo(T.fill(b.say || ''));
  }
  function stateMsg() {
    if (cur < 0) return null;
    var st = steps[cur], sl = slides[st.s], nx = steps[cur + 1];
    return {
      type: 'state',
      num: pad2(st.s + 1), total: pad2(N), section: sl.section, speaker: sl.speaker,
      beat: st.b + 1, beats: sl.beats.length, demo: sl.views[st.b] === 'demo',
      say: sayOf(st),
      next: nx ? { say: sayOf(nx), section: slides[nx.s].section, num: pad2(nx.s + 1), sameSlide: nx.s === st.s, speaker: slides[nx.s].speaker } : null,
      timer: { start: timer.start },
      theme: theme,
      t: Date.now()
    };
  }
  function broadcast() {
    var m = stateMsg();
    if (!m) return;
    if (chan) { try { chan.postMessage(m); } catch (e) { /* ignore */ } }
    try { localStorage.setItem(CHANNEL + '-state', JSON.stringify(m)); } catch (e) { /* ignore */ }
  }
  var lastCmd = null;
  function onCommand(cmd, id) {
    if (id != null) { if (id === lastCmd) return; lastCmd = id; }
    if (cmd === 'next') next();
    else if (cmd === 'prev') prev();
    else if (cmd === 'hello') broadcast();
    else if (cmd === 'timer-reset') resetTimer();
  }
  if (chan) chan.onmessage = function (e) { if (e.data && e.data.type === 'cmd') onCommand(e.data.cmd, e.data.t); };
  window.addEventListener('storage', function (e) {
    if (e.key === CHANNEL + '-cmd' && e.newValue) {
      try { var m = JSON.parse(e.newValue); onCommand(m.cmd, m.t); } catch (err) { /* ignore */ }
    }
  });
  function openPresenter() {
    window.open('presenter.html', 'pitch-presenter', 'width=1100,height=720');
    setTimeout(broadcast, 400);
  }

  /* ── overlays: help (H/?) and overview (O) ────────────────────────────── */
  var help = $('#help'), overview = $('#overview');
  var KEYS = [
    ['Space · Right · Down · PgDn', 'Next beat'],
    ['Left · Up · PgUp', 'Previous beat'],
    ['B  .', 'Black screen'],
    ['D', 'Light / dark theme'],
    ['F', 'Fullscreen'],
    ['V', 'Backup video (Esc to close)'],
    ['T', 'Timer · Shift+T resets'],
    ['P', 'Presenter window'],
    ['O', 'Overview'],
    ['H  ?', 'This list']
  ];
  help.innerHTML = '<p class="ov-title t-label">Keys</p><dl class="keys">' + KEYS.map(function (k) {
    return '<dt class="t-label">' + T.esc(k[0]) + '</dt><dd class="t-small">' + T.esc(k[1]) + '</dd>';
  }).join('') + '</dl>';
  var ovSel = 0;
  overview.innerHTML = '<p class="ov-title t-label">Overview</p><ol class="ov-list">' + slides.map(function (sl, si) {
    return '<li data-i="' + si + '"><span class="t-label ov-n">' + pad2(si + 1) + '</span><span class="t-sub">' + T.esc(sl.section) + '</span></li>';
  }).join('') + '</ol>';
  var ovItems = $$('li', overview);
  function showOverview(on) {
    overview.hidden = !on;
    if (on) { ovSel = cur >= 0 ? steps[cur].s : 0; markOv(); }
  }
  function markOv() { ovItems.forEach(function (li, i) { li.classList.toggle('sel', i === ovSel); }); }
  function jumpTo(si) {
    for (var i = 0; i < steps.length; i++) if (steps[i].s === si) { go(i); return; }
  }

  /* ── keys ─────────────────────────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;      // browser shortcuts pass through
    var k = e.key, code = e.code;
    if (k === 'F5') { e.preventDefault(); return; }       // clickers' "start show" button must not reload
    if (videoOpen) {
      if (k === 'Escape' || code === 'KeyV') { closeVideo(); e.preventDefault(); }
      return;
    }
    if (!overview.hidden) {
      if (k === 'ArrowDown' || k === 'ArrowRight') ovSel = Math.min(N - 1, ovSel + 1);
      else if (k === 'ArrowUp' || k === 'ArrowLeft') ovSel = Math.max(0, ovSel - 1);
      else if (k === 'Enter' || k === ' ') { showOverview(false); jumpTo(ovSel); }
      else if (k === 'Escape' || code === 'KeyO') showOverview(false);
      else return;
      markOv();
      e.preventDefault();
      return;
    }
    if (!help.hidden && (k === 'Escape' || code === 'KeyH' || k === '?')) { help.hidden = true; e.preventDefault(); return; }
    switch (true) {
      case k === ' ' || k === 'ArrowRight' || k === 'PageDown' || k === 'ArrowDown': next(); break;
      case k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp': prev(); break;
      case code === 'KeyB' || k === '.': toggleBlack(); break;
      case code === 'KeyD': setTheme(theme === 'paper' ? 'ink' : 'paper'); break;
      case code === 'KeyF': toggleFullscreen(); break;
      case code === 'KeyV': openVideo(); break;
      case code === 'KeyT': if (e.shiftKey) resetTimer(); else toggleTimer(); break;
      case code === 'KeyP': openPresenter(); break;
      case code === 'KeyO': help.hidden = true; showOverview(true); break;
      case code === 'KeyH' || k === '?': help.hidden = !help.hidden; break;
      case k === 'Escape': help.hidden = true; toggleBlack(false); break;
      default: return;
    }
    e.preventDefault();
  });
  // clicks and the wheel never move the deck
  window.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });

  /* ── print: one page per slide, final state ───────────────────────────── */
  function buildPrint() {
    var root = $('#print-root');
    root.innerHTML = '';
    slides.forEach(function (sl, si) {
      var bi = sl.beats.length - 1;
      while (bi > 0 && sl.views[bi] === 'demo') bi--;
      var page = mk('div', 'print-page');
      var clone = sl.el.cloneNode(true);
      clone.classList.add('active');
      clone.dataset.view = sl.views[bi];
      $$('.comp', clone).forEach(function (c) {
        c.classList.toggle('on', compOn(c, sl, bi));
        c.classList.remove('cur');
      });
      var hdr = mk('div', 'p-hdr',
        '<div class="hdr-l"><span class="hdr-num t-label">' + pad2(si + 1) + '</span><span class="hdr-sec t-label">' + T.esc(sl.section) + '</span></div>' +
        '<div class="hdr-r"><span class="hdr-brand t-label">' + T.esc($('.hdr-brand').textContent) + '</span></div>');
      var ftr = mk('div', 'p-ftr',
        '<div class="ftr-progress">' + slides.map(function (o, i) { return '<span class="seg' + (i < si ? ' done' : i === si ? ' cur' : '') + '"></span>'; }).join('') + '</div>' +
        '<div class="ftr-folio t-label">' + pad2(si + 1) + ' / ' + pad2(N) + '</div>');
      page.appendChild(hdr);
      page.appendChild(clone);
      page.appendChild(ftr);
      root.appendChild(page);
    });
  }
  buildPrint();

  /* ── start once the fonts are in (font-display: block, all local) ─────── */
  var FACES = [
    ['400 20px "IBM Plex Mono"', 'a'], ['500 20px "IBM Plex Mono"', 'a'],
    ['400 28px "Instrument Sans"', 'a'], ['600 80px "Instrument Sans"', 'a'],
    ['italic 400 64px "Instrument Serif"', 'a'],
    ['400 36px "Noto Sans Devanagari"', 'क'], ['600 36px "Noto Sans Devanagari"', 'क']
  ];
  var started = false;
  function start() {
    if (started) return;
    started = true;
    document.body.classList.add('ready');
    var h = parseInt(String(location.hash || '').slice(1), 10);
    go(h >= 1 && h <= steps.length ? h - 1 : 0);
  }
  Promise.all(FACES.map(function (f) { return document.fonts.load(f[0], f[1]); })).then(start, start);
  setTimeout(start, 2500);

  // for tools/check_deck.mjs
  window.__deck = {
    get busy() { return running.length > 0; },
    get index() { return cur; },
    get steps() { return steps.map(function (s) { return { s: s.s, b: s.b, id: slides[s.s].id, view: slides[s.s].views[s.b] }; }); },
    go: go, next: next, prev: prev,
    slides: slides.map(function (s) { return { id: s.id, section: s.section, beats: s.beats.length, views: s.views }; }),
    get theme() { return theme; },
    get timer() { return { shown: timer.shown, text: timerText(), start: timer.start }; },
    get video() { return videoOpen; }
  };
})();
