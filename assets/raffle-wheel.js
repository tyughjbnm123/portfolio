/* Wheel presentation only. raffle.html owns selection and commits each winner once. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, W = 480, H = 440, CX = 240, CY = 209, R = 166;
  const mod = value => ((value % TAU) + TAU) % TAU;
  const palette = ['#bcd796', '#e8d6ae', '#608a76', '#d69769', '#8faa7a', '#eedfc6'];

  function landingRotation(from, index, count, turns = 5) {
    if (!Number.isInteger(count) || count < 1 || !Number.isInteger(index) || index < 0 || index >= count) {
      throw new RangeError('The selected entry must belong to the wheel.');
    }
    return from + turns * TAU + mod(-(index + .5) * TAU / count - mod(from));
  }

  // Large lists use proportional ranges. Every participant still occupies the same angle.
  function segments(entries, limit = 36) {
    const n = entries.length, size = Math.ceil(n / limit) || 1, result = [];
    for (let start = 0; start < n; start += size) {
      const end = Math.min(n, start + size);
      result.push({start, end, label: size === 1 ? entries[start] : `${start + 1}–${end}`});
    }
    return result;
  }

  class Wheel {
    constructor(canvas, onPhase = () => {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.onPhase = onPhase;
      this.rotation = 0;
      this.entries = [];
      this.pool = [];
      this.phase = 'idle';
      this.active = true;
      this.frame = 0;
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.resize = () => {
        if (!this.active || !this.ctx) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(240, canvas.clientWidth || 400);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(width * dpr * H / W);
        const style = getComputedStyle(canvas);
        this.ink = style.getPropertyValue('--yk-ink').trim() || '#eaf1df';
        this.muted = style.getPropertyValue('--yk-muted').trim() || '#aeb9a8';
        this.render();
      };
      this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(this.resize) : null;
      this.observer?.observe(canvas);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.resolve) this.schedule();
      });
      this.motion.addEventListener('change', () => {
        if (this.motion.matches && this.resolve) this.finish();
      });
      this.themeObserver = typeof MutationObserver === 'function' ? new MutationObserver(this.resize) : null;
      this.themeObserver?.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
      this.resize();
    }
    setActive(active) {
      this.active = active;
      if (active) this.resize();
      else { cancelAnimationFrame(this.frame); this.frame = 0; }
    }
    setEntries(entries) {
      this.pool = entries.slice();
      // Keep the winning sector under the pointer until the next spin or a reset.
      if (this.phase === 'idle') { this.entries = this.pool.slice(); this.render(); }
    }
    reset() {
      if (this.resolve) this.finish();
      this.entries = this.pool.slice();
      this.rotation = 0;
      this.index = -1;
      this.phase = 'idle';
      this.onPhase('idle');
      this.render();
    }
    draw({entries, selectedIndex, duration = 4300}) {
      if (this.resolve) this.finish();
      this.entries = entries.slice();
      this.index = selectedIndex;
      this.from = mod(this.rotation);
      this.target = landingRotation(this.from, selectedIndex, entries.length);
      this.start = performance.now();
      this.duration = Math.max(300, duration);
      this.phase = 'spinning';
      this.onPhase('spinning');
      return new Promise(resolve => {
        this.resolve = resolve;
        if (!this.ctx || this.motion.matches) { this.finish(); return; }
        // Finalization also works in background tabs where RAF is suspended.
        this.timer = setTimeout(() => this.finish(), this.duration);
        this.schedule();
      });
    }
    reveal(options) {
      this.entries = options.entries.slice();
      this.index = options.selectedIndex;
      this.target = landingRotation(mod(this.rotation), this.index, this.entries.length, 0);
      this.finish();
    }
    finish() {
      clearTimeout(this.timer);
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.rotation = mod(this.target || 0);
      this.phase = 'revealed';
      this.onPhase('revealed');
      this.render();
      const resolve = this.resolve;
      this.resolve = null;
      resolve?.();
    }
    schedule() {
      if (!this.active || !this.resolve || this.frame || document.hidden) return;
      this.frame = requestAnimationFrame(now => {
        this.frame = 0;
        const p = Math.min(1, (now - this.start) / this.duration);
        this.rotation = this.from + (this.target - this.from) * (1 - Math.pow(1 - p, 4));
        if (p > .63 && this.phase === 'spinning') {
          this.phase = 'slowing'; this.onPhase('slowing');
        }
        this.render();
        if (p >= 1) this.finish(); else this.schedule();
      });
    }
    render() {
      if (!this.active || !this.ctx) return;
      const c = this.ctx, entries = this.entries, n = entries.length;
      c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
      c.clearRect(0, 0, W, H);
      const aura = c.createRadialGradient(CX, CY, R * .6, CX, CY, R + 48);
      aura.addColorStop(0, 'rgba(222,164,93,.14)');
      aura.addColorStop(1, 'rgba(222,164,93,0)');
      c.fillStyle = aura; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(108,139,99,.15)';
      c.strokeStyle = 'rgba(163,188,142,.4)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(CX - 24, CY + 135); c.lineTo(CX - 47, 397);
      c.lineTo(CX + 47, 397); c.lineTo(CX + 24, CY + 135); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.roundRect(CX - 95, 391, 190, 24, 12); c.fill(); c.stroke();
      c.fillStyle = '#203329'; c.beginPath(); c.arc(CX, CY, R + 15, 0, TAU); c.fill();
      c.strokeStyle = '#abbe91'; c.lineWidth = 1.2; c.stroke();
      for (let i = 0; i < 36; i++) {
        const a = i * TAU / 36;
        const moving = this.phase === 'spinning' || this.phase === 'slowing';
        c.fillStyle = moving && (i + Math.floor(this.rotation * 4)) % 3 === 0 ? '#ffdda3' : '#899f75';
        c.beginPath(); c.arc(CX + Math.cos(a) * (R + 8), CY + Math.sin(a) * (R + 8), 2.1, 0, TAU); c.fill();
      }
      const slices = n ? segments(entries) : segments(['✦', '✧', '✦', '✧', '✦', '✧']);
      const total = n || 6;
      c.save(); c.translate(CX, CY); c.rotate(this.rotation - Math.PI / 2);
      slices.forEach((slice, i) => {
        const a = slice.start * TAU / total, b = slice.end * TAU / total;
        const winner = this.phase === 'revealed' && this.index >= slice.start && this.index < slice.end;
        c.fillStyle = palette[i % palette.length];
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, a, b); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(31,52,39,.32)'; c.lineWidth = 1; c.stroke();
        if (winner) { c.strokeStyle = '#fff1c9'; c.lineWidth = 4; c.stroke(); }
        c.save(); c.rotate((a + b) / 2);
        c.fillStyle = i % palette.length === 2 ? '#fcf9eb' : '#203329';
        const font = slices.length > 20 ? 10 : slices.length > 12 ? 12 : 15;
        c.font = `600 ${font}px system-ui, sans-serif`;
        c.textAlign = 'right'; c.textBaseline = 'middle';
        const letters = Array.from(String(slice.label)), max = slices.length > 12 ? 7 : 9;
        const label = letters.length > max ? letters.slice(0, max - 1).join('') + '…' : letters.join('');
        c.fillText(label, R - 16, 0, 106);
        c.restore();
      });
      c.restore();
      c.fillStyle = '#203329'; c.strokeStyle = '#dcbb82'; c.lineWidth = 2;
      c.beginPath(); c.arc(CX, CY, 35, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#ead0a0'; c.font = '28px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('✦', CX, CY + 1);
      // The pointer stays fixed. The selected entry's center ends directly beneath it.
      c.fillStyle = '#edc486'; c.strokeStyle = '#654b2e'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(CX - 12, 18); c.lineTo(CX + 12, 18);
      c.lineTo(CX + 9, 39); c.lineTo(CX, 57); c.lineTo(CX - 9, 39); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = this.muted; c.font = '10px ui-monospace, monospace';
      c.fillText('F O R T U N E   W H E E L', CX, 432);
    }
  }
  const api = {Wheel, landingRotation, segments};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RaffleWheel = api;
})(typeof window === 'undefined' ? {} : window);
