/* ───────────────────────────────────────────────────────────────────────────
   Deck runtime: builds the slides from content.js, runs beats, camera
   sequences, keys, presenter sync, timer, overview, help, video, print.
   Nothing here should need editing to change the words: use content.js.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var D = window.DECK || { slides: [] };
  var R = window.RENDERS || { stills: {}, sequences: [], screen: null };
  var APP = String(D.appName || '');
  var RENDER_DIR = 'assets/renders/';

  var TIME = {
    seq: 1500,        // camera move duration (ms)
    fade: 800,        // still cross-fade when a sequence is not ready
    reveal: 0.7,      // incoming text enters at 70% of a camera move
    leave: 500,       // outgoing text exit
    black: 600        // fade to / from the black demo slide
  };

  /* Which render belongs to which slide. A list = one still per beat (last one repeats).
     panel = label for the flat placeholder shown when the render file is missing.     */
  var PLAN = {
    hook:    { still: 'slide_01', panel: 'Render: phone on the desk, voice note on screen' },
    problem: { still: 'slide_02', panel: 'Render: phone close-up, screenshot mapped on screen', screen: true },
    who:     { still: 'slide_03' },
    product: { still: 'slide_04', panel: 'Render: keycap close-up, printed legend' },
    how:     { still: 'slide_06' },
    next:    { still: ['slide_07', 'slide_07b'], panel: ['Render: laptop, Roman Nepali in a text field', 'Render: phone lying flat, chat field and keyboard'] },
    close:   { still: 'slide_08', panel: 'Render: wide shot of the desk' }
  };
  var LAYOUT = { hook: 'stack', problem: 'stack', who: 'who', product: 'product', how: 'how', next: 'next', close: 'close' };

  /* ── helpers ──────────────────────────────────────────────────────────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function mk(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function fill(s) { return String(s == null ? '' : s).replace(/\{app\}/g, APP); }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var DV = /[ऀ-ॿ]/;
  var DV_RUN = /[ऀ-ॿ‌‍]+(?:[  ]+[ऀ-ॿ‌‍]+)*/g;

  // On-screen text: {app}, typographic apostrophes, arrows kept with the word before, Devanagari runs.
  function fmt(s) {
    var t = fill(s).replace(/'/g, '’');
    // a short phrase after an arrow stays on one line ("→ can't understand us")
    t = t.replace(/(→ +)([^→]+)$/, function (m, a, b) { return b.length <= 24 ? a + b.replace(/ /g, ' ') : m; });
    t = esc(t);
    t = t.replace(/ +→ +/g, ' <span class="arr">→</span> ');
    t = t.replace(DV_RUN, function (m) { return '<span class="dv" lang="ne">' + m + '</span>'; });
    t = t.replace(/^“/, '<span class="hang">“</span>');
    return t;
  }
  function ln(s, cls) {
    var p = mk('p', 'ln' + (cls ? ' ' + cls : ''), fmt(s));
    if (DV.test(s)) p.classList.add('has-dv');
    if (/→/.test(s)) p.classList.add('has-arr');
    return p;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ── content → slides & steps ─────────────────────────────────────────── */
  var slides = (D.slides || []).map(function (s) {
    var beats = (s.beats || []).filter(function (b) { return !b.optional || D.showOptional !== false; });
    if (!beats.length) beats = [{ say: '', show: [] }];
    var o = {}; for (var k in s) o[k] = s[k];
    o.beats = beats;
    return o;
  });
  var N = slides.length;

  var steps = [];
  slides.forEach(function (s, si) {
    if (si === 0) steps.push({ s: 0, b: -1 });
    s.beats.forEach(function (b, bi) { steps.push({ s: si, b: bi }); });
  });

  function stillsOf(slide) {
    var p = PLAN[slide.id];
    if (!p || !p.still) return [];
    return Array.isArray(p.still) ? p.still : [p.still];
  }
  function visualFor(st) {
    var slide = slides[st.s];
    if (slide.black) return '#black';
    var arr = stillsOf(slide);
    if (!arr.length) return null;
    return arr[Math.max(0, Math.min(arr.length - 1, st.b))];
  }
  function stillSrc(name) { return R.stills && R.stills[name] ? RENDER_DIR + R.stills[name].file : null; }

  /* ── line drawings for the "who" slide (1.5px strokes) ────────────────── */
  var ICONS = [
    // group chat: two speech boxes
    '<svg viewBox="0 0 104 104" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter">' +
      '<path d="M8 14 H66 V54 H30 L18 66 V54 H8 Z"/><path d="M40 62 V72 H74 L86 84 V72 H96 V32 H74"/>' +
      '<path d="M20 28 H54 M20 40 H44"/></svg>',
    // creator: a script page next to a recording frame
    '<svg viewBox="0 0 104 104" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter">' +
      '<path d="M10 10 H54 V94 H10 Z"/><path d="M20 26 H44 M20 38 H44 M20 50 H38 M20 62 H44 M20 74 H32"/>' +
      '<path d="M66 34 H94 V70 H66 Z"/><circle cx="80" cy="52" r="6"/></svg>',
    // online shop: bag with handle and a price tag
    '<svg viewBox="0 0 104 104" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter">' +
      '<path d="M14 34 H74 V94 H14 Z"/><path d="M30 34 V24 C30 14 58 14 58 24 V34"/>' +
      '<path d="M74 58 H90 L99 68 L90 78 H74"/><circle cx="90" cy="68" r="2.5"/></svg>'
  ];

  /* ── layouts ──────────────────────────────────────────────────────────── */
  var Layouts = {
    stack: function (slide, txt) {
      return slide.beats.map(function (b) {
        var d = mk('div', 'beat');
        (b.show || []).forEach(function (s) { d.appendChild(ln(s)); });
        txt.appendChild(d);
        return d;
      });
    },

    who: function (slide, txt) {
      var cols = mk('div', 'cols');
      txt.appendChild(cols);
      return slide.beats.map(function (b, i) {
        var d = mk('div', 'beat col');
        d.innerHTML = ICONS[i % ICONS.length];
        var show = b.show || [];
        if (show[0] != null) d.appendChild(ln(show[0], 'key'));
        show.slice(1).forEach(function (s) { d.appendChild(ln(s, 'sub')); });
        cols.appendChild(d);
        return d;
      });
    },

    product: function (slide, txt) {
      return slide.beats.map(function (b, i) {
        var show = b.show || [], d;
        if (i === 0) {
          d = mk('div', 'beat b-name');
          d.appendChild(mk('p', 'name', fmt(show[0] || '')));
          show.slice(1).forEach(function (s) { d.appendChild(mk('p', '', '<span class="tag">' + fmt(s) + '</span>')); });
        } else {
          d = mk('div', 'beat');
          show.forEach(function (s) { d.appendChild(ln(s)); });
        }
        txt.appendChild(d);
        return d;
      });
    },

    how: function (slide, txt, sec) {
      var beats = slide.beats.map(function (b) {
        var d = mk('div', 'beat row');
        var raw = fill((b.show || [])[0] || '');
        var m = raw.match(/^(\d+)\s+(.*)$/), num = '', label = raw, sample = b.sample;
        if (m) { num = m[1]; label = m[2]; }
        else {
          // "Label:  sample → sample" (the optional hidden-'a' row)
          var c = raw.match(/^(.*?):\s+(.*)$/);
          if (c && sample == null) { label = c[1]; sample = c[2]; }
        }
        var nc = mk('div', 'numc');
        nc.appendChild(mk('div', 'num', esc(num)));
        if (b.tag) nc.appendChild(mk('p', '', '<span class="tag">' + esc(fill(b.tag)) + '</span>'));
        d.appendChild(nc);
        var lab = mk('div', 'lab');
        lab.appendChild(ln(label));
        d.appendChild(lab);
        d.appendChild(mk('div', 'smp', sampleHTML(sample)));
        txt.appendChild(d);
        return d;
      });
      if (slide.note) sec.appendChild(mk('div', 'fx note', esc(fill(slide.note))));
      var nums = numbersRow();
      if (nums) sec.appendChild(nums);
      return beats;
    },

    next: function (slide, txt) {
      return slide.beats.map(function (b) {
        var show = b.show || [], d;
        var isStage = show.length >= 2 && /^\S{1,14}$/.test(fill(show[0]));
        if (isStage) {
          d = mk('div', 'beat blk');
          d.appendChild(mk('p', 'lbl', esc(fill(show[0]))));
          show.slice(1).forEach(function (s) { d.appendChild(ln(s)); });
        } else {
          d = mk('div', 'beat subb');
          show.forEach(function (s, i) { d.appendChild(ln(s, i > 0 ? 'out' : '')); });
        }
        txt.appendChild(d);
        return d;
      });
    },

    close: function (slide, txt, sec) {
      var beats = slide.beats.map(function (b, i) {
        var d = mk('div', 'beat' + (i === slide.beats.length - 1 && i > 0 ? ' big' : ''));
        var show = b.show || [];
        show.forEach(function (s, j) {
          var cls = (d.classList.contains('big') && j === show.length - 1 && show.length > 1) ? 'out' : '';
          d.appendChild(ln(s, cls));
        });
        txt.appendChild(d);
        return d;
      });
      var names = (D.speakers || []).map(function (n) { return esc(fill(n)); }).join(' · ');
      if (names) sec.appendChild(mk('div', 'fx names', names));
      return beats;
    },

    black: function (slide, txt, sec) {
      sec.appendChild(mk('div', 'print-only demo-line', esc('Live demo: ' + APP + ' running on Windows')));
      return slide.beats.map(function () { var d = mk('div', 'beat'); txt.appendChild(d); return d; });
    }
  };

  function sampleHTML(sample) {
    if (sample == null || sample === '') return '';
    if (typeof sample === 'object') {
      return '<span class="strike">' + fmt(sample.from || '') + '</span>' +
             ' <span class="arr">→</span> ' + fmt(sample.to || '');
    }
    var parts = fill(sample).split(/\s*→\s*/);
    return parts.map(function (p, i) {
      var html = fmt(p);
      var latinOnly = !DV.test(p);
      if (parts.length > 2 && i > 0 && i < parts.length - 1) return '<span class="strike">' + html + '</span>';
      if (latinOnly && i === parts.length - 1) return '<span class="out">' + html + '</span>';
      return html;
    }).join(' <span class="arr">→</span> ');
  }

  function numbersRow() {
    var n = D.numbers || {}, L = D.numberLabels || {};
    var keys = ['sentences', 'accuracy', 'seconds'].filter(function (k) { return n[k] != null && String(n[k]).trim() !== ''; });
    if (!keys.length) return null;
    var row = mk('div', 'fx numbers');
    keys.forEach(function (k) {
      row.appendChild(mk('div', 'n', '<span class="v">' + esc(fill(n[k])) + '</span><span class="l">' + esc(fill(L[k] || k)) + '</span>'));
    });
    return row;
  }

  /* ── build DOM ────────────────────────────────────────────────────────── */
  var stage = $('#stage'), slidesEl = $('#slides');
  var sections = [], beatEls = [];
  var screenInfo = null;   // problem slide screenshot mapping

  slides.forEach(function (slide, si) {
    var lay = slide.black ? 'black' : (LAYOUT[slide.id] || 'stack');
    var sec = mk('section', 'slide lay-' + lay + (slide.black ? ' is-black' : ''));
    sec.dataset.id = slide.id;
    sec.dataset.index = si;
    var plan = PLAN[slide.id] || {};
    var stills = stillsOf(slide);

    // placeholder panel (only visible when the render is missing)
    if (plan.panel) {
      var vis = mk('div', 'vis right');
      var panel = mk('div', 'panel');
      var labels = Array.isArray(plan.panel) ? plan.panel : [plan.panel];
      panel.appendChild(mk('div', 'plabel', esc(labels[0])));
      vis.appendChild(panel);
      vis._labels = labels;
      sec.appendChild(vis);
      sec._vis = vis;
    }
    // print copy of the final still
    var finalStill = stills.length ? stills[stills.length - 1] : null;
    if (finalStill && stillSrc(finalStill)) {
      var pimg = mk('img', 'print-still');
      pimg.alt = '';
      pimg.src = stillSrc(finalStill);
      sec.insertBefore(pimg, sec.firstChild);
      sec._printImg = pimg;
    }

    var txt = mk('div', 'txt');
    sec.appendChild(txt);
    var bs = (Layouts[lay] || Layouts.stack)(slide, txt, sec);
    if (bs.length) bs[bs.length - 1].classList.add('final');

    // folio (not on the opening slide or the black demo slide)
    if (si > 0 && !slide.black) sec.appendChild(mk('div', 'fx folio', pad2(si + 1) + ' / ' + pad2(N)));

    if (plan.screen) buildScreen(sec);

    slidesEl.appendChild(sec);
    sections.push(sec);
    beatEls.push(bs);
  });

  document.title = APP + ' · pitch';

  /* ── problem slide: screenshot on the phone screen ────────────────────── */
  function buildScreen(sec) {
    var wrap = mk('div', 'screen');
    var shot = mk('div', 'shot');
    wrap.appendChild(shot);
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'hl');
    svg.setAttribute('viewBox', '0 0 1920 1080');
    var poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#C8372D');
    poly.setAttribute('stroke-width', '2');
    poly.setAttribute('stroke-linejoin', 'miter');
    svg.appendChild(poly);
    screenInfo = { sec: sec, wrap: wrap, shot: shot, svg: svg, poly: poly, img: null, nat: null, mode: null };
    sec.appendChild(wrap);
    sec.appendChild(svg);

    var hlBeat = -1;
    slides[+sec.dataset.index].beats.forEach(function (b, i) { if (b.highlight && hlBeat < 0) hlBeat = i; });
    screenInfo.hlBeat = hlBeat;
    if (D.gboardHighlight && hlBeat >= 0) sec.classList.add('has-hl');

    var src = D.images && D.images.gboard;
    if (!src) { placeholderShot(); return; }
    var img = new Image();
    img.alt = '';
    img.onload = function () { screenInfo.nat = { w: img.naturalWidth, h: img.naturalHeight }; screenInfo.img = img; shot.appendChild(img); layoutScreen(); };
    img.onerror = function () { placeholderShot(); layoutScreen(); };
    img.src = src;
  }
  function placeholderShot() {
    screenInfo.shot.innerHTML = '';
    screenInfo.shot.appendChild(mk('div', 'ph', 'Gboard screenshot:<br>' + esc((D.images && D.images.gboard) || 'assets/screenshots/gboard.png')));
    screenInfo.img = null;
  }

  // Solve the 3×3 homography that maps the w×h box onto 4 points (TL, TR, BR, BL).
  function homography(w, h, p) {
    var src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], B = [], i, j, k;
    for (i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = p[i][0], v = p[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
    }
    for (i = 0; i < 8; i++) {           // Gaussian elimination with partial pivoting
      var mx = i;
      for (j = i + 1; j < 8; j++) if (Math.abs(A[j][i]) > Math.abs(A[mx][i])) mx = j;
      var t = A[i]; A[i] = A[mx]; A[mx] = t; t = B[i]; B[i] = B[mx]; B[mx] = t;
      for (j = i + 1; j < 8; j++) {
        var f = A[j][i] / A[i][i];
        for (k = i; k < 8; k++) A[j][k] -= f * A[i][k];
        B[j] -= f * B[i];
      }
    }
    var X = new Array(8);
    for (i = 7; i >= 0; i--) {
      var s = B[i];
      for (k = i + 1; k < 8; k++) s -= A[i][k] * X[k];
      X[i] = s / A[i][i];
    }
    return X; // a b c d e f g h
  }
  function applyH(H, x, y) {
    var w = H[6] * x + H[7] * y + 1;
    return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
  }

  function corners() {
    var c = D.screenCorners || (R.screen && R.screen.corners);
    if (!c) return null;
    var pts = Array.isArray(c) ? c : [c.tl, c.tr, c.br, c.bl];
    if (!pts || pts.length !== 4 || pts.some(function (q) { return !q || q.length !== 2; })) return null;
    return pts;
  }

  function layoutScreen() {
    if (!screenInfo) return;
    var si = screenInfo, sec = si.sec, wrap = si.wrap, shot = si.shot;
    var pts = corners();
    var mapped = !!(pts && sec.classList.contains('has-still'));
    var meta = (R.screen) || {};
    var boxW, boxH, radius;
    if (mapped) {
      boxW = 1000;
      boxH = Math.round(1000 * (meta.aspect || 2.12));
      radius = Math.round(boxW * (meta.radius || 0.1));
      if (si.svg.parentNode !== sec) sec.appendChild(si.svg);
      if (wrap.parentNode !== sec) sec.insertBefore(wrap, si.svg);
      wrap.className = 'screen mapped';
    } else {
      // flat: upright, inside the placeholder panel
      var asp = si.nat ? si.nat.h / si.nat.w : 2.17;
      boxH = 720; boxW = Math.round(boxH / asp);
      radius = 0;
      wrap.className = 'screen flat';
    }
    wrap.style.width = boxW + 'px'; wrap.style.height = boxH + 'px';
    shot.style.width = boxW + 'px'; shot.style.height = boxH + 'px';
    shot.style.borderRadius = radius ? radius + 'px' : '';
    var H;
    if (mapped) {
      H = homography(boxW, boxH, pts);
      wrap.style.transformOrigin = '0 0';
      wrap.style.transform = 'matrix3d(' + [H[0], H[3], 0, H[6], H[1], H[4], 0, H[7], 0, 0, 1, 0, H[2], H[5], 0, 1].join(',') + ')';
    } else {
      // centre of the right-hand panel (cols 8–12, y 120–960)
      var ox = 1114 + (686 - boxW) / 2, oy = 120 + (840 - boxH) / 2 - 24;
      H = [1, 0, ox, 0, 1, oy, 0, 0];
      wrap.style.transformOrigin = '0 0';
      wrap.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
    }
    // image: cover the box, centred
    var fit = { x: 0, y: 0, w: boxW, h: boxH };
    if (si.img && si.nat) {
      var sc = Math.max(boxW / si.nat.w, boxH / si.nat.h);
      fit.w = si.nat.w * sc; fit.h = si.nat.h * sc;
      fit.x = (boxW - fit.w) / 2; fit.y = (boxH - fit.h) / 2;
      si.img.style.left = fit.x + 'px'; si.img.style.top = fit.y + 'px';
      si.img.style.width = fit.w + 'px'; si.img.style.height = fit.h + 'px';
    }
    // red outline (percent of the screenshot → box → stage)
    var hl = D.gboardHighlight;
    if (hl && si.img && si.hlBeat >= 0) {
      var x0 = fit.x + fit.w * hl.x / 100, y0 = fit.y + fit.h * hl.y / 100;
      var x1 = x0 + fit.w * hl.w / 100, y1 = y0 + fit.h * hl.h / 100;
      var q = [applyH(H, x0, y0), applyH(H, x1, y0), applyH(H, x1, y1), applyH(H, x0, y1)];
      si.poly.setAttribute('points', q.map(function (v) { return v[0].toFixed(1) + ',' + v[1].toFixed(1); }).join(' '));
      si.svg.style.display = '';
    } else {
      si.svg.style.display = 'none';
    }
    // flat mode: the screenshot sits inside the placeholder panel so it moves with it
    if (!mapped && sec._vis) {
      if (wrap.parentNode !== sec._vis) sec._vis.appendChild(wrap);
      if (si.svg.parentNode !== sec._vis) sec._vis.appendChild(si.svg);
      wrap.style.transform = 'translate(' + (ox - 1114) + 'px,' + (oy - 120) + 'px)';
      si.svg.style.left = '-1114px'; si.svg.style.top = '-120px';
    } else if (mapped) {
      si.svg.style.left = '0'; si.svg.style.top = '0';
      if (si.svg.parentNode !== sec) sec.appendChild(si.svg);
    }
    si.mode = mapped ? 'mapped' : 'flat';
  }

  /* ── fit typography: largest size that fits each slide's final state ──── */
  function overflows(box) {
    var lines = $$('.ln, .name', box);
    for (var i = 0; i < lines.length; i++) if (lines[i].scrollWidth > lines[i].clientWidth + 1) return true;
    var last = box.lastElementChild;
    if (!last) return false;
    var bottom = 0;
    $$(':scope > *', box).forEach(function (c) { bottom = Math.max(bottom, c.offsetTop + c.offsetHeight); });
    if (box.querySelector('.cols')) {
      var cols = box.querySelector('.cols');
      bottom = 0;
      $$('.col', cols).forEach(function (c) { bottom = Math.max(bottom, cols.offsetTop + c.offsetTop + c.offsetHeight); });
    }
    return bottom > box.clientHeight + 1;
  }
  function fitVar(box, name, max, min, stepPx) {
    for (var k = max; k >= min; k -= stepPx) {
      box.style.setProperty(name, k + 'px');
      if (!overflows(box)) return k;
    }
    box.style.setProperty(name, min + 'px');
    return min;
  }
  function fitAll() {
    sections.forEach(function (sec) {
      var txt = $('.txt', sec);
      if (!txt) return;
      if (sec.classList.contains('lay-stack')) fitVar(txt, '--k', 104, 56, 2);
      else if (sec.classList.contains('lay-who')) {
        // keyword must fit the column on one line
        for (var k = 96; k >= 56; k -= 2) {
          txt.style.setProperty('--k', k + 'px');
          var ok = $$('.key', txt).every(function (e) { return e.scrollWidth <= e.parentNode.clientWidth; });
          if (ok && !overflows(txt)) break;
        }
      }
      else if (sec.classList.contains('lay-product')) {
        var name = $('.name', txt);
        for (var kn = 240; kn >= 200; kn -= 4) {
          txt.style.setProperty('--kn', kn + 'px');
          if (name.scrollWidth <= txt.clientWidth) break;
        }
        fitVar(txt, '--k', 88, 56, 2);
      }
      else if (sec.classList.contains('lay-how')) fitVar(txt, '--k', 60, 36, 2);
      else if (sec.classList.contains('lay-next')) fitVar(txt, '--k', 104, 56, 2);
      else if (sec.classList.contains('lay-close')) {
        for (var kb = 136; kb >= 72; kb -= 4) {
          txt.style.setProperty('--kb', kb + 'px');
          txt.style.setProperty('--k', Math.max(48, Math.round(kb * 0.44)) + 'px');
          var big = $$('.big .ln', txt).every(function (e) { return e.getClientRects().length <= 1 && e.scrollWidth <= e.clientWidth; });
          var bigOneLine = $$('.big .ln', txt).every(function (e) {
            var r = document.createRange(); r.selectNodeContents(e); return r.getClientRects().length <= 1;
          });
          if (big && bigOneLine && !overflows(txt)) break;
        }
      }
    });
  }

  /* ── renders ──────────────────────────────────────────────────────────── */
  var player = new window.SeqPlayer($('#seq'), '#0E0F12');
  player.setSequences((R.sequences || []).map(function (q) {
    return { from: q.from, to: q.to, dir: RENDER_DIR + q.dir, frames: q.frames, ext: q.ext || 'webp' };
  }));

  function loadStills(onProgress) {
    var names = Object.keys(R.stills || {});
    var done = 0;
    return Promise.all(names.map(function (name) {
      var src = stillSrc(name);
      // reuse the print <img> when there is one, so each file is read once
      var existing = null;
      sections.forEach(function (sec) { if (sec._printImg && sec._printImg.getAttribute('src') === src) existing = sec._printImg; });
      var p = existing
        ? new Promise(function (res, rej) {
            if (existing.complete) { if (existing.naturalWidth) res(existing); else rej(new Error('missing')); }
            else { existing.addEventListener('load', function () { res(existing); }); existing.addEventListener('error', rej); }
          })
        : window.SeqPlayer.loadImage(src);
      return p.then(function (img) { return player.addStill(name, img); })
        .catch(function () { return false; })
        .then(function () { done++; onProgress(done / Math.max(1, names.length)); });
    }));
  }

  function markStills() {
    sections.forEach(function (sec, si) {
      var arr = stillsOf(slides[si]);
      var ok = arr.length > 0 && arr.every(function (n) { return player.hasStill(n); });
      sec.classList.toggle('has-still', ok);
      if (sec._printImg && !ok) { sec._printImg.remove(); sec._printImg = null; }
    });
  }

  // keep decoded only the camera moves next to where we are (memory stays small)
  function neighbourSeqs(idx) {
    var out = [], v0 = visualFor(steps[idx]), j, f;
    for (j = idx + 1; j < steps.length; j++) {
      var v = visualFor(steps[j]);
      if (v !== v0) { f = player.find(v0, v); if (f) out.push(f.s); break; }
    }
    for (j = idx - 1; j >= 0; j--) {
      var w = visualFor(steps[j]);
      if (w !== v0) { f = player.find(w, v0); if (f) out.push(f.s); break; }
    }
    return out;
  }
  function updateWindow() {
    var keep = neighbourSeqs(cur);
    Object.keys(player.seqs).forEach(function (k) {
      var s = player.seqs[k];
      if (keep.indexOf(s) < 0) player.release(s);
    });
    keep.forEach(function (s) { player.ensure(s); });
  }

  /* ── state & transitions ──────────────────────────────────────────────── */
  var cur = 0, ready = false, busy = null;

  function setBeats(si, b, instant) {
    var bs = beatEls[si], sec = sections[si];
    if (instant) sec.classList.add('no-anim');
    bs.forEach(function (e, i) {
      e.classList.toggle('on', i <= b);
      e.classList.toggle('past', i < b);
      e.classList.toggle('cur', i === b);
    });
    if (screenInfo && screenInfo.sec === sec) sec.classList.toggle('hl-on', screenInfo.hlBeat >= 0 && b >= screenInfo.hlBeat);
    if (sec._vis && sec._vis._labels.length > 1) {
      var lab = sec._vis._labels[Math.max(0, Math.min(sec._vis._labels.length - 1, b))];
      var pl = $('.plabel', sec._vis); if (pl && pl.textContent !== lab) pl.textContent = lab;
    }
    if (instant) { void sec.offsetWidth; sec.classList.remove('no-anim'); }
  }

  function Timeline() { this.items = []; this.done = false; }
  Timeline.prototype.at = function (ms, fn) {
    var self = this, it = { fn: fn, ran: false };
    it.id = setTimeout(function () { if (!it.ran && !self.done) { it.ran = true; fn(); } }, ms);
    this.items.push(it);
    return this;
  };
  Timeline.prototype.finish = function () {
    if (this.done) return;
    this.done = true;
    player.finish();
    this.items.forEach(function (it) { clearTimeout(it.id); if (!it.ran) { it.ran = true; it.fn(); } });
  };

  function clearSlideClasses(sec) {
    sec.classList.remove('pre-fwd', 'pre-back', 'leave-fwd', 'leave-back');
  }

  // Start the visual change on the canvas. Returns { reveal, dur } in ms.
  function startVisual(va, vb, dir) {
    if (va === vb) return { reveal: 0, dur: 0 };
    if (vb === '#black') return { reveal: 0, dur: TIME.black };
    if (va === '#black') { player.show(vb); return { reveal: TIME.black * 0.5, dur: TIME.black }; }
    var f = player.find(va, vb);
    if (f && player.isReady(f.s) && player.hasStill(vb)) {
      player.play(f.s, f.reverse, TIME.seq, vb);
      return { reveal: TIME.seq * TIME.reveal, dur: TIME.seq };
    }
    if (player.hasStill(va) || player.hasStill(vb)) {
      player.fade(vb, TIME.fade);
      return { reveal: TIME.fade * 0.45, dur: TIME.fade };
    }
    return { reveal: 250, dur: 700 };   // placeholder panels move with CSS
  }

  function go(target, jump) {
    if (!ready || target < 0 || target >= steps.length || target === cur) return;
    if (busy) busy.finish();
    var from = steps[cur], to = steps[target], dir = target > cur ? 1 : -1;
    var adjacent = Math.abs(target - cur) === 1 && !jump;
    cur = target;
    if (dir > 0) timerAutoStart();
    var tl = busy = new Timeline();
    var va = visualFor(from), vb = visualFor(to);
    var endAt = 750;

    if (!adjacent) {
      // jump (overview): quick cross-fade, no camera move
      sections.forEach(function (sec, i) { if (i !== to.s) { sec.classList.remove('active', 'settled'); clearSlideClasses(sec); } });
      var secJ = sections[to.s];
      secJ.classList.add('no-anim'); clearSlideClasses(secJ); secJ.classList.add('active', 'pre-fwd');
      secJ.classList.remove('settled');
      setBeats(to.s, to.b, true);
      secJ.classList.add('no-anim'); void secJ.offsetWidth; secJ.classList.remove('no-anim');
      if (vb !== '#black') player.fade(vb, 500);
      tl.at(120, function () { secJ.classList.remove('pre-fwd'); });
      tl.at(520, function () { secJ.classList.add('settled'); });
    } else if (from.s === to.s) {
      var v = startVisual(va, vb, dir);
      var sec = sections[to.s];
      if (v.dur) {
        sec.classList.remove('settled');
        if (dir > 0) tl.at(v.reveal, function () { setBeats(to.s, to.b); });
        else setBeats(to.s, to.b);
        tl.at(v.dur, function () { sec.classList.add('settled'); });
        endAt = Math.max(endAt, v.reveal + 750, v.dur);
      } else {
        setBeats(to.s, to.b);
      }
    } else {
      var secA = sections[from.s], secB = sections[to.s];
      secA.classList.remove('settled');
      clearSlideClasses(secA);
      secA.classList.add(dir > 0 ? 'leave-fwd' : 'leave-back');
      // incoming slide: final classes set instantly, held just off its rest position
      secB.classList.add('no-anim');
      clearSlideClasses(secB);
      secB.classList.add('active', dir > 0 ? 'pre-fwd' : 'pre-back');
      secB.classList.remove('settled');
      setBeats(to.s, to.b, true);
      secB.classList.add('no-anim'); void secB.offsetWidth; secB.classList.remove('no-anim');
      var vv = startVisual(va, vb, dir);
      tl.at(vv.reveal, function () { secB.classList.remove('pre-fwd', 'pre-back'); });
      tl.at(Math.max(vv.dur, TIME.leave + 100), function () {
        secA.classList.remove('active', 'leave-fwd', 'leave-back');
      });
      tl.at(vv.dur, function () { secB.classList.add('settled'); });
      endAt = Math.max(endAt, vv.reveal + 750, vv.dur, TIME.leave + 100);
    }
    if (!adjacent) endAt = 900;
    tl.at(endAt + 50, function () { if (busy === tl) busy = null; updateWindow(); });
    saveHash();
    broadcast();
  }

  function next() { go(cur + 1); }
  function prev() { go(cur - 1); }
  function jumpToSlide(si) {
    for (var i = 0; i < steps.length; i++) if (steps[i].s === si) { go(i, true); return; }
  }

  function showInstant(idx) {
    var st = steps[idx];
    sections.forEach(function (sec, i) {
      sec.classList.add('no-anim');
      clearSlideClasses(sec);
      sec.classList.toggle('active', i === st.s);
      sec.classList.toggle('settled', i === st.s);
    });
    setBeats(st.s, st.b, true);
    sections.forEach(function (sec) { void sec.offsetWidth; sec.classList.remove('no-anim'); });
    var v = visualFor(st);
    if (v !== '#black') player.show(v);
  }

  function saveHash() {
    try { history.replaceState(null, '', '#' + cur); } catch (e) {}
  }
  function readHash() {
    var n = parseInt((location.hash || '').slice(1), 10);
    return isFinite(n) && n >= 0 && n < steps.length ? n : 0;
  }

  /* ── timer ────────────────────────────────────────────────────────────── */
  var timer = { running: false, base: 0, since: 0 };
  var timerEl = $('#timer'), timerTick = 0;
  function elapsed() { return timer.base + (timer.running ? Date.now() - timer.since : 0); }
  function fmtTime(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + pad2(s % 60); }
  function timerAutoStart() {
    if (!timer.running && timer.base === 0) { timer.running = true; timer.since = Date.now(); broadcast(); }
  }
  function timerReset() { timer.base = 0; timer.running = true; timer.since = Date.now(); renderTimer(); broadcast(); }
  function renderTimer() {
    var ms = elapsed();
    timerEl.textContent = fmtTime(ms);
    timerEl.classList.toggle('over', ms >= 180000);
  }
  function toggleTimer() {
    var on = !timerEl.classList.contains('on');
    timerEl.classList.toggle('on', on);
    clearInterval(timerTick);
    if (on) { renderTimer(); timerTick = setInterval(renderTimer, 250); }
  }

  /* ── presenter sync (BroadcastChannel, window reference, localStorage) ── */
  var chan = null, presWin = null, msgId = 0, SID = Math.random().toString(36).slice(2);
  try { chan = new BroadcastChannel('pitch-deck'); } catch (e) { chan = null; }
  function stateMsg() {
    return { type: 'state', from: 'deck', sid: SID, n: ++msgId, id: SID + '-' + msgId, step: cur, total: steps.length,
             slide: steps[cur].s, beat: steps[cur].b, slides: N,
             timer: { running: timer.running, base: timer.base, since: timer.since },
             black: $('#blackout').classList.contains('on') };
  }
  function broadcast() {
    var m = stateMsg();
    if (chan) try { chan.postMessage(m); } catch (e) {}
    if (presWin && !presWin.closed) try { presWin.postMessage(m, '*'); } catch (e) {}
    try { localStorage.setItem('pitch-deck-state', JSON.stringify(m)); } catch (e) {}
  }
  var seen = {};
  function onMsg(m) {
    if (!m || m.from !== 'presenter' || seen[m.id]) return;
    seen[m.id] = 1;
    if (m.type === 'hello') broadcast();
    else if (m.type === 'key') handleKey(m.key, !!m.shift);
  }
  if (chan) chan.onmessage = function (e) { onMsg(e.data); };
  window.addEventListener('message', function (e) { onMsg(e.data); });
  window.addEventListener('storage', function (e) {
    if (e.key === 'pitch-deck-cmd' && e.newValue) try { onMsg(JSON.parse(e.newValue)); } catch (x) {}
  });
  function openPresenter() {
    try {
      presWin = window.open('presenter.html', 'pitch-presenter', 'width=1200,height=760');
      setTimeout(broadcast, 400);
    } catch (e) {}
  }

  /* ── overlays: help, overview, black, video ───────────────────────────── */
  var help = $('#help'), ov = $('#overview'), black = $('#blackout');
  help.innerHTML = '<div class="inner"><h2>Keys</h2><dl>' + [
    ['Space  /  →  /  PgDn  /  ↓', 'Next beat'],
    ['←  /  PgUp  /  ↑', 'Previous beat'],
    ['B', 'Black screen on / off'],
    ['V', 'Backup demo video (V or Esc closes)'],
    ['T  /  Shift+T', 'Timer on / off  ·  reset'],
    ['P', 'Presenter window'],
    ['O', 'Overview (arrows, Enter)'],
    ['F', 'Full screen'],
    ['H  /  ?', 'This list']
  ].map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl></div>';

  var ovSel = 0;
  function buildOverview() {
    var html = '<div class="inner"><h2>Overview</h2><div class="grid">';
    slides.forEach(function (s, i) {
      var st = stillsOf(s)[0], src = st && player.hasStill(st) ? stillSrc(st) : null;
      var title = s.black ? 'Live demo' : fill(((s.beats[0] || {}).show || [])[0] || s.id);
      html += '<div class="tile" data-i="' + i + '"><div class="thumb' + (s.black ? ' black' : '') + '">' +
        (src ? '<img alt="" src="' + esc(src) + '">' : '') + '</div>' +
        '<div class="cap"><span class="n">' + pad2(i + 1) + '</span><span class="t">' + esc(title.replace(/'/g, '’')) + '</span></div></div>';
    });
    ov.innerHTML = html + '</div></div>';
  }
  function markOverview() { $$('.tile', ov).forEach(function (t, i) { t.classList.toggle('sel', i === ovSel); }); }
  function openOverview() { buildOverview(); ovSel = steps[cur].s; markOverview(); ov.classList.add('on'); }
  function closeOverview() { ov.classList.remove('on'); }

  var video = $('#video'), vlayer = $('#video-layer'), vpick = $('#video-pick');
  function openVideo() {
    vlayer.classList.add('on');
    var src = D.backupVideo;
    var failed = false;
    function fail() {
      if (failed) return; failed = true;
      try { vpick.value = ''; vpick.click(); } catch (e) {}
    }
    if (!src) { fail(); return; }
    video.onerror = fail;
    video.src = src;
    var p = video.play();
    if (p && p.catch) p.catch(function (err) { if (err && err.name !== 'AbortError') fail(); });
  }
  vpick.addEventListener('change', function () {
    var f = vpick.files && vpick.files[0];
    if (!f) return;
    video.onerror = null;
    video.src = URL.createObjectURL(f);
    vlayer.classList.add('on');
    var p = video.play(); if (p && p.catch) p.catch(function () {});
  });
  function closeVideo() {
    vlayer.classList.remove('on');
    try { video.pause(); } catch (e) {}
    video.onerror = null;
    video.removeAttribute('src');
    try { video.load(); } catch (e) {}
  }

  function toggleBlack() { black.classList.toggle('on'); broadcast(); }
  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) { var x = document.exitFullscreen(); if (x && x.catch) x.catch(function () {}); }
      else { var y = document.documentElement.requestFullscreen(); if (y && y.catch) y.catch(function () {}); }
    } catch (e) {}
  }

  /* ── keys ─────────────────────────────────────────────────────────────── */
  function handleKey(key, shift, e) {
    var lower = key.length === 1 ? key.toLowerCase() : key;
    if (vlayer.classList.contains('on')) {
      if (lower === 'v' || key === 'Escape') { closeVideo(); return true; }
      if (key === ' ') { if (video.paused) video.play().catch(function () {}); else video.pause(); return true; }
      return false;
    }
    if (ov.classList.contains('on')) {
      if (key === 'ArrowRight') ovSel = Math.min(N - 1, ovSel + 1);
      else if (key === 'ArrowLeft') ovSel = Math.max(0, ovSel - 1);
      else if (key === 'ArrowDown') ovSel = Math.min(N - 1, ovSel + 4);
      else if (key === 'ArrowUp') ovSel = Math.max(0, ovSel - 4);
      else if (key === 'Enter') { closeOverview(); jumpToSlide(ovSel); return true; }
      else if (lower === 'o' || key === 'Escape') { closeOverview(); return true; }
      else return false;
      markOverview();
      return true;
    }
    if (help.classList.contains('on')) {
      if (lower === 'h' || key === '?' || key === 'Escape') { help.classList.remove('on'); return true; }
      return false;
    }
    switch (key) {
      case ' ': case 'ArrowRight': case 'PageDown': case 'ArrowDown':
        if (!(e && e.repeat)) next(); return true;
      case 'ArrowLeft': case 'PageUp': case 'ArrowUp':
        if (!(e && e.repeat)) prev(); return true;
      case 'F5': return true;            // clicker "start show" button: never reload the deck
      case 'Escape': return false;
      case '?': help.classList.add('on'); return true;
      case '.': toggleBlack(); return true;
    }
    switch (lower) {
      case 'b': toggleBlack(); return true;
      case 'v': openVideo(); return true;
      case 't': if (shift) timerReset(); else toggleTimer(); return true;
      case 'p': openPresenter(); return true;
      case 'o': openOverview(); return true;
      case 'f': toggleFullscreen(); return true;
      case 'h': help.classList.add('on'); return true;
    }
    return false;
  }

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;          // browser shortcuts pass through
    if (e.target === vpick) return;
    if (handleKey(e.key, e.shiftKey, e)) e.preventDefault();
  }, true);

  // mouse and wheel never move the deck
  window.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
  window.addEventListener('mousedown', function (e) { if (e.button === 1) e.preventDefault(); });
  var cursorT = 0;
  window.addEventListener('mousemove', function () {
    document.body.classList.remove('hide-cursor');
    clearTimeout(cursorT);
    cursorT = setTimeout(function () { document.body.classList.add('hide-cursor'); }, 1500);
  });

  /* ── scale ────────────────────────────────────────────────────────────── */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.documentElement.style.setProperty('--s', String(s));
  }
  window.addEventListener('resize', fit);
  fit();

  /* ── boot ─────────────────────────────────────────────────────────────── */
  var loader = $('#loader'), bar = $('#loader i');
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var faces = ['400 40px Inter', '500 40px Inter', '600 40px Inter',
                 '400 40px "Noto Sans Devanagari"', '500 40px "Noto Sans Devanagari"',
                 '400 20px "Plex Mono"', '500 20px "Plex Mono"'];
    var all = Promise.all(faces.map(function (f) { return document.fonts.load(f, f.indexOf('Devanagari') > 0 ? 'घर' : 'Aa'); }))
      .then(function () { return document.fonts.ready; });
    return Promise.race([all, new Promise(function (r) { setTimeout(r, 4000); })]);
  }

  cur = readHash();
  fontsReady().then(function () {
    fitAll();
    var firstSeqs = neighbourSeqs(cur);
    var total = 1 + firstSeqs.length, parts = [0];
    function prog() {
      var p = parts.reduce(function (a, b) { return a + b; }, 0) / total;
      bar.style.width = (p * 100).toFixed(1) + '%';
    }
    var stillsP = loadStills(function (p) { parts[0] = p; prog(); });
    var seqP = firstSeqs.map(function (s, i) {
      var n = s.meta.frames, got = 0;
      parts[i + 1] = 0;
      return player.ensure(s, function () { got++; parts[i + 1] = got / n; prog(); });
    });
    return Promise.all([stillsP].concat(seqP));
  }).then(function () {
    markStills();
    if (screenInfo) layoutScreen();
    showInstant(cur);
    ready = true;
    loader.classList.add('done');
    updateWindow();
    broadcast();
    document.documentElement.setAttribute('data-ready', '1');
  });

  // test hook (read-only)
  window.__deck = {
    get step() { return cur; }, get total() { return steps.length; },
    get state() { return { step: cur, slide: steps[cur].s, beat: steps[cur].b }; },
    get busy() { return !!busy; },
    steps: steps,
    screenMode: function () { return screenInfo && screenInfo.mode; },
    player: player
  };
})();
