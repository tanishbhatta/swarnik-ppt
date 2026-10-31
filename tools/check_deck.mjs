// Deck check: node tools/check_deck.mjs  [--quick]
// Opens index.html from file://, steps every beat at 1920×1080 and 1366×768,
// screenshots each into shots/, checks overlaps, offline, keys, print.
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = pathToFileURL(path.join(ROOT, 'index.html')).href;
const SHOTS = path.join(ROOT, 'shots');
const QUICK = process.argv.includes('--quick');
const report = { errors: [], warnings: [], network: [], overlaps: [], outside: [], failures: [], notes: [] };
const fail = (m) => { report.failures.push(m); console.log('  FAIL', m); };
const ok = (m) => console.log('  ok  ', m);

fs.mkdirSync(SHOTS, { recursive: true });

// 0. the app name must live only in content.js
{
  const src = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
  const name = (src.match(/appName:\s*"([^"]+)"/) || [])[1];
  const files = ['index.html', 'presenter.html', 'css/deck.css', 'js/deck.js', 'js/sequence.js', 'assets/renders/manifest.js'];
  const hits = name ? files.filter((f) => fs.existsSync(path.join(ROOT, f)) && fs.readFileSync(path.join(ROOT, f), 'utf8').includes(name)) : [];
  if (hits.length) fail(`app name "${name}" hard-coded in: ${hits.join(', ')}`); else ok('app name appears only in content.js');
}

async function launch() {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try { return { browser: await chromium.launch({ channel, headless: true }), channel: channel || 'chromium' }; } catch (e) { /* next */ }
  }
  throw new Error('no browser');
}

function wire(page, tag) {
  page.on('console', (m) => {
    const t = m.type();
    if (page.__mute && page.__mute.test(m.text())) return;
    if (t === 'error') report.errors.push(`[${tag}] ${m.text()}`);
    else if (t === 'warning') report.warnings.push(`[${tag}] ${m.text()}`);
  });
  page.on('pageerror', (e) => report.errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('request', (r) => { if (!/^(file|data|blob):/i.test(r.url())) report.network.push(`[${tag}] ${r.url()}`); });
}

async function settle(page) {
  await page.waitForFunction(() => window.__deck && !window.__deck.busy, null, { timeout: 15000 });
  await page.waitForTimeout(120);
}

// signature of what is visible: active slide + beat classes
const signature = (page) => page.evaluate(() => {
  return [...document.querySelectorAll('.slide')].map((s) => {
    if (!s.classList.contains('active')) return '-';
    const b = [...s.querySelectorAll('.beat')].map((e) => (e.classList.contains('on') ? (e.classList.contains('past') ? 'p' : 'c') : '.')).join('');
    const extra = ['pre-fwd', 'pre-back', 'leave-fwd', 'leave-back'].filter((c) => s.classList.contains(c)).join('+');
    return 'A' + b + (extra ? '!' + extra : '');
  }).join('|');
});

// visible text boxes, overlaps and out-of-stage
const layoutCheck = (page) => page.evaluate(() => {
  const stage = document.getElementById('stage').getBoundingClientRect();
  const sc = stage.width / 1920;
  const sec = document.querySelector('.slide.active');
  if (!sec) return { boxes: 0, overlaps: [], outside: [] };
  const sel = '.ln, .name, .tag, .lbl, .num, .smp, .note, .names, .folio, .numbers .n, .plabel, .screen .ph';
  const vis = (e) => {
    for (let n = e; n && n !== sec; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    }
    return true;
  };
  const els = [...sec.querySelectorAll(sel)].filter((e) => e.textContent.trim() && vis(e));
  const boxes = els.map((e) => {
    const r = e.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(e);
    const rs = [...range.getClientRects()].filter((q) => q.width > 0);
    let l = r.left, rt = r.right;
    if (rs.length && !e.classList.contains('tag')) { l = Math.min(...rs.map((q) => q.left)); rt = Math.max(...rs.map((q) => q.right)); }
    const ink = rs.length ? { l: Math.min(...rs.map((q) => q.left)), r: Math.max(...rs.map((q) => q.right)), t: Math.min(...rs.map((q) => q.top)), b: Math.max(...rs.map((q) => q.bottom)) } : null;
    return { e, name: (e.className || e.tagName) + ': ' + e.textContent.trim().slice(0, 40), l, r: rt, t: r.top, b: r.bottom, ink };
  });
  const overlaps = [], outside = [];
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    const ib = a.ink || a;
    const L = ib.l ?? a.l, Rr = ib.r ?? a.r, T = ib.t ?? a.t, B = ib.b ?? a.b;
    if (L < stage.left - 1 || Rr > stage.right + 1 || T < stage.top - 1 || B > stage.bottom + 1) outside.push(a.name);
    if (a.e.scrollWidth > a.e.clientWidth + 1 && getComputedStyle(a.e).display === 'block') outside.push('overflow-x ' + a.name);
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 2 * sc && h > 2 * sc) overlaps.push(a.name + '  ×  ' + b.name);
    }
  }
  return { boxes: boxes.length, overlaps, outside };
});

