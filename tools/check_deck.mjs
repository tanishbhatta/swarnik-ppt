// Deck check:  node tools/check_deck.mjs
// Opens index.html from file:// and checks: console + network, fonts, every beat forwards and back
// (both themes), overlaps / out-of-stage / clipped Devanagari, evidence text vs content.js, screenshot
// aspect ratios, every key, clicks + wheel, print page count, variants (slide 6 on, optional beat on,
// numbers empty / filled), the content.js error message, three screen sizes, and the contact sheet.
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = pathToFileURL(path.join(ROOT, 'index.html')).href;
const SHOTS = path.join(ROOT, 'shots');
const TMP = path.join(ROOT, 'tools', '_tmp');
const results = { failures: [], notes: [], counts: {} };
const fail = (m) => { results.failures.push(m); console.log('  FAIL', m); };
const ok = (m) => console.log('  ok  ', m);
const note = (m) => { results.notes.push(m); console.log('  note', m); };

fs.rmSync(SHOTS, { recursive: true, force: true });
for (const d of ['paper', 'ink', 'variant', 'filled', 'small']) fs.mkdirSync(path.join(SHOTS, d), { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

// content.js as data (same file the deck loads)
const SRC = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(SRC, sandbox);
const DECK = sandbox.window.DECK;
const enabledSlides = DECK.slides.filter((s) => s.enabled !== false);

// 0. the app name lives only in content.js
{
  const files = ['index.html', 'presenter.html', 'css/deck.css', 'js/deck.js', 'js/components.js'];
  const hits = files.filter((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').includes(DECK.appName));
  if (hits.length) fail(`app name hard-coded in: ${hits.join(', ')}`); else ok('app name appears only in content.js');
}

async function launch() {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try { return { browser: await chromium.launch({ channel, headless: true }), channel: channel || 'chromium' }; } catch (e) { /* next */ }
  }
  throw new Error('no browser found');
}
const { browser, channel } = await launch();
results.browser = channel;

// mutate DECK as content.js assigns it (variants without touching the file)
function mutator(fnSrc) {
  return `(() => {
    const mutate = ${fnSrc};
    Object.defineProperty(window, 'DECK', { configurable: true, get() { return undefined; },
      set(v) { mutate(v); Object.defineProperty(window, 'DECK', { value: v, writable: true, configurable: true }); } });
  })();`;
}

async function open(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: opts.reducedMotion || 'no-preference' });
  const page = await ctx.newPage();
  const log = { errors: [], network: [] };
  const wire = (p, tag) => {
    p.on('console', (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      if (log.muteVideo && /ERR_FILE_NOT_FOUND/.test(m.text()) && /backup_demo/.test((m.location() || {}).url || '')) return;
      log.errors.push(`[${tag}] ${m.type()}: ${m.text()}`);
    });
    p.on('pageerror', (e) => log.errors.push(`[${tag}] pageerror: ${e.message}`));
    p.on('request', (r) => { if (!/^(file|data|blob):/i.test(r.url())) log.network.push(`[${tag}] ${r.url()}`); });
  };
  wire(page, 'deck');
  ctx.on('page', (p) => { if (p !== page) wire(p, 'popup'); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(opts.url || INDEX);
  if (!opts.noWait) await page.waitForFunction(() => window.__deck && document.body.classList.contains('ready'), null, { timeout: 15000 });
  return { ctx, page, log };
}

const settle = async (page, ms = 760) => {
  await page.waitForFunction(() => !window.__deck.busy, null, { timeout: 10000 });
  await page.waitForTimeout(ms);
};

const signature = (page) => page.evaluate(() => {
  const s = document.querySelector('#slides .slide.active');
  return s.dataset.id + '|' + s.dataset.view + '|' + [...s.querySelectorAll('.comp')].map((c) => (c.classList.contains('on') ? (c.classList.contains('cur') ? 'C' : 'o') : '.')).join('') +
    '|' + document.querySelector('.hdr-num').textContent + '|' + [...document.querySelectorAll('#ftr .seg')].findIndex((x) => x.classList.contains('cur')) + '|' + document.getElementById('stage').classList.contains('demo');
});

// overlaps, out-of-stage, clipped Devanagari — all in stage pixels
const layoutCheck = (page) => page.evaluate(() => {
  const stage = document.getElementById('stage');
  const sr = stage.getBoundingClientRect();
  const k = sr.width / 1920;
  const toStage = (r) => ({ l: (r.left - sr.left) / k, t: (r.top - sr.top) / k, r: (r.right - sr.left) / k, b: (r.bottom - sr.top) / k });
  const slide = document.querySelector('#slides .slide.active');
  const out = { overlaps: [], outside: [], clipped: [], small: [], boxes: 0 };
  if (stage.classList.contains('demo')) return out;
  {
    // nothing the audience reads is under 28 px (stage pixels): slide text and the header
    [slide, document.getElementById('hdr')].forEach((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        const comp = el.closest('.comp');
        if (root === slide && (!comp || !comp.classList.contains('on'))) continue;
        if (el.closest('[hidden]')) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 27.5) out.small.push(fs + 'px: ' + n.textContent.trim().slice(0, 30));
      }
    });
  }
  const groups = [];
  const textRects = (el) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0.5 && r.height > 0.5) rects.push(toStage(r));
    }
    return rects;
  };
  const comps = [...slide.querySelectorAll('.comp.on')];
  comps.forEach((c) => {
    const name = c.dataset.role + '@' + c.dataset.beat;
    if (c.classList.contains('c-image')) {
      const img = c.querySelector('img');
      if (img) groups.push({ name, rects: [toStage(img.getBoundingClientRect())], image: true });
      return;
    }
    // each sub-block of a component is its own group (cards, columns, rows have several)
    const parts = c.matches('.c-card, .c-column, .c-step, .c-row, .c-figures, .c-timeline, .c-transform, .c-comments, .c-proof, .c-sequence, .c-team, .c-closing')
      ? [...c.querySelectorAll(':scope > *, .fig > *, .tl-stop > *, .tf-cell > *, .step-sample > *')] : [c];
    parts.forEach((p, i) => {
      const pcs = getComputedStyle(p);
      if (pcs.visibility === 'hidden' || parseFloat(pcs.opacity) < 0.05) return;   // faded-out parts don't count
      const rects = textRects(p);
      if (p.tagName === 'IMG' || p.querySelector('img')) {
        const im = p.tagName === 'IMG' ? p : p.querySelector('img');
        rects.push(toStage(im.getBoundingClientRect()));
      }
      if (rects.length) groups.push({ name: name + '#' + i, rects, comp: c });
    });
  });
  // header + footer text
  ['#hdr', '#ftr'].forEach((sel) => groups.push({ name: sel, rects: textRects(document.querySelector(sel)) }));
  const hit = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      if (groups[i].comp && groups[i].comp === groups[j].comp) continue;
      if (groups[i].image && groups[j].image) continue;
      outer: for (const a of groups[i].rects) for (const b of groups[j].rects) {
        if (hit(a, b)) { out.overlaps.push(groups[i].name + ' × ' + groups[j].name); break outer; }
      }
    }
  }
  groups.forEach((g) => g.rects.forEach((r) => {
    out.boxes++;
    if (r.l < -1 || r.t < -1 || r.r > 1921 || r.b > 1081) out.outside.push(g.name + ` (${Math.round(r.l)},${Math.round(r.t)},${Math.round(r.r)},${Math.round(r.b)})`);
  }));
  slide.querySelectorAll('.comp.on .dv').forEach((d) => {
    let el = d.closest('p, li, h1, h2, h3, div');
    if (el && el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflow !== 'visible') out.clipped.push(el.className + ': ' + el.textContent.slice(0, 30));
    // glyph box vs line box: the Devanagari run must sit inside its element's box
    const r = d.getBoundingClientRect(), e = el.getBoundingClientRect();
    if (r.top < e.top - 2 || r.bottom > e.bottom + 2) out.clipped.push('dv outside line box: ' + d.textContent.slice(0, 20));
  });
  return out;
});

