/* Fortune-stick animation only. raffle.html selects and records the winner. */
(function (root) {
  'use strict';
  const W = 480, H = 440, TAU = Math.PI * 2;
  class Fortune {
    constructor(canvas, onPhase = () => {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.onPhase = onPhase;
      this.phase = 'idle'; this.progress = 0; this.ordinal = 0;
      this.count = 0; this.active = true; this.frame = 0;
      this.look = {wheel:['#bb3650','#ffda86','#74253b'],rim:'#782035',metal:'#e1b966',
        lamp:'#ffe7b1',line:'#d9af6f',glow:'#e2ac3d28',clear:'#e2ac3d00',symbol:'✦'};
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.resize = () => {
        if (!this.active || !this.ctx) return;
        const width = Math.max(240, canvas.clientWidth || 400);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(width * dpr * H / W);
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
      this.resize();
    }
    setActive(active) {
      this.active = active;
      if (active) { this.resize(); this.schedule(); }
      else { cancelAnimationFrame(this.frame); this.frame = 0; }
    }
    setStyle(appearance) { this.look = appearance; this.render(); }
    setCount(count) { this.count = count; this.render(); }
    setPhase(phase) {
      if (this.phase === phase) return;
      this.phase = phase; this.onPhase(phase);
    }
    reset() {
      if (this.resolve) this.finish();
      this.progress = 0; this.ordinal = 0;
      this.phase = 'idle'; this.onPhase('idle'); this.render();
    }
    draw({ordinal, duration = 3500}) {
      if (this.resolve) this.finish();
      this.ordinal = ordinal; this.progress = 0;
      this.start = performance.now(); this.duration = Math.max(300, duration);
      this.setPhase('shaking');
      return new Promise(resolve => {
        this.resolve = resolve;
        if (!this.ctx || this.motion.matches) { this.finish(); return; }
        // RAF may pause in a background tab; this still settles the same draw.
        this.timer = setTimeout(() => this.finish(), this.duration);
        this.schedule();
      });
    }
    reveal(ordinal) { this.ordinal = ordinal; this.finish(); }
    finish() {
      clearTimeout(this.timer); cancelAnimationFrame(this.frame); this.frame = 0;
      this.progress = 1; this.setPhase('revealed'); this.render();
      const resolve = this.resolve; this.resolve = null; resolve?.();
    }
    schedule() {
      if (!this.active || !this.resolve || this.frame || document.hidden) return;
      this.frame = requestAnimationFrame(now => {
        this.frame = 0;
        this.progress = Math.min(1, Math.max(0, (now - this.start) / this.duration));
        if (this.progress >= .58) this.setPhase('drawing');
        this.render();
        if (this.progress >= 1) this.finish(); else this.schedule();
      });
    }
    render() {
      if (!this.active || !this.ctx) return;
      const c = this.ctx, look = this.look, p = this.progress;
      const moving = this.phase === 'shaking';
      const lift = Math.min(1, Math.max(0, (p - .58) / .3));
      const rise = 1 - Math.pow(1 - lift, 3);
      c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
      c.clearRect(0, 0, W, H);
      const aura = c.createRadialGradient(240, 240, 60, 240, 240, 205);
      aura.addColorStop(0, look.glow); aura.addColorStop(1, look.clear);
      c.fillStyle = aura; c.fillRect(0, 0, W, H);
      // Fine orbit and stars frame the cylinder without competing with the result.
      c.strokeStyle = look.line; c.lineWidth = 1; c.globalAlpha = .4;
      c.beginPath(); c.arc(240, 232, 171, -.15, Math.PI + .15); c.stroke();
      c.beginPath(); c.arc(240, 232, 184, .25, 1.25); c.stroke();
      c.globalAlpha = 1;
      for (const [x,y,size] of [[96,149,7],[374,178,9],[115,328,5],[346,80,5]]) {
        c.fillStyle = look.metal; c.beginPath();
        c.moveTo(x,y-size); c.quadraticCurveTo(x,y,x+size,y);
        c.quadraticCurveTo(x,y,x,y+size); c.quadraticCurveTo(x,y,x-size,y);
        c.quadraticCurveTo(x,y,x,y-size); c.fill();
      }
      c.fillStyle = look.glow; c.beginPath(); c.ellipse(240,399,117,15,0,0,TAU); c.fill();
      c.save(); c.translate(240,350);
      if (moving) c.rotate(Math.sin(p * 90) * .105 * Math.sin(Math.min(1, p / .58) * Math.PI));
      c.translate(-240,-350);
      // Back lip, then a compact fan of bamboo sticks.
      c.fillStyle = look.rim; c.strokeStyle = look.metal; c.lineWidth = 2;
      c.beginPath(); c.ellipse(240,237,86,24,0,0,TAU); c.fill(); c.stroke();
      for (let i = 0; i < 13; i++) {
        const offset = i - 6;
        c.save(); c.translate(240 + offset * 8,251);
        c.rotate(offset * .042 + (moving ? Math.sin(p*112+i)*.028 : 0));
        const length = 144 + (i * 29 % 47);
        const jump = moving ? Math.abs(Math.sin(p*105+i))*8 : 0;
        this.stick(c, -7, -length-jump, 14, length+45, false);
        c.restore();
      }
      // This numbered stick represents the winner's order within this prize.
      if (p >= .58 && this.phase !== 'idle') {
        c.save(); c.translate(240, 108 - rise * 86);
        c.rotate((1-rise)*-.08);
        this.stick(c,-15,0,30,238,true);
        if (rise > .7) {
          c.fillStyle = '#593c22'; c.font = '700 19px ui-monospace, monospace';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(this.ordinal).padStart(2,'0'),0,67,25);
        }
        c.restore();
      }
      // Curved cylinder, inset medallion and decorative bands.
      const body = c.createLinearGradient(153,0,327,0);
      body.addColorStop(0,look.rim); body.addColorStop(.46,look.wheel[0]); body.addColorStop(1,look.rim);
      c.fillStyle = body; c.strokeStyle = look.metal; c.lineWidth = 2;
      c.beginPath(); c.moveTo(154,237); c.bezierCurveTo(182,261,298,261,326,237);
      c.lineTo(319,366); c.bezierCurveTo(294,396,186,396,161,366); c.closePath(); c.fill(); c.stroke();
      for (const y of [262,357]) {
        c.beginPath(); c.moveTo(160,y); c.bezierCurveTo(193,y+17,288,y+17,321,y); c.stroke();
      }
      c.globalAlpha=.2;
      for (const x of [178,196,284,302]) { c.beginPath(); c.moveTo(x,277); c.lineTo(x,346); c.stroke(); }
      c.globalAlpha=1;
      c.save(); c.translate(240,313); c.rotate(Math.PI/4);
      c.fillStyle=look.rim; c.beginPath(); c.roundRect(-29,-29,58,58,8); c.fill(); c.stroke(); c.restore();
      c.fillStyle=look.lamp; c.font='600 29px system-ui, sans-serif'; c.textAlign='center'; c.textBaseline='middle';
      c.fillText(look.symbol,240,313);
      c.restore();
      c.fillStyle=look.metal; c.font='10px ui-monospace, monospace'; c.textAlign='center';
      c.fillText('F O R T U N E   S T I C K S',240,424);
    }
    stick(c,x,y,width,height,selected) {
      const wood=c.createLinearGradient(x,0,x+width,0);
      wood.addColorStop(0,'#cf9c56'); wood.addColorStop(.4,'#ffebbb'); wood.addColorStop(1,'#e5bd7e');
      c.fillStyle=wood; c.strokeStyle='#93622f'; c.lineWidth=.8;
      c.beginPath(); c.roundRect(x,y,width,height,selected?7:4); c.fill(); c.stroke();
      c.fillStyle=this.look.wheel[0];
      c.beginPath(); c.roundRect(x+2,y+4,width-4,selected?31:21,3); c.fill();
      c.strokeStyle='#ad7b3b70';
      c.beginPath(); c.moveTo(x+width*.35,y+48); c.lineTo(x+width*.35,y+height-8); c.stroke();
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {Fortune};
  else root.RaffleFortune = {Fortune};
})(typeof window === 'undefined' ? {} : window);
