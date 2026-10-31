/* ───────────────────────────────────────────────────────────────────────────
   Frame-sequence player.
   One full-stage <canvas>. Stills and camera-move frames are decoded to
   ImageBitmap ahead of time; drawing happens only when the frame changes.
   Missing files never throw: the caller just gets "not available".
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var W = 1920, H = 1080;

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('missing')); };
      img.src = src;
    });
  }

  function toBitmap(img, opts) {
    if (window.createImageBitmap) {
      return (opts ? createImageBitmap(img, opts) : createImageBitmap(img)).catch(function () {
        return (img.decode ? img.decode().catch(function () {}) : Promise.resolve()).then(function () { return img; });
      });
    }
    return (img.decode ? img.decode().catch(function () {}) : Promise.resolve()).then(function () { return img; });
  }

  function Player(canvas, bg) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.bg = bg || '#0E0F12';
    this.stills = Object.create(null);     // name -> bitmap
    this.seqs = Object.create(null);       // key -> { meta, frames, state, promise }
    this.list = [];                        // sequence metas
    this.anim = null;
    this.shown = null;                     // name of still currently on canvas (or null)
    // low-memory machines (≤ 4 GB reported): decode camera-move frames at 1280×720 (~half the memory)
    this.frameOpts = (navigator.deviceMemory && navigator.deviceMemory <= 4)
      ? { resizeWidth: 1280, resizeHeight: 720, resizeQuality: 'medium' } : null;
    this.snap = document.createElement('canvas');
    this.snap.width = W; this.snap.height = H;
    this.snapCtx = this.snap.getContext('2d', { alpha: false });
    this.clear();
  }

  Player.prototype.clear = function () {
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = this.bg;
    this.ctx.fillRect(0, 0, W, H);
    this.shown = null;
  };

  Player.prototype.addStill = function (name, img) {
    var self = this;
    return toBitmap(img).then(function (bm) { self.stills[name] = bm; return true; });
  };

  Player.prototype.hasStill = function (name) { return !!(name && this.stills[name]); };

  Player.prototype.show = function (name) {
    this.finish();
    if (this.hasStill(name)) {
      this.ctx.globalAlpha = 1;
      this.ctx.drawImage(this.stills[name], 0, 0, W, H);
      this.shown = name;
    } else {
      this.clear();
    }
  };

  /* sequences ------------------------------------------------------------ */
  Player.prototype.setSequences = function (list) {
    var self = this;
    this.list = list || [];
    this.list.forEach(function (m) {
      self.seqs[m.from + '>' + m.to] = { meta: m, frames: null, state: 'idle', promise: null };
    });
  };

  // Returns { s, reverse } or null
  Player.prototype.find = function (a, b) {
    if (!a || !b) return null;
    if (this.seqs[a + '>' + b]) return { s: this.seqs[a + '>' + b], reverse: false };
    if (this.seqs[b + '>' + a]) return { s: this.seqs[b + '>' + a], reverse: true };
    return null;
  };

  Player.prototype.ensure = function (s, onFrame) {
    var self = this;
    if (!s) return Promise.resolve(false);
    if (s.state === 'ready') return Promise.resolve(true);
    if (s.state === 'broken') return Promise.resolve(false);
    if (s.promise) { if (s.state === 'released') s.state = 'loading'; return s.promise; }
    var m = s.meta, n = m.frames, frames = new Array(n), next = 0, failed = false;
    s.state = 'loading';
    function pad(i) { var t = String(i + 1); while (t.length < 4) t = '0' + t; return t; }
    function worker() {
      if (failed || s.state === 'released') return Promise.resolve();
      var i = next++;
      if (i >= n) return Promise.resolve();
      return loadImage(m.dir + '/' + pad(i) + '.' + (m.ext || 'webp'))
        .then(function (img) { return toBitmap(img, self.frameOpts); })
        .then(function (bm) { frames[i] = bm; if (onFrame) onFrame(); return worker(); },
              function () { failed = true; });
    }
    var workers = [];
    for (var k = 0; k < 4; k++) workers.push(worker());
    s.promise = Promise.all(workers).then(function () {
      s.promise = null;
      var got = 0;
      for (var i = 0; i < n; i++) if (frames[i]) got++;
      if (failed) { closeAll(frames); s.state = 'broken'; return false; }
      if (s.state === 'released' || got !== n) { closeAll(frames); s.state = 'idle'; return false; }
      s.frames = frames; s.state = 'ready'; return true;
    });
    return s.promise;
  };

  function closeAll(frames) {
    for (var i = 0; i < frames.length; i++) {
      if (frames[i] && frames[i].close) try { frames[i].close(); } catch (e) {}
    }
  }

  Player.prototype.release = function (s) {
    if (!s) return;
    if (s.state === 'loading') { s.state = 'released'; return; }
    if (s.state === 'ready') {
      if (this.anim && this.anim.s === s) return;
      closeAll(s.frames); s.frames = null; s.state = 'idle';
    }
  };

  Player.prototype.isReady = function (s) { return !!(s && s.state === 'ready'); };

  /* playback --------------------------------------------------------------- */
  // Plays sequence s (forwards or reversed) over dur ms, then draws still `end`.
  Player.prototype.play = function (s, reverse, dur, end) {
    this.finish();
    var self = this, ctx = this.ctx, frames = s.frames, n = frames.length;
    var last = -1, t0 = 0, raf = 0, done = false;
    var a = { s: s };
    function draw(idx) { ctx.drawImage(frames[idx], 0, 0, W, H); }
    function step(now) {
      if (done) return;
      if (!t0) t0 = now;
      var p = (now - t0) / dur; if (p > 1) p = 1;
      var i = Math.round(p * (n - 1));
      var idx = reverse ? n - 1 - i : i;
      if (idx !== last) { draw(idx); last = idx; }
      if (p >= 1) { a.finish(); return; }
      raf = requestAnimationFrame(step);
    }
    return new Promise(function (resolve) {
      a.finish = function () {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        ctx.globalAlpha = 1;
        if (self.hasStill(end)) { ctx.drawImage(self.stills[end], 0, 0, W, H); self.shown = end; }
        else { draw(reverse ? 0 : n - 1); self.shown = null; }
        if (self.anim === a) self.anim = null;
        resolve();
      };
      self.anim = a;
      raf = requestAnimationFrame(step);
    });
  };

  // Cross-fades from whatever is on the canvas now to still `end` (or to the background).
  Player.prototype.fade = function (end, dur) {
    this.finish();
    var self = this, ctx = this.ctx, raf = 0, t0 = 0, done = false;
    this.snapCtx.drawImage(this.cv, 0, 0);
    var snap = this.snap, target = this.hasStill(end) ? this.stills[end] : null;
    var a = {};
    function frame(p) {
      ctx.globalAlpha = 1;
      ctx.drawImage(snap, 0, 0);
      ctx.globalAlpha = p;
      if (target) ctx.drawImage(target, 0, 0, W, H);
      else { ctx.fillStyle = self.bg; ctx.fillRect(0, 0, W, H); }
      ctx.globalAlpha = 1;
    }
    function step(now) {
      if (done) return;
      if (!t0) t0 = now;
      var p = (now - t0) / dur; if (p > 1) p = 1;
      // ease-out cubic on the fade
      var e = 1 - Math.pow(1 - p, 3);
      frame(e);
      if (p >= 1) { a.finish(); return; }
      raf = requestAnimationFrame(step);
    }
    return new Promise(function (resolve) {
      a.finish = function () {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        frame(1);
        self.shown = target ? end : null;
        if (self.anim === a) self.anim = null;
        resolve();
      };
      self.anim = a;
      raf = requestAnimationFrame(step);
    });
  };

  Player.prototype.finish = function () { if (this.anim) this.anim.finish(); };
  Player.prototype.busy = function () { return !!this.anim; };

  Player.loadImage = loadImage;
  window.SeqPlayer = Player;
})();
