(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const preferenceKey = 'yk-companion-muted-v22';
  const duration = 6.1;
  class CompanionMedia {
    constructor(container, onSoundChange = () => {}) {
      this.container = container;
      this.onSoundChange = onSoundChange;
      this.ready = false;
      this.playing = false;
      this.muted = false;
      try { this.muted = localStorage.getItem(preferenceKey) === 'true'; } catch {}
      this.image = new Image();
      this.image.alt = '';
      this.image.draggable = false;
      this.image.width = 678;
      this.image.height = 640;
      this.image.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;pointer-events:none';
      this.poster = new URL('blackhair-poster-v22.webp', base).href;
      container.replaceChildren(this.image);
    }
    load() {
      if (this.ready) return Promise.resolve();
      if (this.loading) return this.loading;
      this.image.src = this.poster;
      const fetchAsset = name => fetch(new URL(name, base)).then(response => {
        if (!response.ok) throw new Error('Media unavailable');
        return response;
      });
      this.loading = Promise.all([
        this.image.decode(),
        fetchAsset('blackhair-motion-v22.webp').then(response => response.blob()),
        fetchAsset('companion-voice-v22.mp3').then(response => response.arrayBuffer()).catch(() => {
          this.audioError = true;
          return null;
        })
      ]).then(async ([, blob, audioBytes]) => {
        const probe = new Image(), url = URL.createObjectURL(blob);
        try { probe.src = url; await probe.decode(); }
        finally { probe.removeAttribute('src'); URL.revokeObjectURL(url); }
        this.blob = blob;
        this.audioBytes = audioBytes;
        this.ready = true;
        this.notify();
      }).finally(() => { this.loading = null; });
      return this.loading;
    }
    // Resume the audio context inside a user action, before waiting for downloads.
    activate() {
      if (this.muted) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error('Audio unavailable');
        if (!this.context) this.context = new AudioContext();
        const resume = this.context.resume();
        Promise.all([resume, this.load()]).then(() => {
          if (!this.audioBytes) throw new Error('Audio unavailable');
          if (!this.decoding) this.decoding = this.context.decodeAudioData(this.audioBytes.slice(0));
          return this.decoding;
        }).then(buffer => {
          this.buffer = buffer;
          this.audioError = false;
          this.syncSound();
        }).catch(() => { this.audioError = true; this.notify(); });
      } catch { this.audioError = true; this.notify(); }
    }
    setPlaying(value) {
      const next = Boolean(value && this.ready);
      if (next === this.playing) return;
      this.playing = next;
      this.container.dataset.playing = String(next);
      if (next) this.restart();
      else {
        this.stopSound();
        this.image.src = this.poster;
        if (this.motionUrl) URL.revokeObjectURL(this.motionUrl);
        this.motionUrl = null;
      }
      this.notify();
    }
    restartImage() {
      const previous = this.motionUrl;
      // Restart frame one from cached bytes instead of re-downloading the WebP.
      this.motionUrl = URL.createObjectURL(this.blob);
      this.image.src = this.motionUrl;
      if (previous) URL.revokeObjectURL(previous);
    }
    restart() {
      if (!this.playing) return;
      this.stopSound();
      this.restartImage();
      this.syncSound();
    }
    syncSound() {
      if (!this.playing || this.muted || document.hidden || !this.buffer || this.context?.state !== 'running' || this.source) return;
      this.restartImage();
      const source = this.context.createBufferSource();
      source.buffer = this.buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = Math.min(duration, this.buffer.duration);
      source.connect(this.context.destination);
      this.source = source;
      source.start();
      this.notify();
    }
    stopSound() {
      if (!this.source) return;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    toggleMuted() {
      this.muted = !this.muted;
      try { localStorage.setItem(preferenceKey, String(this.muted)); } catch {}
      if (this.muted) this.stopSound();
      else this.activate();
      this.notify();
    }
    notify() {
      const status = this.muted ? 'muted' : this.source ? 'playing' : this.audioError ? 'error' : 'waiting';
      this.container.dataset.muted = String(this.muted);
      this.container.dataset.sound = status;
      this.onSoundChange(this.muted, status);
    }
  }
  window.CompanionMedia = CompanionMedia;
})();