async function runViewport(browser, w, h, opts) {
  const tag = `${w}x${h}`;
  console.log(`\n── ${tag}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  wire(page, tag);
  await page.goto(URL_);
  await page.waitForSelector('html[data-ready="1"]', { timeout: 30000 });
  await settle(page);
  const total = await page.evaluate(() => window.__deck.total);
  const dir = path.join(SHOTS, tag);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));

  const info = await page.evaluate(() => ({
    stills: Object.keys((window.RENDERS || {}).stills || {}).length,
    seqs: ((window.RENDERS || {}).sequences || []).length,
    screen: window.__deck.screenMode(),
    broken: [...document.images].filter((i) => i.getAttribute('src') && i.complete && !i.naturalWidth).map((i) => i.getAttribute('src')),
  }));
  console.log(`  info  ${tag}: ${info.stills} stills, ${info.seqs} camera moves, screenshot overlay: ${info.screen}`);
  if (info.broken.length) fail(`${tag}: broken images ${info.broken.join(', ')}`);
  if (info.stills && info.screen !== 'mapped') fail(`${tag}: screenshot overlay not mapped onto the 3D phone`);

  // frame pacing: log rAF timestamps around each camera move
  await page.evaluate(() => {
    window.__frames = [];
    const loop = (t) => { if (window.__deck.busy) window.__frames.push(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });

  const sigs = [];
  for (let i = 0; i < total; i++) {
    if (i > 0) { await page.keyboard.press(i % 2 ? 'Space' : 'PageDown'); await settle(page); }
    const st = await page.evaluate(() => window.__deck.state);
    if (st.step !== i) fail(`${tag}: expected step ${i}, got ${st.step}`);
    sigs.push(await signature(page));
    const lc = await layoutCheck(page);
    lc.overlaps.forEach((o) => report.overlaps.push(`[${tag} step ${i}] ${o}`));
    lc.outside.forEach((o) => report.outside.push(`[${tag} step ${i}] ${o}`));
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(2, '0')}_s${st.slide + 1}_b${st.beat + 1}.png`) });
  }
  ok(`${tag}: stepped forward through ${total} steps`);
  const pace = await page.evaluate(() => {
    const f = window.__frames, gaps = [];
    for (let i = 1; i < f.length; i++) { const g = f[i] - f[i - 1]; if (g < 400) gaps.push(g); }
    gaps.sort((a, b) => a - b);
    const avg = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
    return { n: gaps.length, fps: 1000 / avg, p95: gaps[Math.floor(gaps.length * 0.95)] || 0, over33: gaps.filter((g) => g > 33.4).length };
  });
  report.notes.push(`${tag} frame pacing during transitions: ${pace.n} frames, avg ${pace.fps.toFixed(1)} fps, p95 gap ${pace.p95.toFixed(1)} ms, ${pace.over33} gaps > 33 ms (headless, indicative only)`);
  // extra press at the end does nothing
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  if ((await page.evaluate(() => window.__deck.step)) !== total - 1) fail(`${tag}: advanced past the end`);

  if (opts.slowBack) {
    for (let i = total - 2; i >= 0; i--) {
      await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'PageUp'); await settle(page);
      const sg = await signature(page);
      if (sg !== sigs[i]) fail(`${tag}: step ${i} differs going back\n      fwd  ${sigs[i]}\n      back ${sg}`);
    }
    ok(`${tag}: stepped back slowly, every step matches the forward state`);
  } else {
    for (let i = total - 2; i >= 0; i--) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(60); }
    await settle(page);
    await page.waitForTimeout(800);
    const sg = await signature(page);
    if (sg !== sigs[0]) fail(`${tag}: after rapid back-stepping, start state differs\n      ${sigs[0]}\n      ${sg}`);
    else ok(`${tag}: rapid back-stepping returns to the exact start state`);
  }
  return { ctx, page, total };
}