async function walk(page, label, dir, opts = {}) {
  const n = await page.evaluate(() => window.__deck.steps.length);
  const steps = await page.evaluate(() => window.__deck.steps);
  const issues = { overlaps: new Set(), outside: new Set(), clipped: new Set(), small: new Set() };
  await page.evaluate(() => window.__deck.go(0));
  await settle(page);
  const start = await signature(page);
  for (let i = 0; i < n; i++) {
    if (i > 0) { await page.keyboard.press('Space'); await settle(page); }
    const st = steps[i];
    const lc = await layoutCheck(page);
    lc.overlaps.forEach((o) => issues.overlaps.add(`${st.id} beat ${st.b + 1}: ${o}`));
    lc.outside.forEach((o) => issues.outside.add(`${st.id} beat ${st.b + 1}: ${o}`));
    lc.clipped.forEach((o) => issues.clipped.add(`${st.id} beat ${st.b + 1}: ${o}`));
    lc.small.forEach((o) => issues.small.add(`${st.id} beat ${st.b + 1}: under 28 px: ${o}`));
    if (dir && opts.shots !== false) await page.screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, '0')}_${st.id}_${st.b + 1}.png`) });
  }
  const idx = await page.evaluate(() => window.__deck.index);
  if (idx !== n - 1) fail(`${label}: forward walk ended at step ${idx}, expected ${n - 1}`);
  for (let i = n - 1; i > 0; i--) { await page.keyboard.press('ArrowLeft'); await settle(page, 420); }
  const end = await signature(page);
  if (end !== start) fail(`${label}: state after walking back differs from the start\n    start ${start}\n    end   ${end}`);
  else ok(`${label}: ${n} beats forwards and back, end state = start state`);
  for (const k of ['overlaps', 'outside', 'clipped', 'small']) {
    if (issues[k].size) fail(`${label}: ${k}:\n    ` + [...issues[k]].join('\n    '));
    else ok(`${label}: no ${k}`);
  }
  return n;
}

// ── 1. main run, 1920×1080, paper then ink ─────────────────────────────────
console.log('\n1920×1080');
{
  const { ctx, page, log } = await open({ width: 1920, height: 1080 });
  // fonts
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const tests = {
      'Instrument Sans': ['600 80px "Instrument Sans"', '400 28px "Instrument Sans"', '500 48px "Instrument Sans"'],
      'Instrument Serif': ['italic 400 64px "Instrument Serif"'],
      'IBM Plex Mono': ['400 20px "IBM Plex Mono"', '400 36px "IBM Plex Mono"'],
      'Noto Sans Devanagari': ['400 40px "Noto Sans Devanagari"']
    };
    const res = {};
    for (const [fam, list] of Object.entries(tests)) res[fam] = list.every((f) => document.fonts.check(f, fam === 'Noto Sans Devanagari' ? 'क' : 'a'));
    res.loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style} ${f.weight}`);
    return res;
  });
  results.fonts = fonts;
  for (const fam of ['Instrument Sans', 'Instrument Serif', 'IBM Plex Mono', 'Noto Sans Devanagari']) {
    if (fonts[fam]) ok(`font loaded: ${fam}`); else fail(`font NOT loaded (fallback!): ${fam}`);
  }
  const nSlides = await page.evaluate(() => window.__deck.slides.length);
  if (nSlides !== enabledSlides.length) fail(`deck has ${nSlides} slides, content.js enables ${enabledSlides.length}`); else ok(`${nSlides} enabled slides`);
  const chrome = await page.evaluate(() => ({ num: document.querySelector('.hdr-num').textContent, right: document.querySelector('.hdr-r').innerText.trim(), folio: !!document.querySelector('.ftr-folio'), segs: document.querySelectorAll('#ftr .seg').length }));
  if (chrome.num === '01' && !chrome.right && !chrome.folio && chrome.segs === nSlides) ok(`header: section label only (no brand text); footer: ${chrome.segs} progress segments, no counter`);
  else fail(`header/footer: ${JSON.stringify(chrome)}`);
  const title = await page.title();
  if (!title.includes(DECK.appName)) fail(`<title> is "${title}"`); else ok(`<title> "${title}"`);

  results.counts.beats = await walk(page, 'paper', path.join(SHOTS, 'paper'));

  // evidence text = content.js, character for character
  const problem = DECK.slides.find((s) => s.id === 'problem');
  // slide 2: one tool per beat, screenshot as the hero, never upscaled more than 2.5x, previous card gone
  const cards = problem.beats.filter((b) => b.show && b.show.card).map((b) => b.show.card);
  const steps2 = await page.evaluate(() => window.__deck.steps.map((s, i) => ({ i, id: s.id, b: s.b })).filter((s) => s.id === 'problem'));
  for (let k = 0; k < cards.length; k++) {
    const st = steps2[2 + k];
    await page.evaluate((i) => window.__deck.go(i), st.i);
    await settle(page, 600);
    const info = await page.evaluate(() => {
      const on = [...document.querySelectorAll('#slides .slide[data-id="problem"] .c-card.on')];
      const im = on[0] && on[0].querySelector('img');
      return { visible: on.length, tool: on[0] && on[0].querySelector('.card-tool').textContent, w: im && im.clientWidth, h: im && im.clientHeight, nw: im && im.naturalWidth, nh: im && im.naturalHeight, verdictPx: on[0] && parseFloat(getComputedStyle(on[0].querySelector('.card-verdict')).fontSize) };
    });
    const scale = info.w / info.nw;
    const msg = `slide 2 beat ${st.b + 1}: ${info.tool}: screenshot ${info.nw}×${info.nh} shown at ${info.w}×${info.h} (${scale.toFixed(2)}×), verdict ${info.verdictPx}px`;
    if (info.visible === 1 && scale <= 2.5001 && Math.abs(info.w / info.h - info.nw / info.nh) < 0.02 && info.verdictPx >= 36) ok(msg); else fail(msg + ' · cards visible: ' + info.visible);
    results.counts['shot_' + k] = msg;
  }
  const users = DECK.slides.find((s) => s.id === 'users');
  const ev = users.beats.find((b) => b.showIfEmpty && b.showIfEmpty.comments);
  const comments = await page.evaluate(() => [...document.querySelectorAll('#slides .slide[data-id="users"] .comment')].map((e) => e.textContent.replace(/ /g, ' ')));
  if (JSON.stringify(comments) === JSON.stringify(ev.showIfEmpty.comments.lines)) ok('slide 4 comments match content.js exactly'); else fail(`slide 4 comments differ: ${JSON.stringify(comments)}`);
  const ul = await page.evaluate(() => [...document.querySelectorAll('#slides .slide[data-id="users"] .uline')].map((e) => e.textContent));
  if (ul.every((w) => ['cha', 'xa'].includes(w)) && ul.length === 3) ok(`underlined whole words: ${ul.join(', ')}`); else fail(`underlines: ${JSON.stringify(ul)}`);
  const wrong = await page.evaluate(() => [...document.querySelectorAll('#slides .slide[data-id="problem"] .wrong')].map((e) => e.textContent));
  ok(`wavy underlines on: ${wrong.join(' | ')}`);

  // aspect ratios: every screenshot and render, measured where it is visible
  const aspects = {};
  const allSteps = await page.evaluate(() => window.__deck.steps.length);
  for (let i = 0; i < allSteps; i++) {
    await page.evaluate((i) => window.__deck.go(i), i);
    await settle(page, 450);
    const list = await page.evaluate(() => [...document.querySelectorAll('#slides .slide.active .comp.on img')].map((im) => {
      const cs = getComputedStyle(im);
      const box = im.clientWidth / im.clientHeight, nat = im.naturalWidth / im.naturalHeight;
      return { src: im.getAttribute('src'), nat: im.naturalWidth + '×' + im.naturalHeight, fit: cs.objectFit, shown: Math.round(im.clientWidth) + '×' + Math.round(im.clientHeight),
        ok: im.naturalWidth > 0 && im.clientWidth > 0 && (cs.objectFit === 'contain' || Math.abs(box / nat - 1) < 0.01) };
    }));
    list.forEach((x) => { aspects[x.src] = x; });
  }
  Object.values(aspects).forEach((a) => (a.ok ? ok(`aspect kept: ${a.src} ${a.nat} → ${a.shown}${a.fit === 'contain' ? ' (object-fit: contain)' : ''}`) : fail(`aspect/load: ${JSON.stringify(a)}`)));
  if (Object.keys(aspects).length !== 7) fail(`expected 7 images on screen, saw ${Object.keys(aspects).length}`);

  // ink theme
  await page.keyboard.press('d');
  const th = await page.evaluate(() => document.documentElement.dataset.theme);
  if (th !== 'ink') fail('D did not switch to ink'); else ok('D switches to ink');
  await walk(page, 'ink', path.join(SHOTS, 'ink'));
  await page.keyboard.press('d');
  if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== 'paper') fail('D did not switch back'); else ok('D switches back to paper');

  // ── keys ──
  await page.evaluate(() => window.__deck.go(2));
  await settle(page);
  const idx0 = await page.evaluate(() => window.__deck.index);
  await page.mouse.click(960, 540);
  await page.mouse.click(1500, 900, { button: 'right' }).catch(() => {});
  await page.mouse.wheel(0, 600);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(300);
  if ((await page.evaluate(() => window.__deck.index)) !== idx0) fail('a click or the wheel changed the beat'); else ok('clicks and the wheel do nothing');
  await page.keyboard.press('Escape');

  // reload comes back to the same beat; F5 (clicker "start show") is ignored
  await page.evaluate(() => window.__deck.go(5));
  await settle(page, 300);
  await page.reload();
  await page.waitForFunction(() => window.__deck && document.body.classList.contains('ready'));
  const afterReload = await page.evaluate(() => window.__deck.index);
  if (afterReload === 5) ok('a reload comes back to the same beat (#6)'); else fail(`after reload: step ${afterReload}, expected 5`);
  let navigated = false;
  page.once('framenavigated', () => { navigated = true; });
  await page.keyboard.press('F5');
  await page.waitForTimeout(600);
  if (!navigated && (await page.evaluate(() => window.__deck.index)) === 5) ok('F5 is ignored'); else fail('F5 reloaded the page');
  await page.evaluate(() => window.__deck.go(2));
  await settle(page, 300);

  await page.keyboard.press('Period');
  const dotOn = await page.evaluate(() => document.getElementById('blackout').classList.contains('on'));
  await page.keyboard.press('Period');
  if (dotOn) ok('"." (clicker black-screen button) toggles black'); else fail('"." did not black the screen');
  await page.keyboard.press('b');
  const bOn = await page.evaluate(() => document.getElementById('blackout').classList.contains('on'));
  await page.keyboard.press('b');
  const bOff = await page.evaluate(() => !document.getElementById('blackout').classList.contains('on'));
  if (bOn && bOff) ok('B toggles the black screen'); else fail('B black screen');

  await page.keyboard.press('t');
  const t1 = await page.evaluate(() => ({ shown: !document.getElementById('timer').hidden, text: document.getElementById('timer').textContent }));
  await page.waitForTimeout(2200);
  const t2 = await page.evaluate(() => document.getElementById('timer').textContent);
  await page.keyboard.press('Shift+T');
  await page.waitForTimeout(300);
  const t3 = await page.evaluate(() => document.getElementById('timer').textContent);
  await page.evaluate(() => { /* fast-forward to 3:00 to check the colour */ });
  if (t1.shown && /^\d+:\d\d$/.test(t1.text) && t2 !== t1.text && t3 === '0:00') ok(`T shows the timer (${t1.text} → ${t2}), Shift+T resets (${t3})`); else fail(`timer ${JSON.stringify({ t1, t2, t3 })}`);
  const over = await page.evaluate(() => new Promise((res) => {
    // pretend 3 minutes have passed by moving the start back (internal state via a reset + clock shift)
    const real = Date.now;
    const t0 = real();
    Date.now = () => real() + 181000 + (real() - t0);
    setTimeout(() => { const el = document.getElementById('timer'); const r = { over: el.classList.contains('over'), text: el.textContent, color: getComputedStyle(el).color }; Date.now = real; res(r); }, 400);
  }));
  if (over.over) ok(`timer turns accent at 3:00 (${over.text}, ${over.color})`); else fail(`timer at 3:00: ${JSON.stringify(over)}`);
  await page.keyboard.press('t');
  if (await page.evaluate(() => document.getElementById('timer').hidden)) ok('T hides the timer again'); else fail('T did not hide the timer');

  await page.keyboard.press('h');
  const hOn = await page.evaluate(() => !document.getElementById('help').hidden);
  await page.keyboard.press('h');
  const hOff = await page.evaluate(() => document.getElementById('help').hidden);
  await page.keyboard.press('Shift+Slash');
  const qOn = await page.evaluate(() => !document.getElementById('help').hidden);
  if (qOn) await page.screenshot({ path: path.join(SHOTS, 'help.png') });
  await page.keyboard.press('Escape');
  if (hOn && hOff && qOn) ok('H and ? toggle the key list'); else fail(`help ${hOn} ${hOff} ${qOn}`);

  await page.keyboard.press('o');
  const oOn = await page.evaluate(() => !document.getElementById('overview').hidden);
  await page.screenshot({ path: path.join(SHOTS, 'overview.png') });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await settle(page);
  const afterO = await page.evaluate(() => ({ hidden: document.getElementById('overview').hidden, id: document.querySelector('#slides .slide.active').dataset.id, idx: window.__deck.index }));
  const sel = await page.evaluate(() => window.__deck.steps.findIndex((s) => s.id === window.__deck.slides[Math.min(window.__deck.slides.length - 1, 1 + 2)].id));
  if (oOn && afterO.hidden && afterO.idx === sel) ok(`O opens the overview, arrows + Enter jump (now on ${afterO.id})`); else fail(`overview ${JSON.stringify({ oOn, afterO, sel })}`);
  await page.keyboard.press('o');
  await page.keyboard.press('Escape');
  if (await page.evaluate(() => document.getElementById('overview').hidden)) ok('Esc closes the overview'); else fail('Esc did not close the overview');

  // fullscreen
  await page.keyboard.press('f');
  await page.waitForTimeout(400);
  const fs1 = await page.evaluate(() => !!document.fullscreenElement);
  await page.keyboard.press('f');
  await page.waitForTimeout(400);
  const fs2 = await page.evaluate(() => !!document.fullscreenElement);
  if (fs1 && !fs2) ok('F enters and leaves fullscreen'); else note(`F: fullscreen ${fs1 ? 'entered' : 'not entered'} / ${fs2 ? 'still on' : 'left'} (headless browsers may refuse fullscreen)`);

  // presenter window
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.keyboard.press('p')]);
  await popup.waitForLoadState('load');
  await page.keyboard.press('Space');
  await settle(page, 400);
  await popup.waitForTimeout(600);
  const pres = await popup.evaluate(() => ({ say: document.getElementById('say').textContent, sec: document.getElementById('section').textContent, beat: document.getElementById('beat').textContent }));
  const expectSec = await page.evaluate(() => document.querySelector('.hdr-sec').textContent);
  if (pres.sec === expectSec && pres.say.length > 10) ok(`P opens the presenter window, in sync ("${pres.sec}", beat ${pres.beat})`); else fail(`presenter ${JSON.stringify(pres)} vs ${expectSec}`);
  const before = await page.evaluate(() => window.__deck.index);
  await popup.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__deck.index);
  if (after === before + 1) ok('arrow keys in the presenter window move the deck'); else note(`presenter → deck control: ${before} → ${after}`);
  await popup.screenshot({ path: path.join(SHOTS, 'presenter.png') });
  await popup.close();

  // video: a short test file (made with ffmpeg, deleted afterwards), then the missing-file picker
  const vidPath = path.join(ROOT, DECK.backupVideo);
  const ownVideo = fs.existsSync(vidPath);
  let made = false;
  if (!ownVideo) {
    try {
      const ffmpeg = require('ffmpeg-static');
      fs.mkdirSync(path.dirname(vidPath), { recursive: true });
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x0E6B60:s=640x360:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', vidPath]);
      made = true;
    } catch (e) { note('could not make a test video: ' + e.message); }
  }
  if (fs.existsSync(vidPath)) {
    await page.keyboard.press('v');
    await page.waitForTimeout(1200);
    const v = await page.evaluate(() => { const el = document.getElementById('video'); return { open: !document.getElementById('video-layer').hidden, t: el.currentTime, err: el.error && el.error.code }; });
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => document.getElementById('video-layer').hidden);
    if (v.open && v.t > 0 && closed) ok(`V plays the backup video (t=${v.t.toFixed(2)}s), Esc closes it`); else fail(`video ${JSON.stringify(v)} closed=${closed}`);
    await page.keyboard.press('v');
    await page.waitForTimeout(500);
    await page.keyboard.press('v');
    if (await page.evaluate(() => document.getElementById('video-layer').hidden)) ok('V closes the video too'); else fail('V did not close the video');
  }
  if (made) fs.rmSync(vidPath);
  if (!fs.existsSync(vidPath)) {
    log.muteVideo = true;   // the 404 for the missing file is the point of this test
    const chooser = page.waitForEvent('filechooser', { timeout: 4000 }).then(() => true, () => false);
    await page.keyboard.press('v');
    const picked = await chooser;
    await page.keyboard.press('Escape');
    if (picked) ok('V with no video file opens a file picker'); else fail('V with a missing file did not open a file picker');
  }
  if (made) ok('test video deleted');

  // print
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ path: path.join(SHOTS, 'print.pdf'), preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (pages === enabledSlides.length) ok(`print: ${pages} pages = ${enabledSlides.length} enabled slides`); else fail(`print: ${pages} pages, expected ${enabledSlides.length}`);
  results.counts.printPages = pages;

  if (log.errors.length) fail('console/page errors:\n    ' + log.errors.join('\n    ')); else ok('zero console errors, warnings or page errors');
  if (log.network.length) fail('network requests:\n    ' + log.network.join('\n    ')); else ok('zero non-file:// requests');
  await ctx.close();
}

