/* Mobile-only preview. Existing routes and desktop portal actions stay in index.html. */
(() => {
  'use strict';
  const root = document.querySelector('#yk-world');
  const stage = root?.querySelector('.yk-icon-entrances');
  const home = root?.querySelector('.yk-home-view');
  if (!stage || !home) return;
  const portals = [...stage.querySelectorAll('.yk-portal')];
  const mobile = matchMedia('(max-width:700px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let selected = null;

  const panel = document.createElement('section');
  panel.id = 'yk-mobile-preview';
  panel.className = 'yk-mobile-preview';
  panel.setAttribute('data-i18n-ignore', '');
  panel.hidden = true;
  panel.innerHTML = '<div class="yk-mobile-preview-head"><button type="button" class="yk-mobile-preview-close">×</button></div><a class="yk-mobile-preview-art"></a><p class="yk-mobile-preview-description"></p>';
  const art = panel.querySelector('.yk-mobile-preview-art');
  const closeButton = panel.querySelector('.yk-mobile-preview-close');
  const hint = document.createElement('p');
  hint.className = 'yk-mobile-preview-hint';
  hint.setAttribute('data-i18n-ignore', '');
  stage.before(hint);

  function translate() {
    const en = document.documentElement.lang === 'en';
    hint.textContent = en ? 'Tap an icon to preview. Tap the image to explore.' : '點選圖示放大預覽，再點圖片進入';
    closeButton.setAttribute('aria-label', en ? 'Close preview' : '收合預覽');
    if (!selected) return;
    const label = selected.querySelector('.yk-label strong').cloneNode(true);
    label.querySelectorAll('span').forEach(node => node.remove());
    const title = label.textContent.trim();
    panel.setAttribute('aria-label', (en ? 'Preview: ' : '預覽：') + title);
    art.setAttribute('aria-label', (en ? 'Open ' : '開啟') + title);
    panel.querySelector('.yk-mobile-preview-description').textContent = selected.querySelector('.yk-preview')?.textContent || '';
  }

  function close(restoreFocus = false) {
    const previous = selected;
    selected = null;
    panel.hidden = true;
    panel.remove();
    art.replaceChildren();
    portals.forEach(portal => {
      portal.classList.remove('yk-preview-selected');
      if (home.hidden === false) portal.setAttribute('aria-expanded', 'false');
    });
    if (restoreFocus) previous?.focus({preventScroll: true});
  }

  function show(portal) {
    if (selected === portal) {close(true); return;}
    close();
    selected = portal;
    panel.dataset.portal = portal.dataset.open;
    const key = portal.dataset.open;
    art.href = new URL(key === 'work' ? 'projects.html' : key === 'tools' ? 'tools.html' : '#' + key, location.href).href;
    // Reuse the existing pictures, including the original idea → tool artwork.
    const source = portal.querySelector('.yk-entry-original') || portal.querySelector('.yk-entry-icon');
    if (source) {
      const picture = source.cloneNode(true);
      picture.setAttribute('aria-hidden', 'true');
      picture.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      art.replaceChildren(picture);
    }
    const index = portals.indexOf(portal);
    const rowEnd = Math.min(index + (index % 2 === 0 ? 1 : 0), portals.length - 1);
    portals[rowEnd].after(panel);
    portal.classList.add('yk-preview-selected');
    portal.setAttribute('aria-expanded', 'true');
    translate();
    panel.hidden = false;
    art.focus({preventScroll: true});
    panel.scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block: 'nearest'});
  }

  stage.addEventListener('click', event => {
    const portal = event.target.closest('.yk-portal');
    if (!mobile.matches || home.hidden || !portals.includes(portal)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    show(portal);
  }, true);

  closeButton.addEventListener('click', () => close(true));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected) {
      event.preventDefault();
      close(true);
    }
  });
  function syncViewport() {
    if (!mobile.matches) close();
    portals.forEach(portal => portal.setAttribute('aria-controls', mobile.matches ? panel.id : 'yk-detail'));
  }
  mobile.addEventListener('change', syncViewport);
  window.addEventListener('hashchange', () => close());
  window.addEventListener('pagehide', () => close());
  window.addEventListener('yk:language', translate);
  syncViewport();
  translate();
  root.setAttribute('data-mobile-preview-ready', '');
})();
