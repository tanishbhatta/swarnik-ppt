/* ───────────────────────────────────────────────────────────────────────────
   Components: one render function per field type used in content.js `show`.
   Each function returns an array of elements. deck.js places them on the grid.
   Text helpers (placeholder tokens, typography, Devanagari runs) live here too, so
   presenter.html can share them.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var D = window.DECK || {};

  /* ── text ─────────────────────────────────────────────────────────────── */
  function get(path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, D);
  }
  var TOKEN = /\{(app|demoSentence|numbers\.[A-Za-z0-9_]+)\}/g;

  // Replace {app}, {demoSentence}, {numbers.x}. info.missing = true if any value is empty.
  function fill(s, info) {
    return String(s == null ? '' : s).replace(TOKEN, function (m, k) {
      var v = k === 'app' ? D.appName : get(k);
      if (v == null || String(v).trim() === '') { if (info) info.missing = true; return ''; }
      return String(v);
    });
  }
  function empty(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }

  // Real punctuation: curly quotes and apostrophes. "=" is never used as a word.
  function typo(s) {
    return String(s)
      .replace(/(^|[\s(\[{])"/g, '$1“').replace(/"/g, '”')
      .replace(/(^|[\s(\[{])'/g, '$1‘').replace(/'/g, '’')
      .replace(/ - /g, ' – ');
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  var DV = /[\u0900-\u097F]/;
  var DV_RUN = / ?[\u0900-\u097F\u200C\u200D]+(?:[ \u00A0,.]+[\u0900-\u097F\u200C\u200D]+)*[,.]? ?/g;

  // Escape + wrap Devanagari runs (own face, ~1.1× size).
  function dv(s) {
    return esc(s).replace(DV_RUN, function (m) { return '<span class="dv" lang="ne">' + m + '</span>'; });
  }

  /* Text → HTML.
     opts.marks: [{ text, cls, word }] wraps matching substrings (word: whole words only).
     opts.hang: hang an opening quote mark outside the left edge.
     opts.keepLast: glue the last two words together (no orphan).                        */
  function html(s, opts) {
    opts = opts || {};
    var t = typo(s);
    var segs = [{ t: t, cls: null }];
    (opts.marks || []).forEach(function (m) {
      if (empty(m.text)) return;
      var src = m.word ? new RegExp('(^|[^\\p{L}\\p{M}])(' + m.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[^\\p{L}\\p{M}])', 'gu') : null;
      var out = [];
      segs.forEach(function (sg) {
        if (sg.cls) { out.push(sg); return; }
        var str = sg.t, i = 0, mm;
        if (src) {
          src.lastIndex = 0;
          while ((mm = src.exec(str))) {
            var st = mm.index + mm[1].length;
            if (st > i) out.push({ t: str.slice(i, st), cls: null });
            out.push({ t: mm[2], cls: m.cls });
            i = st + mm[2].length;
            src.lastIndex = i;
          }
        } else {
          var j;
          while ((j = str.indexOf(m.text, i)) !== -1) {
            if (j > i) out.push({ t: str.slice(i, j), cls: null });
            out.push({ t: m.text, cls: m.cls });
            i = j + m.text.length;
          }
        }
        if (i < str.length) out.push({ t: str.slice(i), cls: null });
      });
      segs = out;
    });
    var h = segs.map(function (sg) {
      var inner = dv(sg.t);
      return sg.cls ? '<span class="' + sg.cls + '">' + inner + '</span>' : inner;
    }).join('');
    // a short word followed by punctuation never starts a line ("break it," stays together)
    h = h.replace(/ ([A-Za-z]{1,3}[,;:.!?])(?= |$)/g, '\u00A0$1');
    if (opts.keepLast !== false) {
      // last two words on one line, but only when the last word is short (avoids orphans)
      h = h.replace(/ ([^ <>]{1,12})((?:<\/span>)*)$/, '\u00A0$1$2');
    }
    if (opts.hang) h = h.replace(/^((?:<span[^>]*>)*)“/, '$1<span class="hang">“</span>');
    return h;
  }

  /* ── DOM helpers ──────────────────────────────────────────────────────── */
  function mk(tag, cls, inner) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (inner != null) e.innerHTML = inner;
    return e;
  }
  function txt(tag, cls, s, opts) {
    var e = mk(tag, cls, html(s, opts));
    if (DV.test(s)) e.classList.add('has-dv');
    return e;
  }
  function comp(role, el, mark) {
    el.classList.add('comp', 'c-' + role);
    el.dataset.role = role;
    if (mark) el.dataset.mark = mark;          // 'l' = rule on the left edge, 't' = on the top edge
    return el;
  }

  /* Line icons: drawn, never font glyphs. 2px stroke in currentColor. */
  var SVG = {
    right: '<svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 16H27M19 8l8 8-8 8"/></svg>',
    down: '<svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4V27M8 19l8 8 8-8"/></svg>',
    cross: '<svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><path d="M8 8L24 24M24 8L8 24"/></svg>'
  };

  function imageSrc(key) {
    if (empty(key)) return '';
    var map = D.images || {};
    return map[key] != null ? map[key] : key;
  }
  function img(key, cls) {
    var src = imageSrc(key);
    if (empty(src)) return null;
    var i = document.createElement('img');
    i.alt = '';
    i.decoding = 'async';
    i.src = src;
    if (cls) i.className = cls;
    return i;
  }

  // Evidence screenshots: as large as the layout allows, never upscaled more than 2.5×
  var SHOT = { w: 1664, h: 540, up: 2.5 };
  function sizeShot(i) {
    function apply() {
      var nw = i.naturalWidth, nh = i.naturalHeight;
      if (!nw || !nh) return;
      var k = Math.min(SHOT.w / nw, SHOT.h / nh, SHOT.up);
      i.style.width = Math.floor(nw * k) + 'px';
      i.style.height = Math.floor(nh * k) + 'px';
      i.dataset.scale = k.toFixed(2);
    }
    if (i.complete && i.naturalWidth) apply(); else i.addEventListener('load', apply);
  }

  /* ── components ───────────────────────────────────────────────────────── */
  function textValue(v) {
    var info = {};
    var s = fill(v, info);
    return info.missing || empty(s) ? null : s;
  }

  var C = {};

  C.headline = function (v) { var s = textValue(v); return s ? [comp('headline', txt('h2', 't-headline', s))] : []; };
  C.label = function (v) { var s = textValue(v); return s ? [comp('label', txt('p', 't-label', s, { keepLast: false }))] : []; };
  C.quote = function (v) { var s = textValue(v); return s ? [comp('quote', txt('p', 't-quote', s, { hang: true }), 'l')] : []; };
  C.statement = function (v) {
    var s = textValue(v);
    if (!s) return [];
    var parts = s.split(/(?<=[.!?])\s+(?=[A-Z“])/);
    var e = mk('p', 't-statement');
    e.innerHTML = parts.map(function (p) { return '<span class="sentence">' + html(p) + '</span>'; }).join(' ');
    return [comp('statement', e)];
  };
  C.note = function (v) { var s = textValue(v); return s ? [comp('note', txt('p', 't-small', s), 'l')] : []; };
  C.tag = function (v) { var s = textValue(v); return s ? [comp('tag', mk('div', '', '<span class="tag">' + html(s, { keepLast: false }) + '</span>'))] : []; };
  C.badge = function (v) { var s = textValue(v); return s ? [comp('badge', mk('div', '', '<span class="badge">' + html(s, { keepLast: false }) + '</span>'))] : []; };
  C.wordmark = function (v) { var s = textValue(v); return s ? [comp('wordmark', txt('h1', 't-wordmark', s, { keepLast: false }))] : []; };
  C.oneLiner = function (v) { var s = textValue(v); return s ? [comp('oneLiner', txt('p', 't-body', s))] : []; };
  C.names = function (v) { var s = textValue(v); return s ? [comp('names', txt('p', 't-label', s, { keepLast: false }))] : []; };

  C.team = function (v) {
    if (!v) return [];
    var lines = [D.teamName, (D.members || []).filter(function (m) { return !empty(m); }).join(' · '), D.school]
      .filter(function (s) { return !empty(s); });
    if (!lines.length) return [];
    var e = mk('div', 'team');
    lines.forEach(function (s, i) { e.appendChild(txt('p', 't-small' + (i === 0 && !empty(D.teamName) ? ' team-name' : ''), s, { keepLast: false })); });
    return [comp('team', e)];
  };

  C.image = function (key) {
    var i = img(key);
    if (!i) return [];
    var f = mk('figure', 'render');
    f.appendChild(i);
    f.dataset.image = key;
    return [comp('image', f)];
  };

  C.sequence = function (list) {
    var items = (list || []).map(textValue).filter(Boolean);
    if (!items.length) return [];
    var ol = mk('ol', 'sequence t-body');
    items.forEach(function (s, i) {
      if (i) ol.appendChild(mk('li', 'seq-arrow', SVG.right));
      ol.appendChild(mk('li', 'seq-item', html(s)));
    });
    return [comp('sequence', ol, 'l')];
  };

  // Rows of a hairline table. Each row is its own component (rows can arrive on different beats).
  C.rows = function (list) {
    return (list || []).map(function (r) {
      var label = textValue(r.label);
      var value = textValue(r.value), chat = textValue(r.chat), typed = textValue(r.typed);
      if (!label && !value && !chat && !typed) return null;
      var sample = chat != null || typed != null;
      var row = mk('div', 'row' + (sample ? ' row-sample' : ' row-text'));
      if (label) row.appendChild(txt('div', 'row-label ' + (sample ? 't-label' : 't-small'), label, { keepLast: false }));
      if (value) row.appendChild(txt('div', 'row-value t-body', value));
      if (chat) row.appendChild(txt('div', 'row-value t-sub mono', chat, { keepLast: false }));
      if (typed) row.appendChild(txt('div', 'row-value t-sub mono typed', typed, { keepLast: false }));
      if (r.mark) row.classList.add('row-mark');
      return comp('row', row, 'l');
    }).filter(Boolean);
  };

  // Evidence card: tool name, the real screenshot as the hero, verdict.
  C.card = function (c) {
    if (!c) return [];
    var e = mk('article', 'card');
    var tool = textValue(c.tool);
    e.appendChild(tool ? txt('p', 'card-tool t-small', tool, { keepLast: false }) : mk('p', 'card-tool'));
    var shot = mk('div', 'card-shot');
    var i = img(c.image, 'shot');
    if (i) { sizeShot(i); shot.appendChild(i); }
    e.appendChild(shot);
    var verdict = textValue(c.verdict);
    e.appendChild(verdict ? mk('p', 'card-verdict t-body', '<span class="x">' + SVG.cross + '</span><span>' + html(verdict) + '</span>') : mk('p', 'card-verdict'));
    return [comp('card', e)];
  };

  // Summary of the cards: ✕ + tool + verdict, one row each (deck.js passes the slide's cards).
  C.verdicts = function (list) {
    var items = (list || []).filter(function (c) { return c && (textValue(c.tool) || textValue(c.verdict)); });
    if (!items.length) return [];
    var e = mk('div', 'verdicts');
    items.forEach(function (c) {
      var r = mk('div', 'verdict-row');
      r.appendChild(mk('span', 'x', SVG.cross));
      r.appendChild(txt('p', 'v-tool t-small', textValue(c.tool) || '', { keepLast: false }));
      r.appendChild(txt('p', 'v-verdict t-body', textValue(c.verdict) || ''));
      e.appendChild(r);
    });
    return [comp('verdicts', e, 'l')];
  };

  C.column = function (c) {
    if (!c) return [];
    var e = mk('article', 'column');
    var title = textValue(c.title), sub = textValue(c.sub), where = textValue(c.where);
    if (!title && !sub && !where) return [];
    var t = title ? txt('h3', 'col-title t-sub', title, { keepLast: false }) : mk('h3', 'col-title');
    var w = where ? txt('p', 'col-where t-label', where, { keepLast: false }) : mk('p', 'col-where');
    t.dataset.flipPart = '1';
    w.dataset.flipPart = '1';
    e.appendChild(t);
    e.appendChild(sub ? txt('p', 'col-sub t-small', sub) : mk('p', 'col-sub'));
    e.appendChild(w);
    return [comp('column', e, 't')];
  };

  // Typed comments (verbatim) + the screenshot as proof (placed separately by the layout).
  C.comments = function (c) {
    if (!c) return [];
    var out = [];
    var lines = (c.lines || []).map(textValue).filter(Boolean);
    if (lines.length) {
      var ul = mk('ul', 'comments');
      var marks = (c.underline || []).map(function (w) { return { text: w, cls: 'uline', word: true }; });
      lines.forEach(function (s) {
        var li = mk('li', 'comment t-body mono', html(s, { keepLast: false, marks: marks }));
        li.dataset.text = s;
        ul.appendChild(li);
      });
      out.push(comp('comments', ul, 'l'));
    }
    var i = img(c.image, 'shot');
    if (i) {
      var f = mk('figure', 'proof');
      f.appendChild(i);
      var cap = textValue(c.caption);
      if (cap) f.appendChild(txt('figcaption', 't-label', cap, { keepLast: false }));
      out.push(comp('proof', f));
    }
    return out;
  };

  C.figure = function (f) {
    if (!f) return [];
    var value = textValue(f.value);
    if (!value) return [];
    var e = mk('div', 'figure');
    e.appendChild(mk('p', 'fig-value t-statement', html(value, { keepLast: false })));
    var label = textValue(f.label), source = textValue(f.source);
    if (label) e.appendChild(txt('p', 'fig-label t-body', label));
    if (source) e.appendChild(txt('p', 'fig-source t-label', source, { keepLast: false }));
    return [comp('figure', e, 'l')];
  };

  C.figures = function (list) {
    var items = (list || []).map(function (f) {
      var v = textValue(f.value);
      return v ? { value: v, label: textValue(f.label) } : null;
    }).filter(Boolean);
    if (!items.length) return [];
    var e = mk('div', 'figures');
    items.forEach(function (f) {
      var d = mk('div', 'fig');
      d.appendChild(mk('p', 'fig-value t-statement', html(f.value, { keepLast: false })));
      if (f.label) d.appendChild(txt('p', 'fig-label t-small', f.label));
      e.appendChild(d);
    });
    return [comp('figures', e)];
  };

  // "How it works" column: number, title, Borrowed/Ours tag, then a one-line description or a sample.
  C.step = function (s) {
    if (!s) return [];
    var e = mk('article', 'step');
    var n = fill(s.n);
    e.appendChild(mk('p', 'step-n t-label', esc(n ? (n.length < 2 ? '0' + n : n) : '')));
    var title = textValue(s.title);
    e.appendChild(title ? txt('h3', 'step-title', title, { keepLast: false }) : mk('h3', 'step-title'));
    var tag = textValue(s.tag);
    var tagBox = mk('div', 'step-tag');
    if (tag) tagBox.innerHTML = '<span class="tag ' + (/^ours$/i.test(tag) ? 'tag-ours' : 'tag-borrowed') + '">' + esc(tag) + '</span>';
    e.appendChild(tagBox);
    var sample = mk('div', 'step-sample');
    var desc = textValue(s.desc);
    if (desc) sample.appendChild(txt('p', 'step-desc t-body', desc));
    var from = textValue(s.from), to = textValue(s.to);
    if (from) sample.appendChild(txt('p', 'sample-from', from, { keepLast: false }));
    if (from && to) sample.appendChild(mk('p', 'sample-arrow', SVG.down));
    if (to) sample.appendChild(txt('p', 'sample-to mono typed', to, { keepLast: false }));
    e.appendChild(sample);
    return [comp('step', e, 't')];
  };

  // The hidden-‘a’ transformation: घर → gha·ra → ghar
  C.transform = function (list) {
    var items = (list || []).filter(Boolean);
    if (!items.length) return [];
    var e = mk('div', 'transform');
    items.forEach(function (it, i) {
      if (i) e.appendChild(mk('div', 'tf-arrow', SVG.right));
      var cell = mk('div', 'tf-cell');
      var word;
      if (!empty(it.devanagari)) word = txt('p', 'tf-word tf-dv', fill(it.devanagari), { keepLast: false });
      else if (!empty(it.struck)) word = txt('p', 'tf-word tf-struck t-statement', fill(it.struck), { keepLast: false });
      else if (!empty(it.typed)) word = txt('p', 'tf-word tf-typed t-statement mono typed', fill(it.typed), { keepLast: false });
      else return;
      cell.appendChild(word);
      var cap = textValue(it.caption);
      if (cap) cell.appendChild(txt('p', 'tf-cap t-label', cap, { keepLast: false }));
      e.appendChild(cell);
    });
    return [comp('transform', e, 'l')];
  };

  C.timeline = function (list) {
    var items = (list || []).filter(function (t) { return t && (textValue(t.when) || textValue(t.what)); });
    if (!items.length) return [];
    var e = mk('ol', 'timeline');
    items.forEach(function (t, i) {
      var li = mk('li', 'tl-stop' + (i === 0 ? ' tl-now' : ''));
      li.appendChild(mk('span', 'tl-dot'));
      var when = textValue(t.when), what = textValue(t.what), typed = textValue(t.typed);
      li.appendChild(when ? txt('p', 'tl-when t-label', when, { keepLast: false }) : mk('p', 'tl-when t-label'));
      if (what) li.appendChild(txt('p', 'tl-what t-body', what, { keepLast: false }));
      if (typed) li.appendChild(txt('p', 'tl-typed t-body mono typed', typed, { keepLast: false }));
      e.appendChild(li);
    });
    return [comp('timeline', e, 'l')];
  };

  C.closing = function (c) {
    if (!c) return [];
    var spoken = textValue(c.spoken), typed = textValue(c.typed);
    if (!spoken && !typed) return [];
    var e = mk('div', 'closing');
    if (spoken) e.appendChild(txt('p', 'closing-spoken', spoken, { keepLast: false }));
    if (typed) e.appendChild(txt('p', 'closing-typed mono typed', typed, { keepLast: false }));
    return [comp('closing', e)];
  };

  window.DeckText = { fill: fill, typo: typo, esc: esc, html: html, empty: empty, DV: DV };
  window.DeckComponents = C;
  window.DeckIcons = SVG;
})();
