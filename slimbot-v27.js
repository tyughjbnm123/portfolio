(() => {
  const controls = document.querySelector('.sb-flow-buttons');
  const panels = document.querySelector('.sb-flow-panels');
  if (controls && panels) {
    const buttons = [...controls.querySelectorAll('button[aria-controls]')];
    const select = selected => {
      buttons.forEach(button => {
        const active = button === selected;
        button.setAttribute('aria-pressed', String(active));
        document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
      });
    };
    buttons.forEach(button => button.addEventListener('click', () => select(button)));
    panels.dataset.enhanced = 'true';
    select(buttons[0]);
    controls.hidden = false;
  }

  const dialog = document.getElementById('sb-image-dialog');
  const opener = document.querySelector('[data-sb-enlarge]');
  if (!dialog || !opener || typeof dialog.showModal !== 'function') return;
  const viewport = dialog.querySelector('.sb-zoom-viewport');
  const zoom = dialog.querySelector('[data-sb-zoom]');
  let previousOverflow = '';
  function resetZoom() {
    viewport.classList.remove('sb-zoomed');
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
    zoom.setAttribute('aria-pressed', 'false');
    zoom.textContent = '放大細節 ＋';
  }
  opener.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    resetZoom();
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  });
  dialog.querySelector('[data-sb-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  zoom.addEventListener('click', () => {
    const expanded = viewport.classList.toggle('sb-zoomed');
    zoom.setAttribute('aria-pressed', String(expanded));
    zoom.textContent = expanded ? '縮回全圖 −' : '放大細節 ＋';
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
  });
})();
