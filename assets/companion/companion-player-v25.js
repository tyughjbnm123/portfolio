(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const muteKey = 'yk-companion-muted-v22';
  class CompanionPlayer {
    constructor(element, onSoundChange = () => {}) {
      this.element = element;
      this.onSoundChange = onSoundChange;
      this.cache = new Map();
      this.epoch = 0;
      this.muted = false;
      try { this.muted = localStorage.getItem(muteKey) === 'true'; } catch {}
      this.image = new Image();
      this.image.alt = '';
      this.image.draggable = false;
      this.image.width = 480;
      this.image.height = 452;
      element.replaceChildren(this.image);
    }
    async fetchFile(name, kind) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const abort = new AbortController();
        const timeout = setTimeout(() => abort.abort(), 25000);
        try {
          const response = await fetch(new URL(name, base), { signal: abort.signal });
          if (!response.ok) {
            const error = Error(`無法載入 ${name}（${response.status}）`);
            error.retryable = response.status >= 500 || response.status === 408 || response.status === 429;
            throw error;
          }
          return await response[kind]();
        } catch (error) {
          if (attempt === 1 || error.retryable === false) throw error;
        } finally { clearTimeout(timeout); }
      }
    }
    load() {
      if (this.ready) return Promise.resolve();
      if (this.loading) return this.loading;
      this.loading = this.fetchFile('clips-v24.json', 'json').then(async clips => {
        this.clips = clips;
        this.image.src = new URL(clips.idle.poster, base).href;
        await this.image.decode();
        this.ready = true;
        this.notify();
      }).finally(() => { this.loading = null; });
      return this.loading;
    }
    unlock() {
      if (this.muted) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        if (!this.context) this.context = new Audio();
        this.resuming = this.context.resume().then(() => {
          const current = this.current;
          if (current && !this.source) this.startSound(current.buffer, current.epoch);
        }).catch(() => {});
      } catch {}
    }
    async prepare(name, sound) {
      await this.load();
      let entry = this.cache.get(name);
      if (!entry) { entry = {}; this.cache.set(name, entry); }
      const clip = this.clips[name];
      if (!entry.blobPromise) entry.blobPromise = this.fetchFile(clip.animation, 'blob').catch(error => { entry.blobPromise = null; throw error; });
      if (sound && !entry.audioPromise) entry.audioPromise = this.fetchFile(clip.audio, 'arrayBuffer').catch(() => { entry.audioPromise = null; return null; });
      const [blob, audioBytes] = await Promise.all([entry.blobPromise, sound ? entry.audioPromise : null]);
      let buffer = null;
      if (audioBytes && this.context) {
        try {
          if (!entry.decodePromise) entry.decodePromise = this.context.decodeAudioData(audioBytes.slice(0));
          buffer = await entry.decodePromise;
        } catch { entry.decodePromise = null; }
      }
      return { blob, buffer, clip };
    }
    async warm() {
      // Limit background downloads to one action at a time.
      for (const name of ['idle', 'drag', 'dance', 'bye', 'yawn']) {
        try { await this.prepare(name, name !== 'idle'); } catch {}
      }
    }
    stopSound() {
      if (!this.source) return;
      const source = this.source;
      this.source = null;
      source.onended = null;
      try { source.stop(); source.disconnect(); } catch {}
    }
    cancel() {
      this.epoch++;
      clearTimeout(this.timer);
      this.image.onload = this.image.onerror = null;
      if (this.pendingImage) this.pendingImage(false);
      this.pendingImage = null;
      this.stopSound();
      this.current = null;
      this.element.dataset.playing = 'false';
    }
    revoke() {
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = null;
    }
    still(name = 'idle') {
      this.cancel();
      if (this.clips) this.image.src = new URL(this.clips[name].poster, base).href;
      this.revoke();
      this.element.dataset.mode = name;
      this.notify();
    }
    async play(name, { sound = name !== 'idle', onEnd = () => {} } = {}) {
      this.cancel();
      const epoch = this.epoch;
      this.element.dataset.mode = name;
      this.element.dataset.playing = 'loading';
      this.notify();
      let prepared;
      let buffer = null;
      // Animation must remain usable even when audio is blocked or still loading.
      if (sound && !this.muted && this.context) {
        this.prepare(name, true).then(result => {
          if (epoch !== this.epoch) return;
          buffer = result.buffer;
          if (this.current?.epoch === epoch) {
            this.current.buffer = buffer;
            this.startSound(buffer, epoch);
          }
        }).catch(() => {});
      }
      try {
        prepared = await this.prepare(name, false);
      }
      catch (error) {
        if (epoch !== this.epoch) return false;
        this.still();
        throw error;
      }
      if (epoch !== this.epoch || document.hidden) return false;
      const previous = this.url;
      this.url = URL.createObjectURL(prepared.blob);
      return new Promise((resolve, reject) => {
        this.pendingImage = resolve;
        this.image.onload = () => {
          this.pendingImage = null;
          this.image.onload = this.image.onerror = null;
          if (epoch !== this.epoch) { resolve(false); return; }
          this.current = { name, sound, buffer, started: performance.now(), duration: prepared.clip.duration, epoch };
          this.element.dataset.playing = 'true';
          this.startSound(buffer, epoch);
          this.timer = setTimeout(() => {
            if (epoch !== this.epoch) return;
            this.stopSound();
            if (prepared.clip.loop === 0) {
              // Idle motion loops, but its optional voice plays only once.
              this.current.sound = false;
              this.notify();
              return;
            }
            this.current = null;
            this.element.dataset.playing = 'false';
            // The WebP itself also has loop=1; the final frame stays visible.
            this.notify();
            onEnd();
          }, prepared.clip.duration);
          this.notify();
          resolve(true);
        };
        this.image.onerror = () => {
          this.pendingImage = null;
          if (epoch !== this.epoch) { resolve(false); return; }
          this.still();
          reject(Error('角色動畫暫時無法播放'));
        };
        this.image.src = this.url;
        if (previous) URL.revokeObjectURL(previous);
      });
    }
    startSound(buffer, epoch) {
      const current = this.current;
      if (!buffer || !current?.sound || current.epoch !== epoch || this.muted || document.hidden || this.context?.state !== 'running') return;
      const offset = Math.max(0, (performance.now() - current.started) / 1000);
      if (offset >= buffer.duration || offset * 1000 >= current.duration) return;
      this.stopSound();
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      source.connect(this.context.destination);
      this.source = source;
      source.onended = () => {
        if (this.source !== source) return;
        this.source = null;
        source.disconnect();
        this.notify();
      };
      source.start(0, offset);
      this.notify();
    }
    toggleMuted() {
      this.muted = !this.muted;
      try { localStorage.setItem(muteKey, String(this.muted)); } catch {}
      if (this.muted) this.stopSound();
      else {
        this.unlock();
        const current = this.current;
        if (current?.sound) this.prepare(current.name, true).then(({ buffer }) => {
          if (this.current === current) {
            current.buffer = buffer;
            this.startSound(buffer, current.epoch);
          }
        }).catch(() => {});
      }
      this.notify();
    }
    notify() {
      this.element.dataset.muted = String(this.muted);
      this.element.dataset.sound = this.source ? 'playing' : this.muted ? 'muted' : 'quiet';
      this.onSoundChange(this.muted, !!this.source);
    }
  }
  window.CompanionPlayer = CompanionPlayer;
})();
