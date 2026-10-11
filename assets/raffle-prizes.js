/* Local, optional prize images. Draw selection stays in raffle.html. */
window.RafflePrizeImages = (() => {
  const LIMIT = 5 * 1024 * 1024;
  const EDGE = 1200;
  const copy = {
    '＋ 獎項圖片': '+ Prize image', '更換圖片': 'Replace image', '移除圖片': 'Remove image',
    '圖片處理中…': 'Processing image…', '請選擇 JPG、PNG 或 WebP 圖片': 'Choose a JPG, PNG or WebP image',
    '每張圖片上限 5 MB': 'Each image must be 5 MB or smaller',
    '無法讀取圖片，請換一張 JPG、PNG 或 WebP': 'Unable to read this image. Try another JPG, PNG or WebP.',
    '圖片像素過大，請先縮小後再上傳': 'This image has too many pixels. Resize it before uploading.',
    'JPG／PNG／WebP · 每張 5 MB 以內': 'JPG / PNG / WebP · Up to 5 MB each',
    '圖片僅供本次抽獎使用，重新整理後需重傳。': 'Images are for this session; upload again after refreshing.'
  };
  Object.assign(window.YKEnglish || (window.YKEnglish = {}), copy);
  const t = text => window.YKLanguage?.language === 'en' ? copy[text] || text : text;

  async function prepare(file) {
    if (file.size > LIMIT) throw new Error('每張圖片上限 5 MB');
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ascii = (a, b) => String.fromCharCode(...head.slice(a, b));
    const png = head[0] === 137 && ascii(1, 4) === 'PNG' && head[4] === 13 && head[5] === 10 && head[6] === 26 && head[7] === 10;
    const jpg = head[0] === 255 && head[1] === 216 && head[2] === 255;
    const webp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    if (!png && !jpg && !webp) throw new Error('請選擇 JPG、PNG 或 WebP 圖片');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.naturalWidth * image.naturalHeight > 48000000) throw new Error('圖片像素過大，請先縮小後再上傳');
      const scale = Math.min(1, EDGE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return {src: canvas.toDataURL('image/webp', .88), width: canvas.width, height: canvas.height};
    } catch (error) {
      if (copy[error.message]) throw error;
      throw new Error('無法讀取圖片，請換一張 JPG、PNG 或 WebP');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function mount({row, tier, canEdit, onChange, onBusy, onError}) {
    const editor = document.createElement('div');
    editor.className = 'prize-image-editor';
    const thumb = document.createElement('img');
    thumb.className = 'prize-image-thumb';
    thumb.alt = '';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    file.hidden = true;
    const upload = document.createElement('button');
    upload.type = 'button';
    upload.className = 'prize-image-upload';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'prize-image-remove';
    remove.textContent = t('移除圖片');
    function render() {
      thumb.hidden = !tier.image;
      if (tier.image) thumb.src = tier.image.src;
      else thumb.removeAttribute('src');
      upload.textContent = t(tier.image ? '更換圖片' : '＋ 獎項圖片');
      remove.hidden = !tier.image;
    }
    upload.addEventListener('click', () => { if (canEdit()) file.click(); });
    file.addEventListener('change', async () => {
      const selected = file.files[0];
      file.value = '';
      if (!selected || !canEdit()) return;
      upload.disabled = remove.disabled = true;
      upload.textContent = t('圖片處理中…');
      onBusy(1);
      try {
        const image = await prepare(selected);
        // A deleted row must not attach its pending image to the next prize.
        if (canEdit()) { tier.image = image; onChange(); }
      } catch (error) {
        if (canEdit()) onError(t(error.message));
      } finally {
        upload.disabled = remove.disabled = false;
        render();
        onBusy(-1);
      }
    });
    remove.addEventListener('click', () => {
      if (!canEdit()) return;
      tier.image = null;
      render();
      onChange();
    });
    editor.append(thumb, upload, remove, file);
    row.appendChild(editor);
    render();
  }

  function present(element, prize) {
    if (!element) return;
    const image = prize?.image;
    element.hidden = !image;
    if (image) {
      if (element.getAttribute('src') !== image.src) element.src = image.src;
      element.alt = prize.name;
    } else {
      element.removeAttribute('src');
      element.alt = '';
    }
  }
  return {prepare, mount, present};
})();