async function keyTests(ctx, page, total) {
  console.log('\n── keys');
  const step = () => page.evaluate(() => window.__deck.step);
  // go to slide 2
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Space'); await settle(page); }
  const s0 = await step();

  // mouse + wheel do nothing
  await page.mouse.click(960, 540); await page.mouse.click(300, 900, { button: 'right' }).catch(() => {});
  await page.mouse.wheel(0, 800); await page.mouse.wheel(0, -800);
  await page.waitForTimeout(600);
  if ((await step()) !== s0) fail('click / wheel changed the beat'); else ok('click, right-click and wheel leave the beat alone');

  // B
  await page.keyboard.press('b');
  const bOn = await page.evaluate(() => document.getElementById('blackout').classList.contains('on'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'key_B_black.png') });
  await page.keyboard.press('b');
  const bOff = await page.evaluate(() => !document.getElementById('blackout').classList.contains('on'));
  (bOn && bOff) ? ok('B toggles black') : fail('B black toggle');

  // T, Shift+T
  await page.keyboard.press('t');
  const tShown = await page.evaluate(() => document.getElementById('timer').classList.contains('on'));
  await page.waitForTimeout(1300);
  const tRun = await page.evaluate(() => document.getElementById('timer').textContent);
  await page.keyboard.press('Shift+T');
  const tReset = await page.evaluate(() => document.getElementById('timer').textContent);
  await page.screenshot({ path: path.join(SHOTS, 'key_T_timer.png') });
  await page.keyboard.press('t');
  const tHidden = await page.evaluate(() => !document.getElementById('timer').classList.contains('on'));
  (tShown && tRun !== '0:00' && tReset === '0:00' && tHidden) ? ok(`T timer shows (${tRun}), Shift+T resets, T hides`) : fail(`timer: shown=${tShown} run=${tRun} reset=${tReset} hidden=${tHidden}`);

  // H and ?
  await page.keyboard.press('h');
  const hOn = await page.evaluate(() => document.getElementById('help').classList.contains('on'));
  await page.screenshot({ path: path.join(SHOTS, 'key_H_help.png') });
  await page.keyboard.press('Space');                       // swallowed while help is open
  const hStep = await step();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+Slash');
  const qOn = await page.evaluate(() => document.getElementById('help').classList.contains('on'));
  await page.keyboard.press('?');
  const hOff = await page.evaluate(() => !document.getElementById('help').classList.contains('on'));
  (hOn && qOn && hOff && hStep === s0) ? ok('H / ? open the key list, Esc / ? close it') : fail(`help: ${hOn} ${qOn} ${hOff} ${hStep}`);

  // O overview: move right twice, Enter
  await page.keyboard.press('o');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS, 'key_O_overview.png') });
  const sel0 = await page.evaluate(() => [...document.querySelectorAll('#overview .tile')].findIndex((t) => t.classList.contains('sel')));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await settle(page);
  const st = await page.evaluate(() => window.__deck.state);
  const ovClosed = await page.evaluate(() => !document.getElementById('overview').classList.contains('on'));
  (st.slide === sel0 + 2 && ovClosed) ? ok(`O overview: jumped from slide ${sel0 + 1} to slide ${st.slide + 1}`) : fail(`overview jump: sel0=${sel0} now=${st.slide}`);
  await page.keyboard.press('o'); await page.keyboard.press('Escape');
  if (await page.evaluate(() => document.getElementById('overview').classList.contains('on'))) fail('Esc did not close overview');

  // F fullscreen: must not throw
  const errsBefore = report.errors.length;
  await page.keyboard.press('f'); await page.waitForTimeout(300);
  await page.keyboard.press('f'); await page.waitForTimeout(300);
  report.errors.length === errsBefore ? ok('F toggles fullscreen without errors') : fail('F produced errors');

  // P presenter
  const [pres] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), page.keyboard.press('p')]);
  if (!pres) fail('P did not open the presenter window');
  else {
    wire(pres, 'presenter');
    await pres.waitForLoadState('load');
    await pres.waitForFunction(() => /Slide/.test(document.getElementById('where').textContent), null, { timeout: 5000 }).catch(() => {});
    const w1 = await pres.evaluate(() => document.getElementById('where').textContent);
    await page.keyboard.press('Space'); await settle(page);
    await pres.waitForTimeout(400);
    const w2 = await pres.evaluate(() => document.getElementById('where').textContent);
    const say = await pres.evaluate(() => document.getElementById('now').textContent);
    const before = await step();
    await pres.keyboard.press('Space');
    await page.waitForTimeout(300); await settle(page);
    const after = await step();
    await pres.screenshot({ path: path.join(SHOTS, 'key_P_presenter.png') });
    (/Slide/.test(w1) && w1 !== w2 && after === before + 1) ? ok(`P presenter follows the deck ("${w2.trim()}") and drives it`) : fail(`presenter: "${w1}" → "${w2}", deck ${before}→${after}`);
    if (/\{app\}/.test(say)) fail('presenter shows a raw {app}');
    await pres.close();
  }

  // V backup video: generated test file, then missing file → file picker
  const vid = path.join(ROOT, 'assets', 'video', 'backup_demo.mp4');
  const hadVideo = fs.existsSync(vid);
  let made = false;
  if (!hadVideo) {
    try {
      const ff = createRequire(import.meta.url)('ffmpeg-static');
      execFileSync(ff, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440',
        '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', vid]);
      made = true;
    } catch (e) { report.notes.push('could not generate a test video: ' + e.message); }
  }
  if (fs.existsSync(vid)) {
    await page.keyboard.press('v');
    await page.waitForTimeout(1200);
    const v = await page.evaluate(() => { const x = document.getElementById('video'); return { on: document.getElementById('video-layer').classList.contains('on'), t: x.currentTime, paused: x.paused }; });
    await page.screenshot({ path: path.join(SHOTS, 'key_V_video.png') });
    await page.keyboard.press('v');
    const closed = await page.evaluate(() => !document.getElementById('video-layer').classList.contains('on'));
    (v.on && v.t > 0.2 && closed) ? ok(`V plays the backup video (t=${v.t.toFixed(2)}s), V closes it`) : fail(`video: ${JSON.stringify(v)} closed=${closed}`);
    await page.keyboard.press('v'); await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    if (await page.evaluate(() => document.getElementById('video-layer').classList.contains('on'))) fail('Esc did not close the video');
  }
  if (made) fs.unlinkSync(vid);
  if (!fs.existsSync(vid)) {
    page.__mute = /ERR_FILE_NOT_FOUND|Failed to load resource|backup_demo/;
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), page.keyboard.press('v')]);
    chooser ? ok('V with no video file opens a file picker') : fail('V with no video file: no file picker');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    page.__mute = null;
  }
  return true;
}