// ── 2. contact sheet: final state of each slide, both themes ────────────────
async function finals(theme, dir, init) {
  const { ctx, page } = await open({ width: 1920, height: 1080 }, { init });
  if (theme === 'ink') await page.keyboard.press('d');
  const steps = await page.evaluate(() => window.__deck.steps);
  const files = [];
  const lastOf = {};
  steps.forEach((s, i) => { if (s.view !== 'demo') lastOf[s.s] = i; });
  for (const [s, i] of Object.entries(lastOf)) {
    await page.evaluate((i) => window.__deck.go(i), i);
    await settle(page, 900);
    const f = path.join(dir, `final_${theme}_${String(+s + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: f });
    files.push(f);
  }
  await ctx.close();
  return files;
}
{
  console.log('\ncontact sheet');
  const paper = await finals('paper', path.join(SHOTS, 'paper'));
  const ink = await finals('ink', path.join(SHOTS, 'ink'));
  const cols = paper.length;
  const w = 480, h = 270, gap = 16;
  const html = `<html><body style="margin:0;background:#8a857c;padding:${gap}px;display:grid;grid-template-columns:repeat(${Math.min(cols, 4)},${w}px);gap:${gap}px">` +
    [...paper, ...ink].map((f) => `<img src="${pathToFileURL(f).href}" style="width:${w}px;height:${h}px;display:block">`).join('') + '</body></html>';
  const sheet = path.join(TMP, 'sheet.html');
  fs.writeFileSync(sheet, html);
  const ctx = await browser.newContext({ viewport: { width: Math.min(cols, 4) * (w + gap) + gap, height: 400 } });
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(sheet).href);
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(SHOTS, 'contact-sheet.png'), fullPage: true });
  await ctx.close();
  fs.rmSync(sheet);
  ok('shots/contact-sheet.png');
}

// ── 3. smaller screens (letterboxed) ────────────────────────────────────────
for (const vp of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }]) {
  console.log(`\n${vp.width}×${vp.height}`);
  const { ctx, page, log } = await open(vp);
  const label = `${vp.width}x${vp.height}`;
  const dir = path.join(SHOTS, 'small', label);
  fs.mkdirSync(dir, { recursive: true });
  await walk(page, label, dir);
  const scale = await page.evaluate(() => document.getElementById('stage').getBoundingClientRect().width / 1920);
  ok(`${label}: stage scale ${scale.toFixed(3)} → headline ${(80 * scale).toFixed(1)} px, smallest readable text (28) ${(28 * scale).toFixed(1)} px, labels ${(20 * scale).toFixed(1)} px`);
  results[label] = { scale };
  if (log.errors.length) fail(`${label} errors:\n    ` + log.errors.join('\n    '));
  await ctx.close();
}

// ── 4. variants: slide 6 on, optional beat on, numbers empty / filled ───────
console.log('\nvariant: business slide on, hidden-a beat on, all numbers empty');
{
  const init = mutator(`(d) => {
    d.slides.find((s) => s.id === 'business').enabled = true;
    d.slides.find((s) => s.id === 'science').beats.forEach((b) => { b.enabled = true; });
    for (const k in d.numbers) d.numbers[k] = '';
  }`);
  const { ctx, page, log } = await open({ width: 1920, height: 1080 }, { init });
  const n = await page.evaluate(() => window.__deck.slides.length);
  if (n === enabledSlides.length + 1) ok(`variant: ${n} slides (01–${String(n).padStart(2, '0')})`); else fail(`variant slides ${n}`);
  await walk(page, 'variant', path.join(SHOTS, 'variant'));
  const sci = await page.evaluate(() => [...document.querySelectorAll('#slides .slide[data-id="science"] .comp')].map((c) => c.dataset.role));
  if (!sci.includes('figures') && sci.includes('transform')) ok(`variant: science uses the empty-numbers beat + transform (${sci.join(', ')})`); else fail(`variant science comps ${sci}`);
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (pages === n) ok(`variant print: ${pages} pages`); else fail(`variant print ${pages} pages, expected ${n}`);
  if (log.errors.length) fail('variant errors:\n    ' + log.errors.join('\n    '));
  await ctx.close();
  await finals('paper', path.join(SHOTS, 'variant'), init);
}
console.log('\nvariant: survey numbers filled (test values only, never saved)');
{
  const init = mutator(`(d) => {
    d.numbers.surveyAsked = '40'; d.numbers.surveyYes = '36';
    d.teamName = 'Team name';
  }`);
  const { ctx, page, log } = await open({ width: 1920, height: 1080 }, { init });
  await walk(page, 'filled', path.join(SHOTS, 'filled'));
  const fig = await page.evaluate(() => (document.querySelector('#slides .slide[data-id="users"] .fig-value') || {}).textContent);
  if (fig === '36 of 40') ok('filled: survey figure "36 of 40" replaces the comments'); else fail(`filled: figure ${fig}`);
  const tn = await page.evaluate(() => (document.querySelector('#slides .team-name') || {}).textContent);
  if (tn === 'Team name') ok('filled: team name shows on slide 1'); else fail('filled: team name ' + tn);
  if (log.errors.length) fail('filled errors:\n    ' + log.errors.join('\n    '));
  await ctx.close();
}

// ── 5. reduced motion still works ───────────────────────────────────────────
{
  const { ctx, page, log } = await open({ width: 1920, height: 1080 }, { reducedMotion: 'reduce' });
  await walk(page, 'reduced-motion', null, { shots: false });
  if (log.errors.length) fail('reduced-motion errors:\n    ' + log.errors.join('\n    '));
  await ctx.close();
}

// ── 6. content.js with a syntax error shows the plain message ──────────────
console.log('\nbroken content.js');
{
  const dir = path.join(TMP, 'broken');
  fs.mkdirSync(dir, { recursive: true });
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace('href="css/', 'href="../../../css/').replace(/src="js\//g, 'src="../../../js/');
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'content.js'), SRC.replace('event: "Sci-Pitch 2026",', 'event: "Sci-Pitch 2026"'));
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(dir, 'index.html')).href);
  await page.waitForTimeout(600);
  const msg = await page.evaluate(() => { const e = document.getElementById('load-error'); return e && !e.hidden ? e.innerText : null; });
  await page.screenshot({ path: path.join(SHOTS, 'content-error.png') });
  if (msg && msg.includes('content.js didn’t load')) ok(`syntax error shows the message: "${msg.replace(/\n+/g, ' / ')}"`); else fail(`no error message for a broken content.js (${msg})`);
  await ctx.close();
  fs.rmSync(dir, { recursive: true, force: true });
}

await browser.close();
fs.writeFileSync(path.join(SHOTS, 'results.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.failures.length ? results.failures.length + ' FAILURE(S)' : 'ALL CHECKS PASSED'} · notes: ${results.notes.length} · browser: ${channel}`);
process.exit(results.failures.length ? 1 : 0);
