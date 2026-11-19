// 倉鼠跑滾輪：左右交替按鍵讓倉鼠跑起來。30 秒內跑最遠。
// 速度：每一步「正確交替」加速，同一邊連按兩次會絆倒；速度越快越耗體力，體力歸零要喘一下；
// 連續 40 步不失誤吃到瓜子：補體力，並短暫加速、不耗體力。最佳紀錄只存在這台裝置。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tr = (zh, en) => window.YKLanguage?.language === 'en' ? en : zh;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ROUND = 30, SEED_STEPS = 40, TURBO_TIME = 2.2;
  const RANKS = [
    { min: 0, zh: '散步鼠', en: 'Strolling Hamster' },
    { min: 60, zh: '慢跑鼠', en: 'Jogging Hamster' },
    { min: 120, zh: '飆速鼠', en: 'Speedy Hamster' },
    { min: 170, zh: '閃電鼠', en: 'Lightning Hamster' },
    { min: 240, zh: '傳說鼠王', en: 'Legendary Hamster King' },
  ];
  const rankOf = d => RANKS.reduce((r, k) => d >= k.min ? k : r, RANKS[0]);
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('yk-hamster') || '{}'); } catch { return {}; } },
    set(v) { try { localStorage.setItem('yk-hamster', JSON.stringify(v)); } catch { } },
  };

  const stage = $('hamster-stage'), canvas = $('hamster-canvas'), ctx = canvas.getContext('2d');
  const overlay = $('hamster-overlay'), toastEl = $('hamster-toast');
  const padL = $('pad-left'), padR = $('pad-right');

  // ---------------- game state ----------------
  const G = {
    mode: 'ready',            // ready | count | run | done
    t: 0, count: 0,
    v: 0, dist: 0, top: 0,
    stamina: 1, tired: false,
    last: null, lastStep: 0, combo: 0, best: 0, steps: 0, stumbles: 0,
    stun: 0, turbo: 0, seed: null,
    wheel: 0, phase: 0, phaseTarget: 0, climb: 0, fall: 0, idle: 0,
  };
  let rec = store.get();

  function reset() {
    Object.assign(G, { t: 0, v: 0, dist: 0, top: 0, stamina: 1, tired: false, last: null, lastStep: 0, combo: 0, best: 0, steps: 0, stumbles: 0, stun: 0, turbo: 0, seed: null, climb: 0, fall: 0 });
  }

  // ---------------- input ----------------
  function step(side) {
    if (G.mode === 'ready' || G.mode === 'done') { if (G.mode === 'ready' || overlayReady) start(); return; }
    if (G.mode !== 'run' || G.stun > 0) return;
    const now = performance.now() / 1000, gap = now - G.lastStep;
    if (side === G.last) { if (G.v > 1.2 && gap < .9) stumble(); return; }
    // rhythm: a very hurried double-tap (< 55 ms) is worth less, a pause resets the streak
    let gain = .52;
    if (gap < .055) gain *= .45;
    if (gap > .7) G.combo = 0;
    if (G.tired) gain *= .22;
    if (G.turbo > 0) gain *= 1.45;
    gain *= 1 - Math.min(G.v / 15, .55);       // harder to add speed when already fast
    G.v += gain;
    G.last = side; G.lastStep = now; G.steps++; G.combo++; G.best = Math.max(G.best, G.combo);
    G.phaseTarget += Math.PI;
    if (G.combo > 0 && G.combo % SEED_STEPS === 0) dropSeed();
    comboPop();
    hint();
  }
  function stumble() {
    G.v *= .42; G.stun = .6; G.combo = 0; G.stumbles++; G.fall = 1; G.last = null;
    toast(tr('絆倒了！要左右交替', 'Tripped! Alternate left and right'), true);
    comboPop();
    buzz(30);
    hint();
  }
  function dropSeed() {
    G.seed = { t: 0 };
    G.stamina = Math.min(1, G.stamina + .2); G.tired = false; G.turbo = TURBO_TIME;
    toast(tr('瓜子加速！', 'Seed boost!'));
    buzz(12);
  }
  function buzz(ms) { try { navigator.vibrate?.(ms); } catch { } }

  const keyMap = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R' };
  addEventListener('keydown', e => {
    if (e.target.closest?.('input,textarea,select,a,[contenteditable]')) return;
    const side = keyMap[e.code];
    if (side) {
      e.preventDefault(); if (e.repeat) return;
      (side === 'L' ? padL : padR).classList.add('down');
      step(side); return;
    }
    if ((e.code === 'Space' || e.code === 'Enter') && G.mode !== 'run' && G.mode !== 'count' && !e.target.closest?.('button')) { e.preventDefault(); start(); }
  });
  addEventListener('keyup', e => { const side = keyMap[e.code]; if (side) (side === 'L' ? padL : padR).classList.remove('down'); });
  for (const pad of [padL, padR]) {
    const side = pad.dataset.side;
    pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.classList.add('down'); step(side); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) pad.addEventListener(ev, () => pad.classList.remove('down'));
    pad.addEventListener('click', e => { if (e.detail === 0) step(side); });   // keyboard activation of the button itself
    pad.addEventListener('contextmenu', e => e.preventDefault());
  }
  // tapping the left / right half of the scene works too
  canvas.addEventListener('pointerdown', e => {
    if (G.mode !== 'run') return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    step(e.clientX - r.left < r.width / 2 ? 'L' : 'R');
  });
  $('ov-start').addEventListener('click', () => start());

  // ---------------- flow ----------------
  let overlayReady = false;
  function start() {
    if (G.mode === 'count' || G.mode === 'run') return;
    reset(); G.mode = 'count'; G.count = reduced ? 1.5 : 3;
    overlayReady = false;
    overlay.hidden = false; overlay.classList.add('counting');
    $('ov-kicker').textContent = ''; $('ov-text').textContent = ''; $('ov-stats').hidden = true;
    $('ov-start').hidden = true; $('ov-hint').textContent = '';
    stage.focus({ preventScroll: true });
    // keep the whole scene and both buttons on screen while playing
    const top = stage.getBoundingClientRect().top, need = $('hamster-pads-wrap')?.getBoundingClientRect().bottom ?? padL.getBoundingClientRect().bottom;
    if (top < 0 || need > innerHeight) scrollTo({ top: scrollY + top - 10, behavior: reduced ? 'auto' : 'smooth' });
    live(tr('準備，3 秒後開始', 'Get ready, starting in 3 seconds'));
    hint();
  }
  function go() {
    G.mode = 'run'; overlay.hidden = true; overlay.classList.remove('counting');
    G.lastStep = performance.now() / 1000;
    live(tr('開始！左右交替按', 'Go! Alternate left and right'));
  }
  function finish() {
    G.mode = 'done';
    const d = Math.round(G.dist), top = Math.round(G.top * 3.6), prev = rec.best || 0, isNew = d > prev;
    rec = { best: Math.max(prev, d), top: Math.max(rec.top || 0, top), last: d, plays: (rec.plays || 0) + 1 };
    store.set(rec);
    const r = rankOf(d), next = RANKS.find(k => k.min > d);
    overlay.classList.remove('counting'); overlay.hidden = false;
    $('ov-kicker').textContent = isNew && prev ? tr('新紀錄！', 'NEW RECORD!') : tr('時間到', "TIME'S UP");
    $('ov-title').textContent = tr(`你是「${r.zh}」`, `You are a ${r.en}`);
    $('ov-text').textContent = next
      ? tr(`再跑 ${next.min - d} 公尺就能成為「${next.zh}」。`, `${next.min - d} m more to become a ${next.en}.`)
      : tr('最高稱號到手，倉鼠界的傳說！', 'Top title unlocked. A hamster legend!');
    const s = $('ov-stats'); s.hidden = false;
    s.innerHTML = `<div><span>${tr('距離', 'Distance')}</span><strong class="${isNew ? 'new' : ''}">${d} m</strong></div><div><span>${tr('最高時速', 'Top speed')}</span><strong>${top}</strong></div><div><span>${tr('最長連擊', 'Best combo')}</span><strong>${G.best}</strong></div>`;
    $('ov-start').hidden = false; $('ov-start').textContent = tr('再跑一次 ↻', 'Run again ↻');
    $('ov-hint').textContent = tr('空白鍵 / ENTER 再玩一次', 'SPACE / ENTER TO PLAY AGAIN');
    setTimeout(() => { if (G.mode === 'done') overlayReady = true; }, 700);   // a frantic last tap shouldn't restart at once
    live(tr(`時間到，跑了 ${d} 公尺，稱號：${r.zh}`, `Time's up: ${d} m, title: ${r.en}`));
    renderSide(); hint();
    setTimeout(() => $('ov-start').focus({ preventScroll: true }), 50);
  }
  function showReady() {
    overlay.hidden = false; overlay.classList.remove('counting');
    $('ov-kicker').textContent = 'HAMSTER DASH';
    $('ov-title').textContent = tr('準備好了嗎？', 'Ready to run?');
    $('ov-text').textContent = tr('左右交替按，讓倉鼠越跑越快。30 秒挑戰最遠距離！', 'Alternate left and right to speed up. Run as far as you can in 30 seconds!');
    $('ov-stats').hidden = true;
    $('ov-start').hidden = false; $('ov-start').textContent = tr('開始跑 ▶', 'Start ▶');
    $('ov-hint').textContent = tr('空白鍵 / ENTER 開始 · ← → 或 A D 跑步', 'SPACE / ENTER TO START · ← → OR A D TO RUN');
  }

  // ---------------- UI text ----------------
  let toastTimer = 0;
  function toast(text, bad = false) {
    toastEl.textContent = text; toastEl.classList.toggle('bad', bad); toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 900);
  }
  const liveEl = $('hamster-live');
  function live(text) { liveEl.textContent = text; }
  let comboT = 0;
  function comboPop() {
    const el = $('hud-combo');
    el.textContent = G.combo >= 4 ? tr(`連擊 ×${G.combo}`, `Combo ×${G.combo}`) : '';
    el.classList.add('pop'); clearTimeout(comboT); comboT = setTimeout(() => el.classList.remove('pop'), 110);
  }
  function hint() {
    const want = G.mode === 'run' ? (G.last === 'L' ? 'R' : G.last === 'R' ? 'L' : null) : null;
    padL.classList.toggle('next', want === 'L'); padR.classList.toggle('next', want === 'R');
  }
  function labels() {
    document.documentElement.lang = window.YKLanguage?.language === 'en' ? 'en' : 'zh-Hant';
    $('hud-time-label').textContent = tr('時間', 'TIME');
    $('hud-dist-label').textContent = tr('距離 m', 'DIST m');
    $('hud-stamina-label').textContent = tr('體力', 'STAMINA');
    $('pad-left-label').textContent = tr('左腳', 'Left');
    $('pad-right-label').textContent = tr('右腳', 'Right');
    $('st-last-label').textContent = tr('上一次', 'Last');
    $('st-top-label').textContent = tr('最高時速', 'Top km/h');
    $('st-best-label').textContent = tr('個人最佳', 'Best');
    if (G.mode === 'ready') showReady();
    else if (G.mode === 'done') finishTextRefresh();
    renderSide(); comboPop();
  }
  function finishTextRefresh() {
    // re-render the result card in the new language without saving again
    const d = rec.last ?? 0, r = rankOf(d), next = RANKS.find(k => k.min > d);
    $('ov-title').textContent = tr(`你是「${r.zh}」`, `You are a ${r.en}`);
    $('ov-text').textContent = next ? tr(`再跑 ${next.min - d} 公尺就能成為「${next.zh}」。`, `${next.min - d} m more to become a ${next.en}.`) : tr('最高稱號到手，倉鼠界的傳說！', 'Top title unlocked. A hamster legend!');
    $('ov-start').textContent = tr('再跑一次 ↻', 'Run again ↻');
    $('ov-hint').textContent = tr('空白鍵 / ENTER 再玩一次', 'SPACE / ENTER TO PLAY AGAIN');
    const spans = $('ov-stats').querySelectorAll('span');
    if (spans.length === 3) { spans[0].textContent = tr('距離', 'Distance'); spans[1].textContent = tr('最高時速', 'Top speed'); spans[2].textContent = tr('最長連擊', 'Best combo'); }
  }
  function renderSide() {
    $('st-last').textContent = rec.last != null ? `${rec.last} m` : '—';
    $('st-top').textContent = rec.top ? `${rec.top}` : '—';
    $('st-best').textContent = rec.best ? `${rec.best} m` : '—';
    const best = rec.best || 0;
    $('hamster-ranks').innerHTML = RANKS.map(k => `<li class="${best >= k.min && rec.best != null ? 'got' : ''}"><b>${tr(k.zh, k.en)}</b><span>${k.min ? `${k.min} m+` : tr('起步', 'start')}</span></li>`).join('');
  }
  addEventListener('yk:language', labels);

  // ---------------- simulation ----------------
  function update(dt) {
    G.idle += dt;
    if (G.mode === 'count') {
      G.count -= dt;
      const n = Math.ceil(G.count);
      $('ov-title').textContent = G.count > 0 ? String(n) : tr('跑！', 'GO!');
      if (G.count <= -.25) go();
    }
    if (G.mode === 'run') {
      G.t += dt;
      if (G.stun > 0) G.stun -= dt;
      if (G.turbo > 0) G.turbo -= dt;
      // friction: gentle at low speed, stronger at high speed; a long pause slows quickly
      const sinceStep = performance.now() / 1000 - G.lastStep;
      const drag = .55 + .3 * G.v + (sinceStep > .35 ? 2.2 : 0);
      G.v = Math.max(0, G.v - drag * dt);
      // stamina
      if (G.turbo > 0) G.stamina = Math.min(1, G.stamina + .05 * dt);
      else if (G.v > 4.5) G.stamina -= (G.v - 4.5) * .075 * dt;
      else G.stamina = Math.min(1, G.stamina + ((4.5 - G.v) * .04 + .03) * dt);
      if (G.stamina <= 0) { G.stamina = 0; if (!G.tired) { G.tired = true; toast(tr('喘不過氣了…放慢一點', 'Out of breath… ease off'), true); } }
      if (G.tired && G.stamina > .35) G.tired = false;
      G.dist += G.v * dt; G.top = Math.max(G.top, G.v);
      if (G.t >= ROUND) { G.t = ROUND; finish(); }
    } else if (G.mode !== 'count') {
      G.v = Math.max(0, G.v - (1 + G.v) * dt);
    }
    // animation
    G.wheel += G.v * dt / 1.1;
    G.phase += (G.phaseTarget - G.phase) * Math.min(1, dt * 22);
    if (G.mode !== 'run' && G.v < .3) { G.phaseTarget = Math.round(G.phase / Math.PI) * Math.PI; }
    const climbTo = G.fall > 0 ? -1.15 * G.fall : Math.min(G.v / 12, 1) * .2;
    G.climb += (climbTo - G.climb) * Math.min(1, dt * (G.fall > 0 ? 9 : 4));
    if (G.fall > 0) G.fall = Math.max(0, G.fall - dt * 1.8);
    if (G.seed) { G.seed.t += dt; if (G.seed.t > 1) G.seed = null; }
  }

  // ---------------- HUD ----------------
  let hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function hud() {
    const left = Math.max(0, ROUND - G.t);
    setText('hud-time', left.toFixed(1));
    $('hud-time').parentElement.classList.toggle('low', G.mode === 'run' && left < 5);
    setText('hud-dist', String(Math.floor(G.dist)));
    setText('hud-speed', String(Math.round(G.v * 3.6)));
    const bar = $('hud-stamina');
    bar.style.transform = `scaleX(${G.stamina.toFixed(3)})`;
    bar.className = G.stamina < .25 || G.tired ? 'low' : G.stamina < .55 ? 'mid' : '';
  }

  // ---------------- drawing ----------------
  let W = 0, H = 0, DPR = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    buildBedding();
  }
  new ResizeObserver(resize).observe(stage);

  let bedding = [];
  function buildBedding() {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    bedding = [];
    const n = Math.round(W / 6);
    for (let i = 0; i < n; i++) bedding.push({ x: rnd() * W, y: rnd(), r: 3 + rnd() * 6, a: rnd() * Math.PI, c: rnd() });
  }
  const C = {
    wall1: '#fbefdc', wall2: '#f2d9b8', floor: '#e8c99c', floorDark: '#d9b27e',
    rim: '#5aa7c9', rimDark: '#3f7f9d', rung: '#8cc7dc', stand: '#4d8fb0',
    fur: '#eba25a', furDark: '#d4843d', cream: '#fff3e2', pink: '#f4a7a3', ink: '#3b2412',
  };

  function draw() {
    const c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    // wall
    let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.wall1); g.addColorStop(1, C.wall2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // soft polka dots on the wall
    c.fillStyle = '#f0d3ad55';
    for (let y = 26; y < H * .7; y += 46) for (let x = ((y / 46) % 2) * 23 + 12; x < W; x += 46) { c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill(); }
    const floorY = H * .82;
    const R = Math.min(H * .33, W * .3), cx = W * .5, cy = Math.min(floorY - R - H * .07, H * .46);
    // floor and bedding
    c.fillStyle = C.floor; c.fillRect(0, floorY, W, H - floorY);
    for (const b of bedding) {
      c.save(); c.translate(b.x, floorY + 4 + b.y * (H - floorY - 6)); c.rotate(b.a);
      c.fillStyle = b.c < .5 ? '#f3dcb5' : C.floorDark; c.beginPath(); c.ellipse(0, 0, b.r, b.r * .45, 0, 0, 7); c.fill(); c.restore();
    }
    c.fillStyle = '#c99a6233'; c.fillRect(0, floorY, W, 3);
    // water bottle (left) and seed bowl (right)
    bottle(c, Math.max(W * .1, cx - R * 1.75), floorY, R);
    bowl(c, Math.min(W * .9, cx + R * 1.8), floorY, R);
    // shadow
    c.fillStyle = '#9b6a3a2a'; c.beginPath(); c.ellipse(cx, floorY + 4, R * .95, R * .12, 0, 0, 7); c.fill();
    // stand (back leg)
    c.strokeStyle = C.rimDark; c.lineWidth = Math.max(5, R * .06); c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + R * .08, cy - R * .04); c.lineTo(cx + R * .55, floorY + 2); c.stroke();
    // back rim (offset for depth)
    const off = { x: -R * .07, y: -R * .05 };
    c.lineWidth = Math.max(4, R * .045); c.strokeStyle = C.rimDark;
    c.beginPath(); c.arc(cx + off.x, cy + off.y, R, 0, 7); c.stroke();
    // spokes and hub sit on the back of the wheel, so the hamster runs in front of them
    c.strokeStyle = C.rimDark; c.lineWidth = Math.max(3, R * .03);
    for (let i = 0; i < 4; i++) {
      const a = G.wheel + i * Math.PI / 2;
      c.beginPath(); c.moveTo(cx + off.x, cy + off.y); c.lineTo(cx + off.x + Math.cos(a) * R * .97, cy + off.y + Math.sin(a) * R * .97); c.stroke();
    }
    c.fillStyle = C.stand; c.beginPath(); c.arc(cx + off.x, cy + off.y, R * .08, 0, 7); c.fill();
    c.fillStyle = '#ffffffaa'; c.beginPath(); c.arc(cx + off.x - R * .02, cy + off.y - R * .02, R * .03, 0, 7); c.fill();
    // rungs
    const n = 34;
    c.strokeStyle = C.rung; c.lineWidth = Math.max(2, R * .022);
    for (let i = 0; i < n; i++) {
      const a = G.wheel + i * Math.PI * 2 / n, x = Math.cos(a) * R, y = Math.sin(a) * R;
      c.beginPath(); c.moveTo(cx + x + off.x, cy + y + off.y); c.lineTo(cx + x, cy + y); c.stroke();
    }
    hamster(c, cx, cy, R);
    // front rim, spokes, hub
    c.strokeStyle = C.rim; c.lineWidth = Math.max(5, R * .055);
    c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
    c.strokeStyle = '#ffffff70'; c.lineWidth = Math.max(1.5, R * .014);
    c.beginPath(); c.arc(cx, cy, R - R * .02, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
    // front leg of the stand
    c.strokeStyle = C.stand; c.lineWidth = Math.max(5, R * .065);
    c.beginPath(); c.moveTo(cx + off.x, cy + off.y); c.lineTo(cx - R * .55, floorY + 2); c.stroke();
    c.beginPath(); c.moveTo(cx - R * .75, floorY + 2); c.lineTo(cx - R * .35, floorY + 2); c.stroke();
    c.strokeStyle = C.rimDark; c.beginPath(); c.moveTo(cx + R * .35, floorY + 2); c.lineTo(cx + R * .75, floorY + 2); c.stroke();
    // speed lines
    const sp = Math.min(G.v / 10, 1);
    if (sp > .35 && !reduced) {
      c.strokeStyle = G.turbo > 0 ? '#ff9a3c' : '#c28a5a'; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const yy = cy + R * (.2 + i * .1), len = R * (.25 + .35 * sp), x0 = cx - R * 1.08 - ((G.idle * 600 + i * 97) % (R * .6));
        c.globalAlpha = (sp - .35) * 1.2 * (1 - i / 7); c.lineWidth = 2;
        c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 - len, yy); c.stroke();
      }
      c.globalAlpha = 1;
    }
  }

  function bottle(c, x, floorY, R) {
    const h = R * 1.15, w = R * .3, top = floorY - h - R * .55;
    c.fillStyle = '#c9e6f2bb'; roundRect(c, x - w / 2, top, w, h, w * .35); c.fill();
    c.fillStyle = '#7cc3e0aa'; roundRect(c, x - w / 2 + 3, top + h * .35, w - 6, h * .65 - 3, w * .3); c.fill();
    c.fillStyle = '#e2762f'; roundRect(c, x - w * .32, top + h - 2, w * .64, R * .1, 4); c.fill();
    c.strokeStyle = '#9aa7ad'; c.lineWidth = Math.max(3, R * .03); c.beginPath(); c.moveTo(x, top + h + R * .08); c.lineTo(x + R * .1, top + h + R * .3); c.stroke();
    c.strokeStyle = '#b48a5d'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - w * .6, top + h * .3); c.lineTo(x + w * .6, top + h * .3); c.stroke();
  }
  function bowl(c, x, floorY, R) {
    const w = R * .55, h = R * .2;
    c.fillStyle = '#7a4a2a'; for (let i = 0; i < 7; i++) { c.save(); c.translate(x - w * .3 + i * w * .1, floorY - h - R * .02 - (i % 2) * 4); c.rotate(i * .7); c.beginPath(); c.ellipse(0, 0, R * .05, R * .025, 0, 0, 7); c.fill(); c.restore(); }
    c.fillStyle = '#e46f4f'; c.beginPath(); c.moveTo(x - w / 2, floorY - h); c.lineTo(x + w / 2, floorY - h); c.lineTo(x + w * .38, floorY); c.lineTo(x - w * .38, floorY); c.closePath(); c.fill();
    c.fillStyle = '#f39478'; c.fillRect(x - w / 2, floorY - h, w, h * .25);
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function hamster(c, cx, cy, R) {
    const s = R * .48;
    const a = Math.PI / 2 - G.climb;                       // position on the inside of the wheel
    const fx = cx + Math.cos(a) * (R - R * .03), fy = cy + Math.sin(a) * (R - R * .03);
    const tilt = a - Math.PI / 2;
    const run = G.phase, bob = Math.abs(Math.sin(run)) * s * .06 + (G.mode === 'run' ? 0 : Math.sin(G.idle * 3) * s * .015);
    c.save(); c.translate(fx, fy); c.rotate(tilt + (G.fall > 0 ? -G.fall * .6 : 0));
    // turbo glow
    if (G.turbo > 0) { c.fillStyle = '#ffb34d33'; c.beginPath(); c.ellipse(s * .05, -s * .45, s * .95, s * .7, 0, 0, 7); c.fill(); }
    // back paws
    const pf = Math.sin(run), pb = Math.sin(run + Math.PI);
    paw(c, -s * .32 + pb * s * .16, -Math.max(0, -pb) * s * .08, s);
    paw(c, s * .3 + pf * s * .16, -Math.max(0, -pf) * s * .08, s);
    c.translate(0, -bob);
    // tail
    c.fillStyle = C.pink; c.beginPath(); c.ellipse(-s * .62, -s * .32, s * .07, s * .045, -.4, 0, 7); c.fill();
    // body
    c.fillStyle = C.fur; c.beginPath(); c.ellipse(-s * .04, -s * .4, s * .6, s * .4, 0, 0, 7); c.fill();
    c.fillStyle = C.furDark; c.beginPath(); c.ellipse(-s * .16, -s * .62, s * .34, s * .14, -.15, 0, 7); c.fill();
    c.fillStyle = C.cream; c.beginPath(); c.ellipse(s * .1, -s * .24, s * .4, s * .2, 0, 0, 7); c.fill();
    // head
    c.fillStyle = C.fur; c.beginPath(); c.arc(s * .42, -s * .55, s * .33, 0, 7); c.fill();
    c.fillStyle = C.cream; c.beginPath(); c.arc(s * .6, -s * .44, s * .19, 0, 7); c.fill();
    // ear
    c.fillStyle = C.furDark; c.beginPath(); c.arc(s * .3, -s * .86, s * .11, 0, 7); c.fill();
    c.fillStyle = C.pink; c.beginPath(); c.arc(s * .3, -s * .86, s * .06, 0, 7); c.fill();
    // cheek
    c.fillStyle = '#f3888466'; c.beginPath(); c.ellipse(s * .48, -s * .42, s * .09, s * .055, 0, 0, 7); c.fill();
    // eye
    const ex = s * .52, ey = -s * .64;
    if (G.fall > .2) {
      c.strokeStyle = C.ink; c.lineWidth = Math.max(1.5, s * .035); c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex - s * .05, ey - s * .05); c.lineTo(ex + s * .05, ey + s * .05); c.moveTo(ex + s * .05, ey - s * .05); c.lineTo(ex - s * .05, ey + s * .05); c.stroke();
    } else if (G.tired) {
      c.strokeStyle = C.ink; c.lineWidth = Math.max(1.5, s * .035); c.lineCap = 'round';
      c.beginPath(); c.arc(ex, ey + s * .02, s * .05, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    } else {
      const blink = (G.idle % 3.4) > 3.28;
      c.fillStyle = C.ink; c.beginPath(); c.ellipse(ex, ey, s * .055, blink ? s * .01 : s * .065, 0, 0, 7); c.fill();
      if (!blink) { c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + s * .02, ey - s * .025, s * .022, 0, 7); c.fill(); }
    }
    // nose + mouth
    c.fillStyle = '#e46f7a'; c.beginPath(); c.ellipse(s * .77, -s * .5, s * .045, s * .035, 0, 0, 7); c.fill();
    if (G.tired || G.v > 7) { c.fillStyle = '#e46f7a'; c.beginPath(); c.ellipse(s * .7, -s * .37, s * .035, s * .05, 0, 0, 7); c.fill(); }
    // whiskers
    c.strokeStyle = '#8a5a3299'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(s * .72, -s * .47); c.lineTo(s * .95, -s * .52); c.moveTo(s * .72, -s * .44); c.lineTo(s * .95, -s * .42); c.stroke();
    // front paws (arms)
    paw(c, s * .45 + pb * s * .1, -s * .14 - Math.max(0, pb) * s * .05, s * .8);
    // sweat when tired
    if (G.tired || G.stamina < .2) {
      c.fillStyle = '#6ab7e6';
      for (let i = 0; i < 2; i++) {
        const k = (G.idle * 1.6 + i * .5) % 1;
        c.globalAlpha = 1 - k; c.beginPath(); c.ellipse(s * (.15 - i * .15), -s * (.95 + k * .25), s * .04, s * .06, 0, 0, 7); c.fill();
      }
      c.globalAlpha = 1;
    }
    // dizzy stars
    if (G.fall > .1) {
      c.fillStyle = '#f5b631';
      for (let i = 0; i < 3; i++) { const a2 = G.idle * 6 + i * 2.1; star(c, s * .42 + Math.cos(a2) * s * .32, -s * 1.02 + Math.sin(a2) * s * .08, s * .07); }
    }
    c.restore();
    // a seed flying into the hamster's mouth
    if (G.seed) {
      const k = G.seed.t, sx = cx + R * .9 * (1 - k), sy = cy - R * .9 + (R * .7) * k - Math.sin(k * Math.PI) * R * .4;
      c.save(); c.translate(sx, sy); c.rotate(k * 9);
      c.fillStyle = '#3d2b22'; c.beginPath(); c.ellipse(0, 0, s * .12, s * .06, 0, 0, 7); c.fill();
      c.strokeStyle = '#efe2cf'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-s * .1, 0); c.lineTo(s * .1, 0); c.stroke();
      c.restore();
    }
  }
  function paw(c, x, y, s) { c.fillStyle = '#f2b2a4'; c.beginPath(); c.ellipse(x, y - s * .03, s * .09, s * .05, 0, 0, 7); c.fill(); }
  function star(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }

  // ---------------- loop ----------------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    update(dt); hud(); draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    lastT = performance.now();
    if (document.hidden && G.mode === 'run') G.lastStep = performance.now() / 1000;
  });

  // test hook (read-only state for automated checks)
  window.__hamster = { get state() { return { mode: G.mode, t: G.t, v: G.v, dist: G.dist, stamina: G.stamina, tired: G.tired, combo: G.combo, stumbles: G.stumbles, turbo: G.turbo }; } };

  resize(); labels(); showReady(); renderSide(); hud();
  requestAnimationFrame(frame);
})();
