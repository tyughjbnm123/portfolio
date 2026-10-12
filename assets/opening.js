/* Self-contained opening. Only its own dialog and effects are created/removed. */
(() => {
  'use strict';
  const KEY = 'yk-opening-played';
  const script = document.currentScript;
  const scriptURL = script?.src || new URL('assets/opening.js', document.baseURI).href;
  const audioEnabled = script?.dataset.audio === 'on';
  const audioPaths = ['audio/opening-ambient.mp3', 'audio/enter-sfx.mp3'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // An explicit preview URL can replay without changing the normal session rule.
  const preview = new URLSearchParams(location.search).get('opening') === 'preview';
  if (location.hash || !window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;
  try { if (!preview && sessionStorage.getItem(KEY)) return; } catch { return; }

  let overlay, finished = false, entered = false, timer, watchdog;
  let frame = 0, lastFrame = 0, canvas, ctx, width = 0, height = 0, particles = [], speed = .09;
  const sounds = [];
  function stopAudio() {
    sounds.forEach(audio => {try {audio.pause(); audio.removeAttribute('src'); audio.load();} catch {}});
    sounds.length = 0;
  }
  function stopParticles() {cancelAnimationFrame(frame); frame = 0; lastFrame = 0;}
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer); clearTimeout(watchdog); stopParticles();
    window.removeEventListener('error', onError);
    window.removeEventListener('hashchange', finish);
    window.removeEventListener('pagehide', finish);
    window.removeEventListener('resize', resizeParticles);
    document.removeEventListener('visibilitychange', onVisibility);
    reduced.removeEventListener('change', onMotion);
    stopAudio();
    if (overlay?.open) overlay.close();
    overlay?.remove();
  }
  function onError(event) {
    if (event.filename && event.filename.split('?')[0] === scriptURL.split('?')[0]) finish();
  }
  function schedule(callback, delay) {
    clearTimeout(timer);
    timer = setTimeout(() => {if (!finished) {try {callback();} catch {finish();}}}, delay);
  }
  function setPhase(phase, label, fraction) {
    overlay.dataset.phase = phase;
    const word = document.createElement('span'); word.textContent = label;
    overlay.querySelector('.yk-opening-layer__status').replaceChildren(word);
    overlay.querySelector('.yk-opening-layer__bar').style.transform = `scaleX(${fraction})`;
    overlay.querySelector('.yk-opening-layer__percent').textContent = `${Math.round(fraction * 100)}%`;
    speed = phase === 'ready' ? .8 : .25 + fraction * .7;
  }
  function ready() {setPhase('ready', 'READY.', 1); schedule(leave, reduced.matches ? 180 : 760);}
  function leave() {
    if (reduced.matches) {finish(); return;}
    overlay.dataset.phase = 'leaving'; speed = 1.1;
    schedule(finish, 760);
  }
  function onMotion() {
    if (reduced.matches) {stopParticles(); if (entered) ready();}
    else startParticles();
  }
  function resizeParticles() {
    if (!ctx || finished) return;
    try {
      width = overlay.clientWidth; height = overlay.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 650 ? 56 : 110;
      particles = Array.from({length: count}, () => ({angle: Math.random() * Math.PI * 2, radius: .04 + Math.random(), size: .5 + Math.random() * 1.1}));
      drawParticles(0);
    } catch {ctx = null; stopParticles();}
  }
  function drawParticles(dt) {
    ctx.clearRect(0, 0, width, height);
    const centerX = width / 2, centerY = height * .48, reach = Math.hypot(width, height) * .6;
    const color = getComputedStyle(canvas).color;
    ctx.fillStyle = color; ctx.strokeStyle = color;
    for (const p of particles) {
      const old = p.radius;
      p.radius += dt * speed * (.1 + p.radius * .75);
      if (p.radius > 1.08) {p.radius = .025; p.angle = Math.random() * Math.PI * 2;}
      const x = centerX + Math.cos(p.angle) * p.radius * reach;
      const y = centerY + Math.sin(p.angle) * p.radius * reach;
      ctx.globalAlpha = Math.min(.72, p.radius * 1.25) * (entered ? .85 : .5);
      if (entered && p.radius >= old && !reduced.matches) {
        const trail = Math.max(.02, p.radius - .028 * speed * (p.radius + .1));
        ctx.lineWidth = p.size * .8; ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(p.angle) * trail * reach, centerY + Math.sin(p.angle) * trail * reach);
        ctx.lineTo(x, y); ctx.stroke();
      } else {ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();}
    }
    ctx.globalAlpha = 1;
  }
  function paint(now) {
    frame = 0;
    if (finished || reduced.matches || document.hidden || !ctx) return;
    try {
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
      lastFrame = now; drawParticles(dt); frame = requestAnimationFrame(paint);
    } catch {ctx = null; stopParticles();}
  }
  function startParticles() {
    if (!finished && ctx && !frame && !reduced.matches && !document.hidden) frame = requestAnimationFrame(paint);
  }
  function onVisibility() {if (document.hidden) stopParticles(); else startParticles();}
  function startAudio() {
    if (!audioEnabled) return;
    audioPaths.forEach((relative, i) => {
      try {
        const audio = new Audio();
        audio.preload = 'none'; audio.loop = i === 0; audio.volume = i === 0 ? .15 : .3;
        audio.addEventListener('error', () => {try {audio.pause();} catch {}}, {once: true});
        audio.src = new URL(relative, scriptURL).href; sounds.push(audio);
        audio.play()?.catch(() => {});
      } catch {}
    });
  }
  function enter() {
    if (entered || finished) return;
    entered = true;
    try {
      clearTimeout(watchdog); watchdog = setTimeout(finish, 8000);
      overlay.querySelector('.yk-opening-layer__enter').hidden = true;
      overlay.querySelector('.yk-opening-layer__sequence').hidden = false;
      overlay.focus({preventScroll: true}); startAudio();
      if (reduced.matches) {ready(); return;}
      const steps = [['initializing', 'INITIALIZING...', .12, 680], ['insight', 'INSIGHT', .32, 480], ['ideas', 'IDEAS', .54, 480], ['flow', 'FLOW', .76, 480], ['system', 'SYSTEM', 1, 480]];
      let index = 0;
      const advance = () => {
        if (index === steps.length) {ready(); return;}
        const [phase, label, progress, duration] = steps[index++];
        setPhase(phase, label, progress); schedule(advance, duration);
      };
      advance();
    } catch {finish();}
  }
  try {
    overlay = document.createElement('dialog'); overlay.className = 'yk-opening-layer';
    overlay.dataset.phase = 'initial'; overlay.dataset.i18nIgnore = ''; overlay.lang = 'en';
    overlay.setAttribute('aria-label', 'Enter YI-CHI KUO personal universe');
    overlay.innerHTML = `
      <div class="yk-opening-layer__atmosphere" aria-hidden="true"></div>
      <canvas class="yk-opening-layer__particles" aria-hidden="true"></canvas>
      <div class="yk-opening-layer__portal" aria-hidden="true">
        <div class="yk-opening-layer__rings"><i></i><i></i><i></i></div>
        <div class="yk-opening-layer__orbit"><i></i><i></i></div>
      </div>
      <div class="yk-opening-layer__scan" aria-hidden="true"></div>
      <div class="yk-opening-layer__burst" aria-hidden="true"></div>
      <div class="yk-opening-layer__frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="yk-opening-layer__center">
        <p class="yk-opening-layer__eyebrow"><i aria-hidden="true"></i> PERSONAL UNIVERSE</p>
        <h2 class="yk-opening-layer__name">YI-CHI KUO</h2>
        <div class="yk-opening-layer__stage">
          <button type="button" class="yk-opening-layer__enter" autofocus>ENTER UNIVERSE <span aria-hidden="true">↗</span></button>
          <div class="yk-opening-layer__sequence" hidden>
            <p class="yk-opening-layer__status" role="status" aria-live="polite" aria-atomic="true"></p>
            <div class="yk-opening-layer__track" aria-hidden="true"><div class="yk-opening-layer__bar"></div></div>
            <div class="yk-opening-layer__meta" aria-hidden="true"><span>OPENING SEQUENCE</span><span class="yk-opening-layer__percent">0%</span></div>
          </div>
        </div>
      </div>`;
    document.body.append(overlay);
    if (getComputedStyle(overlay).getPropertyValue('--opening-ready').trim() !== '1') {finish(); return;}
    overlay.querySelector('.yk-opening-layer__enter').addEventListener('click', enter);
    overlay.addEventListener('close', finish);
    overlay.addEventListener('wheel', event => event.preventDefault(), {passive: false});
    overlay.addEventListener('keydown', event => {
      if (['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.preventDefault();
    });
    window.addEventListener('error', onError); window.addEventListener('hashchange', finish); window.addEventListener('pagehide', finish);
    reduced.addEventListener('change', onMotion);
    watchdog = setTimeout(finish, 60000);
    overlay.showModal();
    if (!preview) sessionStorage.setItem(KEY, '1');
    canvas = overlay.querySelector('canvas');
    try {ctx = canvas.getContext('2d');} catch {ctx = null;}
    resizeParticles(); startParticles();
    window.addEventListener('resize', resizeParticles);
    document.addEventListener('visibilitychange', onVisibility);
  } catch {finish();}
})();
