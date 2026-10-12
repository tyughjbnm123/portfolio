/* Opening sequence only. No home, portal, detail or companion dependency. */
(() => {
  'use strict';
  const KEY = 'yk-opening-played';
  const script = document.currentScript;
  const scriptURL = script?.src || new URL('assets/opening.js', document.baseURI).href;
  const audioEnabled = script?.dataset.audio === 'on'; // Off until real audio is supplied.
  const audioPaths = ['audio/opening-ambient.mp3', 'audio/enter-sfx.mp3'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (location.hash || !window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;
  // When storage is inaccessible, fail open instead of forcing repeat introductions.
  try { if (sessionStorage.getItem(KEY)) return; } catch { return; }

  let overlay, finished = false, entered = false, timer, watchdog;
  const sounds = [];
  function stopAudio() {
    sounds.forEach(audio => {try {audio.pause(); audio.removeAttribute('src'); audio.load();} catch {}});
    sounds.length = 0;
  }
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer); clearTimeout(watchdog);
    window.removeEventListener('error', onError);
    window.removeEventListener('hashchange', finish);
    window.removeEventListener('pagehide', finish);
    reduced.removeEventListener('change', onMotion);
    stopAudio();
    if (overlay?.open) overlay.close();
    overlay?.remove();
  }
  function onError(event) {
    // Only errors from this layer end the introduction; unrelated app errors are untouched.
    if (event.filename && event.filename.split('?')[0] === scriptURL.split('?')[0]) finish();
  }
  function schedule(callback, delay) {
    clearTimeout(timer);
    timer = setTimeout(() => {if (!finished) {try {callback();} catch {finish();}}}, delay);
  }
  function ready() {
    setPhase('ready', 'READY.', 1);
    schedule(leave, reduced.matches ? 180 : 650);
  }
  function leave() {
    if (reduced.matches) {finish(); return;}
    overlay.dataset.phase = 'leaving';
    schedule(finish, 450); // Independent of animationend.
  }
  function onMotion() {if (entered && reduced.matches) ready();}
  function setPhase(phase, label, fraction) {
    overlay.dataset.phase = phase;
    overlay.querySelector('.yk-opening-layer__status').textContent = label;
    overlay.querySelector('.yk-opening-layer__bar').style.transform = `scaleX(${fraction})`;
  }
  function startAudio() {
    if (!audioEnabled) return;
    audioPaths.forEach((relative, i) => {
      try {
        const audio = new Audio();
        audio.preload = 'none'; audio.loop = i === 0; audio.volume = i === 0 ? .15 : .3;
        audio.addEventListener('error', () => {try {audio.pause();} catch {}}, {once: true});
        audio.src = new URL(relative, scriptURL).href;
        sounds.push(audio);
        const playing = audio.play(); // Only called in the user's ENTER click.
        playing?.catch(() => {}); // Missing file, autoplay denial or decode error is non-blocking.
      } catch { /* No Audio support also leaves the sequence unaffected. */ }
    });
  }
  function enter() {
    if (entered || finished) return;
    entered = true;
    try {
      clearTimeout(watchdog);
      watchdog = setTimeout(finish, 8000);
      overlay.querySelector('.yk-opening-layer__enter').hidden = true;
      overlay.querySelector('.yk-opening-layer__sequence').hidden = false;
      overlay.focus({preventScroll: true});
      startAudio();
      if (reduced.matches) {ready(); return;}
      const steps = [['initializing', 'INITIALIZING...', .12, 600], ['insight', 'INSIGHT', .32, 450], ['ideas', 'IDEAS', .54, 450], ['flow', 'FLOW', .76, 450], ['system', 'SYSTEM', 1, 450]];
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
    overlay = document.createElement('dialog');
    overlay.className = 'yk-opening-layer';
    overlay.dataset.phase = 'initial';
    overlay.dataset.i18nIgnore = '';
    overlay.lang = 'en';
    overlay.setAttribute('aria-label', 'Enter YI-CHI KUO personal universe');
    overlay.innerHTML = `
      <div class="yk-opening-layer__center">
        <h2 class="yk-opening-layer__name">YI-CHI KUO</h2>
        <p class="yk-opening-layer__universe">PERSONAL UNIVERSE</p>
        <div class="yk-opening-layer__stage">
          <button type="button" class="yk-opening-layer__enter" autofocus>ENTER UNIVERSE</button>
          <div class="yk-opening-layer__sequence" hidden>
            <p class="yk-opening-layer__status" role="status" aria-live="polite" aria-atomic="true"></p>
            <div class="yk-opening-layer__track" aria-hidden="true"><div class="yk-opening-layer__bar"></div></div>
            <p class="yk-opening-layer__caption">OPENING SEQUENCE</p>
          </div>
        </div>
      </div>`;
    document.body.append(overlay);
    if (getComputedStyle(overlay).getPropertyValue('--opening-ready').trim() !== '1') {finish(); return;}
    overlay.querySelector('.yk-opening-layer__enter').addEventListener('click', enter);
    overlay.addEventListener('close', finish); // Native Escape remains available independently of the sequence.
    overlay.addEventListener('wheel', event => event.preventDefault(), {passive: false});
    overlay.addEventListener('keydown', event => {
      if (['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.preventDefault();
    });
    window.addEventListener('error', onError);
    window.addEventListener('hashchange', finish);
    window.addEventListener('pagehide', finish);
    reduced.addEventListener('change', onMotion);
    watchdog = setTimeout(finish, 60000); // Last-resort fail-open, including an abandoned initial screen.
    overlay.showModal();
    sessionStorage.setItem(KEY, '1');
  } catch {finish();}
})();
