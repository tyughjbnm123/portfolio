(() => {
  'use strict';
  const video = document.getElementById('kks-video');
  const toggle = document.getElementById('kks-video-toggle');
  const status = document.getElementById('kks-video-status');
  if (!video || !toggle || !status) return;
  document.getElementById('kks-film-panel')?.addEventListener('toggle', event => {
    if (!event.currentTarget.open) video.pause();
  });
  let loadFailed = false;
  function message(text) {
    status.textContent = text;
    status.hidden = !text;
  }
  function sync() {
    toggle.textContent = video.error || loadFailed ? '重新載入影片 ↻' : video.ended ? '再看一次 ↻' : video.paused ? '播放實機片段 ▶' : '暫停播放 Ⅱ';
  }
  function failed() {
    loadFailed = true;
    sync();
    message('影片暫時無法播放，請重新載入，或使用「另開影片」觀看。');
  }
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    if (!video.paused && !video.ended) { video.pause(); return; }
    if (video.error || loadFailed) { loadFailed = false; video.load(); }
    message('影片載入中…');
    video.play().catch(error => {
      if (error.name === 'AbortError') return;
      failed();
    });
  });
  video.addEventListener('playing', () => { loadFailed = false; sync(); message(''); });
  video.addEventListener('pause', () => { sync(); if (!video.error) message(''); });
  video.addEventListener('ended', () => { sync(); message('播放完畢，可再看一次。'); });
  video.addEventListener('waiting', () => { if (!video.paused) message('影片載入中…'); });
  video.addEventListener('error', failed);
  video.querySelector('source')?.addEventListener('error', failed);
  sync();
})();
