(() => {
  'use strict';
  if (document.getElementById('yk-companion-widget')) return;
  const base = new URL('.', document.currentScript.src);
  const key = 'yk-companion-preferences-v23';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || localStorage.getItem('yk-companion-preferences-v1') || '{}') || {}; } catch {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { open: false, ready: false, menu: false, mode: 'idle', busy: false, closing: false };
  let position = saved.position && Number.isFinite(saved.position.x) && Number.isFinite(saved.position.y) ? saved.position : null;
  let transition = 0, drag = null, suppressClick = false, idleTimer = null, lastActivity = Date.now(), yawnUsed = false;
  const labels = { idle: '安靜待機', welcome: '打個招呼', drag: '跟著你移動', dance: '跳一支舞', yawn: '伸個懶腰', bye: '下次見' };
  const speaker = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="sound-on" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="sound-off" d="m16 9 6 6m0-6-6 6"/></svg>';
  const host = document.createElement('div'); host.id = 'yk-companion-widget';
  const root = host.attachShadow({ mode: 'open' });
  const sheet = document.createElement('link'); sheet.rel = 'stylesheet'; sheet.href = new URL('companion-widget-v23.css', base).href;
  root.append(sheet);
  const ui = document.createElement('div');
  ui.innerHTML = `<button class="launcher" type="button" aria-expanded="false" aria-controls="pet-panel"><span aria-hidden="true">✧</span> 召喚小精靈</button>
    <section class="panel" id="pet-panel" aria-label="網頁小精靈" hidden>
      <button class="actor" type="button" aria-label="小精靈，拖曳移動或點擊開啟選單" aria-controls="pet-menu" aria-expanded="false" title="拖曳移動 · 點一下開啟選單" disabled><span class="sprite" aria-hidden="true"></span></button>
      <div class="load-status" hidden><p role="status" class="loading">角色準備中…</p><button class="retry" type="button" hidden>重新載入</button><button class="cancel" type="button">收起</button></div>
      <div class="menu" id="pet-menu" role="group" aria-label="小精靈選單" hidden>
        <button class="dance" type="button" aria-pressed="false">♪ 跳舞</button>
        <button class="voice icon-button" type="button" aria-label="關閉聲音" title="關閉聲音" aria-pressed="false">${speaker}</button>
        <button class="close icon-button" type="button" aria-label="收起小精靈" title="收起小精靈"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </div>
      <span class="sr-only status" role="status"></span>
    </section>`;
  root.append(ui); document.body.append(host);
  const $ = selector => root.querySelector(selector);
  const actor = $('.actor'), menu = $('.menu'), panel = $('.panel'), launcher = $('.launcher');
  const player = new window.CompanionPlayer($('.sprite'), muted => {
    $('.voice').setAttribute('aria-label', muted ? '開啟聲音' : '關閉聲音');
    $('.voice').title = muted ? '開啟聲音' : '關閉聲音';
    $('.voice').setAttribute('aria-pressed', String(muted));
    host.dataset.muted = String(muted);
    publish();
  });
  const clamp = (v, min, max) => Math.max(min, Math.min(v, Math.max(min, max)));
  const viewWidth = () => Math.min(innerWidth, document.documentElement.getBoundingClientRect().right);
  const scale = () => host.getBoundingClientRect().width / host.offsetWidth || 1;
  function publish() {
    document.dispatchEvent(new CustomEvent('companion:state', { detail: { ...state, muted: player.muted, label: labels[state.mode] } }));
  }
  function remember() {
    try { localStorage.setItem(key, JSON.stringify({ open: state.open, position })); } catch {}
  }
  function layoutMenu() {
    if (!state.menu) return;
    const r = host.getBoundingClientRect(), m = menu.getBoundingClientRect(), zoom = scale();
    let x = r.left + (r.width - m.width) / 2, y = r.top - m.height - 8;
    if (y < 8) { x = r.right + 8; y = r.top; }
    menu.style.left = (clamp(x, 8, viewWidth() - m.width - 8) - r.left) / zoom + 'px';
    menu.style.top = (clamp(y, 8, innerHeight - m.height - 8) - r.top) / zoom + 'px';
  }
  function place(x, y) {
    const r = host.getBoundingClientRect(), zoom = scale();
    host.style.left = clamp(x, 8, viewWidth() - r.width - 8) / zoom + 'px';
    host.style.top = clamp(y, 8, innerHeight - r.height - 8) / zoom + 'px';
    host.style.right = host.style.bottom = 'auto'; layoutMenu();
  }
  function savePosition() {
    const r = host.getBoundingClientRect();
    position = { x: clamp(r.left / Math.max(1, viewWidth() - r.width), 0, 1), y: clamp(r.top / Math.max(1, innerHeight - r.height), 0, 1) };
    remember();
  }
  function fit() {
    if (!state.open) return;
    const r = host.getBoundingClientRect();
    if (position && !drag) place(position.x * Math.max(0, viewWidth() - r.width), position.y * Math.max(0, innerHeight - r.height));
    else if (r.left < 8 || r.top < 8 || r.right > viewWidth() - 8 || r.bottom > innerHeight - 8) place(r.left, r.top);
    layoutMenu();
  }
  function render() {
    panel.hidden = !state.open; launcher.hidden = state.open;
    menu.hidden = !state.menu || !state.ready || state.closing;
    actor.disabled = !state.ready || state.closing;
    launcher.setAttribute('aria-expanded', String(state.open)); actor.setAttribute('aria-expanded', String(!menu.hidden));
    host.dataset.ready = String(state.ready); host.dataset.mode = state.mode; host.dataset.closing = String(state.closing);
    $('.dance').textContent = state.mode === 'dance' ? '■ 停止' : '♪ 跳舞';
    $('.dance').setAttribute('aria-pressed', String(state.mode === 'dance'));
    $('.status').textContent = state.busy ? '動作準備中…' : labels[state.mode];
    requestAnimationFrame(layoutMenu); publish();
  }
  function armIdle() {
    clearTimeout(idleTimer);
    if (!state.open || !state.ready || state.mode !== 'idle' || state.menu || state.closing || yawnUsed || reduced.matches || document.hidden) return;
    idleTimer = setTimeout(() => {
      if (!state.open || state.mode !== 'idle' || state.menu || document.hidden || yawnUsed) return;
      yawnUsed = true;
      run('yawn');
    }, Math.max(0, 45000 - (Date.now() - lastActivity)));
  }
  function activity() {
    lastActivity = Date.now(); yawnUsed = false;
    if (state.mode === 'yawn' && state.open) returnToIdle();
    armIdle();
  }
  function returnToIdle() {
    if (!state.open || state.closing) return;
    if (reduced.matches) { transition++; player.still(); state.mode = 'idle'; state.busy = false; render(); armIdle(); }
    else run('idle');
  }
  function run(name) {
    const token = ++transition;
    clearTimeout(idleTimer);
    state.mode = name; state.busy = true; state.closing = name === 'bye';
    render();
    player.play(name, { sound: name !== 'idle', onEnd: () => {
      if (token !== transition || !state.open) return;
      state.busy = false;
      if (name === 'bye') finishClose();
      else if (name === 'idle') { render(); armIdle(); }
      else if (name === 'drag' && drag?.moved) render();
      else returnToIdle();
    } }).then(started => {
      if (token !== transition || !state.open || !started) return;
      state.busy = false; render();
      if (name === 'idle') armIdle();
    }).catch(() => {
      if (token !== transition) return;
      if (name === 'bye') { finishClose(); return; }
      state.mode = 'idle'; state.busy = false; state.closing = false; render();
      $('.status').textContent = '這個動作暫時無法載入，請再試一次。'; armIdle();
    });
  }
  async function open(greeting = true) {
    if (greeting) player.unlock();
    activity();
    if (state.open) { state.menu = true; render(); return; }
    const token = ++transition;
    state.open = true; state.closing = false; state.mode = 'idle';
    $('.load-status').hidden = state.ready;
    $('.loading').textContent = '角色準備中…'; $('.retry').hidden = true;
    remember(); render(); requestAnimationFrame(fit);
    try {
      await player.load();
      if (token !== transition || !state.open) return;
      state.ready = true; $('.load-status').hidden = true;
      if (greeting) run('welcome'); else returnToIdle();
      if (greeting) actor.focus({ preventScroll: true });
      if (!player.warmed) { player.warmed = true; player.warm(); }
    } catch {
      if (token !== transition || !state.open) return;
      $('.loading').textContent = '角色暫時沒有載入。'; $('.retry').hidden = false;
    }
  }
  function finishClose() {
    transition++; clearTimeout(idleTimer); player.still();
    state.open = state.menu = state.closing = state.busy = false; state.mode = 'idle';
    host.style.left = host.style.top = host.style.right = host.style.bottom = '';
    remember(); render(); launcher.focus({ preventScroll: true });
  }
  function close() {
    activity();
    if (!state.ready || state.closing) { finishClose(); return; }
    player.unlock(); state.menu = false; run('bye');
  }
  launcher.addEventListener('click', () => open());
  $('.close').addEventListener('click', close);
  $('.cancel').addEventListener('click', finishClose);
  $('.retry').addEventListener('click', () => { state.open = false; open(); });
  $('.dance').addEventListener('click', () => { activity(); player.unlock(); if (state.mode === 'dance') returnToIdle(); else run('dance'); });
  $('.voice').addEventListener('click', () => { player.toggleMuted(); activity(); });
  actor.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
    activity(); state.menu = !state.menu; render(); armIdle();
  });
  actor.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !state.ready || state.closing) return;
    player.unlock();
    const r = host.getBoundingClientRect();
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: r.left, y: r.top, moved: false };
    suppressClick = false; actor.setPointerCapture(event.pointerId);
  });
  actor.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 8 && !drag.moved) {
      drag.moved = true; state.menu = false; host.dataset.dragging = 'true'; run('drag');
    }
    if (drag.moved) place(drag.x + dx, drag.y + dy);
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null;
    suppressClick = moved || event.type === 'pointercancel'; delete host.dataset.dragging;
    if (actor.hasPointerCapture(event.pointerId)) actor.releasePointerCapture(event.pointerId);
    if (moved) {
      savePosition(); activity();
      // Let this one reaction finish after release, including its voice.
      if (state.mode !== 'drag' || (!state.busy && !player.current)) returnToIdle();
    }
    setTimeout(() => { suppressClick = false; }, 0);
  }
  actor.addEventListener('pointerup', endDrag); actor.addEventListener('pointercancel', endDrag); actor.addEventListener('lostpointercapture', endDrag);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.open) {
      event.preventDefault(); event.stopPropagation();
      if (state.menu) { state.menu = false; render(); armIdle(); actor.focus({ preventScroll: true }); } else close();
      return;
    }
    if (event.target !== actor) return;
    const delta = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key];
    if (delta) { event.preventDefault(); event.stopPropagation(); state.menu = false; const r = host.getBoundingClientRect(); place(r.left + delta[0], r.top + delta[1]); savePosition(); render(); }
  });
  document.addEventListener('pointerdown', event => {
    activity();
    if (state.menu && !event.composedPath().includes(host)) { state.menu = false; render(); armIdle(); }
  }, { passive: true });
  document.addEventListener('keydown', activity, { passive: true });
  document.addEventListener('scroll', activity, { passive: true });
  document.addEventListener('companion:open', () => open());
  function suspend() {
    clearTimeout(idleTimer);
    if (!state.open) return;
    if (state.closing) { finishClose(); return; }
    transition++; player.still(); state.mode = 'idle'; state.busy = false; render();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else activity(); });
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', activity);
  reduced.addEventListener('change', () => { if (reduced.matches) suspend(); activity(); });
  window.addEventListener('resize', fit); new ResizeObserver(fit).observe(host); sheet.addEventListener('load', fit);
  render(); player.notify(); if (saved.open === true) open(false);
})();