async function printCheck(page) {
  console.log('\n── print');
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: path.join(SHOTS, 'print_preview.png'), fullPage: true });
  await page.emulateMedia({ media: null });
  const pdfPath = path.join(SHOTS, 'deck.pdf');
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  const buf = fs.readFileSync(pdfPath).toString('latin1');
  const pages = (buf.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  pages === 8 ? ok('print → 8 pages') : fail(`print → ${pages} pages (want 8)`);
  return pages;
}

(async () => {
  const { browser, channel } = await launch();
  console.log('browser:', channel);
  const a = await runViewport(browser, 1920, 1080, { slowBack: true });
  await keyTests(a.ctx, a.page, a.total);
  report.pages = await printCheck(a.page);
  await a.ctx.close();
  if (!QUICK) {
    const b = await runViewport(browser, 1366, 768, { slowBack: false });
    await b.ctx.close();
  }
  await browser.close();

  console.log('\n── summary');
  const show = (k, label) => {
    const arr = report[k];
    console.log(`${label}: ${arr.length}`);
    [...new Set(arr)].slice(0, 25).forEach((x) => console.log('   ', x));
  };
  show('errors', 'console errors');
  show('warnings', 'console warnings');
  show('network', 'non-file network requests');
  show('overlaps', 'text overlaps');
  show('outside', 'outside stage / overflow');
  show('failures', 'failed checks');
  report.notes.forEach((n) => console.log('note:', n));
  fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 2));
  const bad = report.errors.length + report.network.length + report.overlaps.length + report.outside.length + report.failures.length;
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
