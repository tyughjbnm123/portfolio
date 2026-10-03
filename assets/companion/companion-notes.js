const KEY = 'yk-companion-note-v1';
const LIMIT = 160;
export function readNote(storage) {
  try {
    const value = JSON.parse(storage.getItem(KEY));
    if (!value || typeof value.text !== 'string' || !value.text.trim() || value.text.length > LIMIT) return null;
    return { text: value.text, done: value.done === true };
  } catch { return null; }
}
export function writeNote(storage, value) {
  try { storage.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}

export function createNotes({root, host, onComplete, onClose, onSave = () => {}}) {
  let storage;
  try { storage = window.localStorage; } catch {}
  let note = readNote(storage), deleted = null, editing = !note, message = '';
  const tr = (zh, en) => window.YKLanguage?.language === 'en' ? en : zh;
  const card = document.createElement('section');
  card.className = 'note-card'; card.hidden = true; card.dataset.i18nIgnore = '';
  card.setAttribute('role', 'dialog');
  card.innerHTML = `<header class="note-header"><div><small>ONE LITTLE THING</small><h2></h2></div><button type="button" class="note-close">×</button></header>
    <form class="note-form"><label for="pet-note-text"></label><textarea id="pet-note-text" maxlength="160" rows="3"></textarea><div class="note-form-footer"><small class="note-count"></small><div><button type="button" class="note-cancel"></button><button type="submit" class="note-save"></button></div></div></form>
    <div class="note-view"><label class="note-task"><input type="checkbox"><span class="note-copy"></span></label><p class="note-done-hint"></p><div class="note-actions"><button type="button" class="note-edit"></button><button type="button" class="note-delete"></button></div></div>
    <p class="note-feedback" role="status"></p><button type="button" class="note-undo" hidden></button><p class="note-storage"></p>`;
  root.append(card);
  const $ = selector => card.querySelector(selector);
  const input = $('textarea'), check = $('input');
  function layout() {
    if (card.hidden) return;
    const r = host.getBoundingClientRect(), zoom = r.width / host.offsetWidth || 1;
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
    const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
    card.style.width = Math.min(296, (width - 24) / zoom) + 'px';
    card.style.maxHeight = (height - 24) / zoom + 'px';
    const m = card.getBoundingClientRect(), gap = 12;
    let x = r.left - m.width - gap, y = r.top + 12;
    if (x < left + gap) {
      if (r.right + gap + m.width <= left + width - gap) x = r.right + gap;
      else { x = r.left + (r.width - m.width) / 2; y = r.top - m.height - gap; if (y < top + gap) y = r.bottom + gap; }
    }
    const clamp = (v, min, max) => Math.max(min, Math.min(v, Math.max(min, max)));
    card.style.left = (clamp(x, left + gap, left + width - m.width - gap) - r.left) / zoom + 'px';
    card.style.top = (clamp(y, top + gap, top + height - m.height - gap) - r.top) / zoom + 'px';
  }
  function render() {
    card.setAttribute('aria-label', tr('小精靈便條', 'Companion note'));
    $('h2').textContent = tr('幫你記一件事', 'One thing to remember');
    $('.note-close').setAttribute('aria-label', tr('關閉便條', 'Close note'));
    $('.note-form').hidden = !editing;
    $('.note-view').hidden = editing || !note;
    $('label[for]').textContent = tr('想記住什麼？', 'What would you like to remember?');
    input.placeholder = tr('例如：看完 SlimBot 案例', 'For example: read the SlimBot case study');
    $('.note-count').textContent = input.value.length + ' / ' + LIMIT;
    $('.note-cancel').hidden = !note;
    $('.note-cancel').textContent = tr('取消', 'Cancel');
    $('.note-save').textContent = tr('儲存便條', 'Save note');
    if (note) {
      check.checked = note.done;
      check.setAttribute('aria-label', tr(note.done ? '標記為未完成' : '標記為已完成', note.done ? 'Mark incomplete' : 'Mark complete'));
      $('.note-copy').textContent = note.text;
      $('.note-task').classList.toggle('is-done', note.done);
    }
    $('.note-done-hint').textContent = note?.done ? tr('完成了，做得好！', 'Done. Nicely done!') : tr('做完時，勾一下就好。', 'Check it off when you are done.');
    $('.note-edit').textContent = tr('修改', 'Edit'); $('.note-delete').textContent = tr('刪除', 'Delete');
    $('.note-undo').hidden = !deleted; $('.note-undo').textContent = tr('復原刪除', 'Undo delete');
    $('.note-storage').textContent = tr('保存在這個瀏覽器，重新整理也會留下。', 'Saved in this browser, including after a refresh.');
    const messages = {
      saved: tr('記好了。', 'Saved.'), complete: tr('又完成一件事！', 'One more thing done!'),
      deleted: tr('便條已刪除。', 'Note deleted.'), restored: tr('便條已復原。', 'Note restored.'),
      empty: tr('先寫一點內容再儲存。', 'Write something before saving.'),
      unavailable: tr('瀏覽器目前無法儲存，請先複製你的文字。', 'This browser cannot save right now. Copy your text to keep it.')
    };
    $('.note-feedback').textContent = messages[message] || '';
    requestAnimationFrame(layout);
  }
  function commit(value) {
    if (!writeNote(storage, value)) { message = 'unavailable'; render(); return false; }
    note = value; return true;
  }
  function close() { card.hidden = true; onClose(); }
  $('.note-close').addEventListener('click', close);
  $('.note-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim().slice(0, LIMIT);
    if (!text) { message = 'empty'; render(); input.focus(); return; }
    if (!commit({text, done: note?.text === text && note.done === true})) return;
    editing = false; deleted = null; message = 'saved'; render(); check.focus({preventScroll:true}); onSave();
  });
  input.addEventListener('input', () => { $('.note-count').textContent = input.value.length + ' / ' + LIMIT; });
  $('.note-edit').addEventListener('click', () => { input.value = note.text; editing = true; message = ''; render(); input.focus(); });
  $('.note-cancel').addEventListener('click', () => { editing = false; message = ''; render(); check.focus(); });
  check.addEventListener('change', () => {
    const done = check.checked;
    if (!commit({...note, done})) return;
    message = done ? 'complete' : ''; render(); if (done) onComplete();
  });
  $('.note-delete').addEventListener('click', () => {
    const previous = note;
    if (!commit(null)) return;
    deleted = previous; editing = true; input.value = ''; message = 'deleted'; render(); input.focus();
  });
  $('.note-undo').addEventListener('click', () => {
    if (!deleted || !commit(deleted)) return;
    deleted = null; editing = false; message = 'restored'; render(); check.focus();
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    event.stopPropagation();
  });
  window.addEventListener('yk:language', render);
  window.addEventListener('resize', layout);
  window.visualViewport?.addEventListener('resize', layout);
  window.visualViewport?.addEventListener('scroll', layout);
  render();
  return {
    get isOpen() { return !card.hidden; }, layout, close,
    open() { card.hidden = false; render(); layout(); (editing ? input : check).focus({preventScroll:true}); }
  };
}
