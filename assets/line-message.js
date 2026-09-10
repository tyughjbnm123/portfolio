(() => {
  'use strict';
  const C=globalThis.LineComposer;
  if(!C){const warning=document.createElement('p');warning.className='lc-alert';warning.setAttribute('role','alert');warning.textContent='編排器未能載入，請重新整理頁面；若持續出現，請聯絡網站維護者。';document.querySelector('main').prepend(warning);document.querySelectorAll('main button,main input,main select,main textarea').forEach(el=>el.disabled=true);return;}
  const $=id=>document.getElementById(id);
  const all=selector=>Array.from(document.querySelectorAll(selector));
  const state=C.initial();
  let selected=0,outputMode='message',compiled,toastTimer;
  const imageStates=new Map();
  const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  function toast(text){clearTimeout(toastTimer);$('lc-toast').textContent=text;$('lc-toast').classList.add('is-visible');toastTimer=setTimeout(()=>$('lc-toast').classList.remove('is-visible'),3200);}
  function tab(name,focus=false){all('[data-panel]').forEach(b=>{const active=b.dataset.panel===name;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$(b.getAttribute('aria-controls')).hidden=!active;if(active&&focus)b.focus();});}
  function fillForm(){
    all('[data-card]').forEach(el=>el.value=state.cards[selected][el.dataset.card]);
    all('[data-tracking]').forEach(el=>el.value=state.tracking[el.dataset.tracking]);
    $('message-accent').value=state.accent;$('message-alt').value=state.altText;$('utm-enabled').checked=state.tracking.enabled;$('utm-fields').hidden=!state.tracking.enabled;
  }
  function selectCard(index,focus=false){
    if(index<0||index>=state.cards.length)return;
    selected=index;fillForm();render();
    const button=$('card-strip').children[selected];
    if(focus)button.focus();
    $('card-strip').scrollTo({left:Math.max(0,button.offsetLeft-$('card-strip').offsetLeft-28),behavior:'auto'});
  }
  function renderStrip(){
    const strip=$('card-strip');
    if(strip.children.length!==state.cards.length){
      strip.replaceChildren();
      state.cards.forEach((_,index)=>{const b=node('button','lc-card-select');b.type='button';b.append(node('span','lc-mini-index'),node('span','lc-mini-title'));b.addEventListener('click',()=>selectCard(index,true));strip.append(b);});
    }
    state.cards.forEach((card,index)=>{const b=strip.children[index];b.setAttribute('aria-pressed',String(index===selected));b.setAttribute('aria-label',`編輯第 ${index+1} 張：${card.title||'未命名卡片'}`);b.children[0].textContent=`CARD ${String(index+1).padStart(2,'0')}${index===selected?'　↗':''}`;b.children[1].textContent=card.title||'未命名卡片';});
    $('card-count').textContent=`${state.cards.length} / ${C.LIMITS.cards}`;
    $('editing-label').textContent=`正在編輯第 ${selected+1} 張`;
    $('add-card').disabled=$('duplicate-card').disabled=state.cards.length>=C.LIMITS.cards;
    $('delete-card').disabled=state.cards.length===1;
    $('move-left').disabled=selected===0;$('move-right').disabled=selected===state.cards.length-1;
  }
  function imageStatus(){
    const card=state.cards[selected],raw=card.image.trim(),url=C.webUrl(raw,true),info=imageStates.get(url),result=info?.status;
    const size=C.IMAGE_SIZES[card.ratio]||C.IMAGE_SIZES['1:1'];
    $('image-size-help').textContent=`${card.ratio} 圖片建議 ${size[0]} × ${size[1]} px；LINE 圖片寬、高均不可超過 1024 px。`;
    const oversize=info?.width>1024||info?.height>1024;
    $('image-status').dataset.state=raw&&(!url||result==='error'||oversize)?'error':'ok';
    const crop=info?.width&&card.fit==='cover'&&Math.abs(info.width/info.height-Number(card.ratio.split(':')[0])/Number(card.ratio.split(':')[1]))>.03;
    $('image-status').textContent=!raw?'目前為純文字卡片。':!url?'請輸入有效的 HTTPS 圖片直連。':result==='error'?'圖片未能載入，請確認網址可公開讀取且確實是圖片。':result==='loaded'?`原圖 ${info.width} × ${info.height} px。${oversize?'請先等比例縮小至 1024 × 1024 px 以內，再上傳圖片。':crop?'目前會裁切；可改成「保留完整圖片」或更接近原圖的比例。':'預覽已載入；LINE 仍會自行讀取此網址。'}`:'正在讀取圖片…';
  }
  function previewSize(){const hero=$('phone-cards').children[selected]?.querySelector('.lc-hero');$('preview-image-size').textContent=hero?`圖片框 ${Math.round(hero.clientWidth)} × ${Math.round(hero.clientHeight)} px · ${state.cards[selected].ratio}`:'純文字卡片';}
  function preview(){
    const viewport=$('phone-cards');
    const accent=/^#[0-9a-f]{6}$/i.test(state.accent)?state.accent:'#536F35';
    viewport.replaceChildren();
    state.cards.forEach((card,index)=>{
      const article=node('article','lc-message-card');article.style.setProperty('--message-accent',accent);article.setAttribute('aria-label',`第 ${index+1} 張訊息卡片`);
      if(card.image.trim()){
        const hero=node('div','lc-hero');hero.style.aspectRatio=Object.hasOwn(C.IMAGE_SIZES,card.ratio)?card.ratio.replace(':','/'):'1/1';
        const placeholder=node('span','', '圖片載入中…');hero.append(placeholder);
        const url=C.webUrl(card.image,true);
        if(url){
          const img=node('img');img.alt=card.title.trim()||'訊息圖片';img.style.objectFit=card.fit==='contain'?'contain':'cover';img.decoding='async';img.referrerPolicy='no-referrer';
          placeholder.hidden=imageStates.get(url)?.status==='loaded';
          img.addEventListener('load',()=>{imageStates.set(url,{status:'loaded',width:img.naturalWidth,height:img.naturalHeight});placeholder.hidden=true;imageStatus();renderExport();});
          img.addEventListener('error',()=>{imageStates.set(url,{status:'error'});img.hidden=true;placeholder.hidden=false;placeholder.textContent='圖片無法載入，請檢查圖片網址';imageStatus();renderExport();});
          img.src=url;hero.append(img);
        }else placeholder.textContent='請加入有效的 HTTPS 圖片網址';
        article.append(hero);
      }
      const body=node('div','lc-message-body');
      for(const field of ['eyebrow','title','description','detail']){const value=card[field].trim();if(value||field==='title')body.append(node('p','lc-message-'+field,value||(field==='title'?'卡片標題':'')));}
      article.append(body);
      const footer=node('div','lc-message-footer');
      for(let n=1;n<=2;n++){
        const label=card['button'+n+'Label'].trim(),raw=card['button'+n+'Url'].trim();if(!label&&!raw)continue;
        const action=node('button','lc-message-action',label||'按鈕文字');action.type='button';action.dataset.style=n===1?'primary':'link';
        const url=C.link(raw,state.tracking,index,n-1);action.title=url||'請設定有效網址';
        action.addEventListener('click',()=>{$('preview-action').hidden=false;$('preview-action').textContent=url?`按鈕 ${n} 將前往：${url}`:'此按鈕尚未設定有效網址。';});footer.append(action);
      }
      if(footer.childElementCount)article.append(footer);viewport.append(article);
    });
    const pagination=$('preview-pagination');pagination.replaceChildren();
    state.cards.forEach((_,i)=>{const dot=node('button');dot.type='button';dot.setAttribute('aria-label',`預覽並編輯第 ${i+1} 張`);dot.setAttribute('aria-pressed',String(i===selected));dot.addEventListener('click',()=>{selectCard(i);$('preview-pagination').children[i].focus();});pagination.append(dot);});
    $('preview-format').textContent=state.cards.length===1?'單張卡片':`${state.cards.length} 張輪播`;
    requestAnimationFrame(()=>{const card=viewport.children[selected];if(card)viewport.scrollLeft=card.offsetLeft-viewport.children[0].offsetLeft;previewSize();});
    imageStatus();
  }
  function fieldElement(error){
    if(error.field==='altText')return $('message-alt');
    if(error.field==='accent')return $('message-accent');
    if(error.field==='cards')return $('card-strip');
    if(error.field.startsWith('utm-'))return $(error.field);
    return $('card-'+error.field);
  }
  function focusError(error){
    if(error.cardIndex!==null)selectCard(error.cardIndex);
    const el=fieldElement(error);if(!el)return;
    const panel=el.closest('[role=tabpanel]');if(panel)tab(panel.id.slice(6));
    if(error.field==='cards'){const first=$('card-strip').querySelector('button');if(first)first.focus();$('card-strip').scrollIntoView({block:'center'});return;}
    el.focus();el.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  function renderExport(){
    compiled=C.compile(state);
    state.cards.forEach((card,cardIndex)=>{const url=C.webUrl(card.image,true);if(url&&!imageStates.has(url))compiled.errors.push({field:'image',cardIndex,message:`第 ${cardIndex+1} 張圖片正在讀取，完成尺寸檢查後即可匯出。`});});
    state.cards.forEach((card,cardIndex)=>{const info=imageStates.get(C.webUrl(card.image,true));if(info?.status==='error')compiled.errors.push({field:'image',cardIndex,message:`第 ${cardIndex+1} 張圖片無法載入，請更換可公開讀取的圖片網址。`});else if(info?.width>1024||info?.height>1024)compiled.errors.push({field:'image',cardIndex,message:`第 ${cardIndex+1} 張原圖為 ${info.width} × ${info.height} px，請縮小至寬、高均不超過 1024 px。`});});
    compiled.valid=compiled.errors.length===0;
    const status=$('validation-status');status.dataset.valid=String(compiled.valid);status.textContent=compiled.valid?'✓ 格式檢查通過':`${compiled.errors.length} 項需要修正`;
    const errors=$('validation-errors');errors.replaceChildren();errors.hidden=compiled.valid;
    all('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    compiled.errors.forEach(error=>{const li=node('li'),button=node('button','',error.message);button.type='button';button.addEventListener('click',()=>focusError(error));li.append(button);errors.append(li);if(error.cardIndex===null||error.cardIndex===selected){const field=fieldElement(error);if(field&&field.matches('input,textarea,select'))field.setAttribute('aria-invalid','true');}});
    $('copy-json').disabled=$('download-json').disabled=!compiled.valid;
    $('json-output').textContent=JSON.stringify(compiled[outputMode],null,2);
    $('json-size').textContent=`版型 ${(compiled.bytes/1000).toFixed(1)} KB · ${state.cards.length} 張`;
    $('alt-count').textContent=`${state.altText.length} / ${C.LIMITS.altText}`;
    all('[data-output]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.output===outputMode)));
    $('output-help').textContent=outputMode==='message'?'完整訊息可放入 Messaging API 的 messages 陣列；此工具不會發送訊息。':'僅匯出 contents 版型，可貼入 Flex Message Simulator 的 JSON 編輯器；不含通知摘要。';
    const links=$('link-results');links.replaceChildren();
    for(let n=1;n<=2;n++){const c=state.cards[selected];if(!c['button'+n+'Label'].trim()&&!c['button'+n+'Url'].trim())continue;const p=node('p','',`按鈕 ${n} 的完整連結`);p.append(node('code','',C.link(c['button'+n+'Url'],state.tracking,selected,n-1)||'填入有效網址後顯示'));links.append(p);}
  }
  function render(){renderStrip();preview();renderExport();all('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color.toLowerCase()===state.accent.toLowerCase())));$('preview-action').hidden=true;}
  $('composer-form').addEventListener('submit',event=>event.preventDefault());
  all('[data-card]').forEach(el=>el.addEventListener('input',()=>{state.cards[selected][el.dataset.card]=el.value;render();}));
  all('[data-tracking]').forEach(el=>el.addEventListener('input',()=>{state.tracking[el.dataset.tracking]=el.value;render();}));
  $('message-alt').addEventListener('input',()=>{state.altText=$('message-alt').value;renderExport();});
  $('message-accent').addEventListener('input',()=>{state.accent=$('message-accent').value;render();});
  $('utm-enabled').addEventListener('change',()=>{state.tracking.enabled=$('utm-enabled').checked;$('utm-fields').hidden=!state.tracking.enabled;render();});
  all('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.accent=b.dataset.color;$('message-accent').value=state.accent;render();}));
  all('[data-panel]').forEach(b=>{
    b.addEventListener('click',()=>tab(b.dataset.panel));
    b.addEventListener('keydown',event=>{const tabs=all('[data-panel]'),i=tabs.indexOf(b);const next={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];if(next!==undefined){event.preventDefault();tab(tabs[next].dataset.panel,true);}});
  });
  all('[data-template]').forEach(b=>b.addEventListener('click',()=>{state.cards[selected]=C.card(b.dataset.template);fillForm();render();toast(`第 ${selected+1} 張已套用${b.textContent}`);}));
  $('add-card').addEventListener('click',()=>{if(state.cards.length>=C.LIMITS.cards)return;state.cards.push(C.card('blank'));selectCard(state.cards.length-1);tab('content');$('card-title').focus();$('card-title').select();toast('已新增一張卡片');});
  $('duplicate-card').addEventListener('click',()=>{if(state.cards.length>=C.LIMITS.cards)return;state.cards.splice(selected+1,0,{...state.cards[selected]});selectCard(selected+1);toast('已複製卡片');});
  $('delete-card').addEventListener('click',()=>{if(state.cards.length===1)return;state.cards.splice(selected,1);selectCard(Math.min(selected,state.cards.length-1),true);toast('卡片已刪除');});
  for(const [id,delta] of [['move-left',-1],['move-right',1]])$(id).addEventListener('click',()=>{selected=C.move(state.cards,selected,delta);fillForm();render();toast(`已移到第 ${selected+1} 張`);});
  all('[data-output]').forEach(b=>b.addEventListener('click',()=>{outputMode=b.dataset.output;renderExport();}));
  $('copy-json').addEventListener('click',async()=>{
    renderExport();if(!compiled.valid)return;
    const json=JSON.stringify(compiled[outputMode],null,2);
    let copied=false;
    try{await navigator.clipboard.writeText(json);copied=true;}catch{
      const textarea=node('textarea');textarea.value=json;textarea.style.position='fixed';textarea.style.top='-9999px';document.body.append(textarea);textarea.select();
      try{copied=document.execCommand('copy');}catch{}finally{textarea.remove();$('copy-json').focus();}
    }
    if(copied)toast(outputMode==='message'?'完整訊息 JSON 已複製':'模擬器版型 JSON 已複製');
    else {document.querySelector('.lc-code-details').open=true;const range=document.createRange();range.selectNodeContents($('json-output'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);toast('無法自動複製，已選取 JSON，請按 Ctrl/Cmd + C');}
  });
  $('download-json').addEventListener('click',()=>{
    renderExport();if(!compiled.valid)return;
    const blob=new Blob([JSON.stringify(compiled[outputMode],null,2)+'\n'],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
    const a=node('a');a.href=url;a.download=outputMode==='message'?'line-flex-message.json':'line-flex-contents.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('JSON 下載已準備');
  });
  $('phone-cards').addEventListener('keydown',event=>{if(event.target!==$('phone-cards'))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();selectCard(Math.max(0,Math.min(state.cards.length-1,selected+(event.key==='ArrowRight'?1:-1))));}});
  new ResizeObserver(previewSize).observe($('phone-cards'));
  fillForm();render();
})();
