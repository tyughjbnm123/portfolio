// 3D player for the web page's floating companion. Same interface as CompanionPlayer (companion-player-v28.js),
// so the widget's menu, drag, notes and voice timing work unchanged; the character is the island's VRM model
// (fairy3d-widget.js) instead of the animated WebP clips, and her mouth follows the voice. If the 3D model
// can't load (no WebGL, no import maps, network), it quietly falls back to the drawn clips.
(() => {
  'use strict';
  if (!window.CompanionPlayer) return;
  const base = new URL('.', document.currentScript.src);
  const MOTION = { idle: 'idle', welcome: 'welcome', drag: 'drag', dance: 'dance', yawn: 'yawn', bye: 'bye', writing: 'idle' };
  const canModule = HTMLScriptElement.supports?.('importmap') && !!document.querySelector('script[type="importmap"]');

  class CompanionPlayer3D extends window.CompanionPlayer {
    load() {
      if (this.fallback) return super.load();
      if (this.ready) return Promise.resolve();
      if (this.loading) return this.loading;
      const job = (async () => {
        this.clips = await this.fetchFile('clips-v28.json', 'json');
        if (!canModule) throw Error('no import maps');
        const mod = await import(new URL('fairy3d-widget.js?v=20261124-1', base).href);
        this.stage = await mod.mountFairy(this.element);
        this.f3 = this.stage.fairy;
        for (const k of ['welcome', 'dance', 'yawn', 'bye', 'drag']) this.f3.preload(k);
        this.ready = true; this.notify();
      })();
      this.loading = job.catch(error => {
        console.warn('3D companion unavailable; the drawn one is used.', error);
        this.fallback = true; this.loading = null; this.ready = false;
        this.element.replaceChildren(this.image);
        return super.load();
      }).finally(() => { if (!this.fallback) this.loading = null; });
      return this.loading;
    }
    // voice only: the 3D model needs none of the WebP clips
    async prepareAudio(name) {
      const clip = this.clips?.[name];
      if (!clip?.audio || !this.context) return null;
      let entry = this.cache.get(name); if (!entry) { entry = {}; this.cache.set(name, entry); }
      if (!entry.audioPromise) entry.audioPromise = this.fetchFile(clip.audio, 'arrayBuffer').catch(() => { entry.audioPromise = null; return null; });
      const bytes = await entry.audioPromise; if (!bytes) return null;
      try { if (!entry.decodePromise) entry.decodePromise = this.context.decodeAudioData(bytes.slice(0)); return await entry.decodePromise; }
      catch { entry.decodePromise = null; return null; }
    }
    async prepare(name, sound) {
      if (this.fallback) return super.prepare(name, sound);
      await this.load(); if (this.fallback) return super.prepare(name, sound);
      return { blob: null, buffer: sound ? await this.prepareAudio(name) : null, clip: this.clips[name] };
    }
    stopSound() { super.stopSound(); this.f3?.listen(null); }
    startSound(buffer, epoch) {
      super.startSound(buffer, epoch);
      if (this.source && this.f3) this.f3.listen(this.source, buffer.duration);   // her mouth follows the voice
    }
    still(name = 'idle') {
      if (this.fallback || !this.f3) return super.still(name);
      this.cancel(); this.f3.play(MOTION[name] || 'idle');
      this.element.dataset.mode = name; this.notify();
    }
    async play(name, { sound = name !== 'idle', onEnd = () => {}, onCycle = () => {} } = {}) {
      if (this.fallback) return super.play(name, { sound, onEnd, onCycle });
      this.cancel();
      const epoch = this.epoch;
      this.element.dataset.mode = name; this.element.dataset.playing = 'loading'; this.notify();
      await this.load();
      if (this.fallback) return super.play(name, { sound, onEnd, onCycle });
      if (epoch !== this.epoch) return false;
      let buffer = null;
      if (sound && !this.muted && this.context) this.prepareAudio(name).then(b => {
        if (epoch !== this.epoch || !b) return; buffer = b;
        if (this.current?.epoch === epoch) { this.current.buffer = b; this.startSound(b, epoch); }
      });
      let seconds;
      try { seconds = await this.f3.play(MOTION[name] || 'idle'); }
      catch (error) { if (epoch !== this.epoch) return false; this.still(); throw error; }
      if (epoch !== this.epoch || document.hidden) return false;
      const clip = this.clips[name] || {}, ms = name === 'writing' ? (clip.duration || 3000) : Math.max(1, seconds) * 1000;
      this.current = { name, sound, buffer, started: performance.now(), duration: ms, epoch };
      this.element.dataset.playing = 'true';
      this.startSound(buffer, epoch);
      const loop = clip.loop === 0;   // idle: report each cycle (the widget may yawn), keep going
      const complete = () => {
        if (epoch !== this.epoch) return;
        this.stopSound();
        if (loop) {
          this.current.sound = false; this.notify(); onCycle();
          if (epoch === this.epoch && this.current) this.timer = setTimeout(complete, ms);
          return;
        }
        this.current = null; this.element.dataset.playing = 'false'; this.notify(); onEnd();
      };
      this.timer = setTimeout(complete, ms);
      this.notify();
      return true;
    }
  }
  window.CompanionPlayer3D = CompanionPlayer3D;
})();
