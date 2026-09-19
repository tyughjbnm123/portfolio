(() => {
  'use strict';
  const L=globalThis.ActionLibrary,S=globalThis.Storyboard,$=id=>document.getElementById(id);
  if(!L||!S){$('ac-grid').textContent='動作資料無法載入，請重新整理。';return;}
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const button=(text,cls,fn,label)=>{const b=node('button',cls,text);b.type='button';if(label)b.setAttribute('aria-label',label);b.addEventListener('click',fn);return b;};
  let selected=[],kind='all',modalAction=null,modalStep=0,modalPlaying=false,modalTimer=0,toastTimer=0,uploadURL='',uploadToken=0,busy=false,outputMode='sequence';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),imageLoader=ActionMedia.createLoader();
  const notify=text=>{clearTimeout(toastTimer);$('ac-toast').textContent=text;$('ac-toast').classList.add('is-visible');toastTimer=setTimeout(()=>$('ac-toast').classList.remove('is-visible'),3600);};
  const fields=['name','ratio','quality','scene','character','props','product','music','song','bpm','beats'];
  const settings=()=>Object.fromEntries(fields.map(k=>[k,$('ac-'+k).value]));
  function persist(){try{sessionStorage.setItem(L.STORAGE,JSON.stringify({selected,settings:settings()}));}catch{}if(!$('ac-output').hidden&&outputMode==='sequence')renderPrompt();}
  try{const saved=JSON.parse(sessionStorage.getItem(L.STORAGE)||'null');if(saved){selected=L.normalizeSelection(saved.selected);for(const k of fields)if(typeof saved.settings?.[k]==='string'&&saved.settings[k].length<5000){if(k==='ratio'&&!['9:16','16:9','1:1'].includes(saved.settings[k]))continue;$('ac-'+k).value=saved.settings[k];}}}catch{}
  const getImage=src=>imageLoader.get(src);
  function loadArt(el){
    if(el.dataset.loading||el.dataset.ready)return;
    el.dataset.loading='true';delete el.dataset.failed;
    const a=L.BY_ID.get(Number(el.dataset.action));
    async function showImage(image){
      const layers=[...el.querySelectorAll('.ac-pose')];
      const frames=layers.map((layer,frame)=>{
        const img=document.createElement('img');img.alt='';img.draggable=false;
        img.style.left=`${-a.column*100}%`;img.style.top=`${-frame*100}%`;img.src=image.src;
        return img;
      });
      // Keep the previous image visible until both replacement frames are decoded.
      let decodeTimer;
      try{
        await Promise.race([
          Promise.all(frames.map(img=>img.decode())),
          new Promise((_,reject)=>{decodeTimer=setTimeout(()=>reject(Error('圖片解碼逾時')),4000);})
        ]);
      }catch(error){frames.forEach(img=>{img.src='';});throw error;}
      finally{clearTimeout(decodeTimer);}
      layers.forEach((layer,index)=>layer.replaceChildren(frames[index]));
      el.dataset.ready='true';
    }
    imageLoader.getPreview(a.atlas).then(async image=>{
      await showImage(image);
      // The dialog can open with its cached thumbnail while detail loads in the background.
      if(el.dataset.full==='true')getImage(a.atlas).then(full=>{
        if(el.isConnected)return showImage(full);
      }).catch(()=>{});
    }).catch(()=>{el.dataset.failed='true';}).finally(()=>{delete el.dataset.loading;updateImageStatus();});
  }
  function updateImageStatus(){const help=$('ac-image-help');if(help)help.hidden=!document.querySelector('.ac-grid .ac-art[data-failed=true]');}
  const lazy=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){loadArt(entry.target);lazy.unobserve(entry.target);}}),{rootMargin:'500px'});
  function art(a,{labels=true,end=false,immediate=false,full=false}={}){
    const wrap=node('div','ac-art');wrap.dataset.action=a.id;wrap.dataset.step=end?'1':'0';wrap.setAttribute('aria-hidden','true');
    if(full)wrap.dataset.full='true';
    for(let frame=0;frame<2;frame++)wrap.append(node('span','ac-pose'+(frame?' ac-pose-end':'')));
    if(labels){wrap.append(node('span','ac-frame-count',String(a.id).padStart(2,'0')+' / '+a.shotZh));if(a.fresh)wrap.append(node('span','ac-new','新增'));const cap=node('div','ac-art-caption');cap.append(node('span','ac-phase-start','01 起始'),node('span','ac-phase-end','02 完成'),node('span','','兩格示意 ↗'));wrap.append(cap);}
    if(immediate)queueMicrotask(()=>loadArt(wrap));else lazy.observe(wrap);return wrap;
  }
  function syncCardButtons(){document.querySelectorAll('[data-add]').forEach(b=>{const n=selected.filter(v=>v.id===Number(b.dataset.add)).length;b.textContent=n?`＋ 再加一鏡 · ${n}`:'＋ 加入';b.disabled=selected.length>=L.MAX;});$('ac-dialog-add').disabled=selected.length>=L.MAX;}
  function renderGallery(){
    $('ac-grid').querySelectorAll('.ac-art').forEach(el=>lazy.unobserve(el));const matches=L.filterActions({search:$('ac-search').value,kind,stage:$('ac-stage').value,shot:$('ac-shot').value});
    const grid=$('ac-grid');grid.replaceChildren();$('ac-empty').hidden=!!matches.length;$('ac-result-count').textContent=`${matches.length} / ${L.ACTIONS.length} 張`;
    for(const a of matches){
      const card=node('article','ac-card');card.dataset.action=a.id;const visual=button('','ac-art-button',()=>openPreview(a),`預覽 ${a.zh}`);visual.append(art(a));
      const info=node('div','ac-card-info'),meta=node('div','ac-card-top');meta.append(node('span','',L.KINDS[a.kind]),node('span','',a.cat.includes('open')?'開場':a.cat.includes('end')?'收尾':'過程'));
      info.append(meta,node('h2','',a.zh),node('p','ac-card-description',a.cues.join(' → ')));
      const bottom=node('div','ac-card-bottom'),add=button('＋ 加入','ac-add',()=>addAction(a.id),`加入 ${a.zh}`);add.dataset.add=a.id;bottom.append(node('span','',`建議 ${a.duration} 秒`),add);info.append(bottom);card.append(visual,info);
      card.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!reduced.matches)card.classList.add('is-playing');});card.addEventListener('pointerleave',()=>card.classList.remove('is-playing'));visual.addEventListener('focus',()=>{if(!reduced.matches)card.classList.add('is-playing');});visual.addEventListener('blur',()=>card.classList.remove('is-playing'));grid.append(card);
    }
    syncCardButtons();updateImageStatus();document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===kind)));
  }
  function addAction(id){if(selected.length>=L.MAX){notify('一個專案最多 12 鏡，請先移除或匯出目前分鏡。');return;}const a=L.BY_ID.get(id);selected.push({id,duration:a.duration,camera:'front'});renderSequence();notify(`已加入「${a.zh}」，目前 ${selected.length} 鏡`);}
  function updateSummary(){const count=selected.length;for(const id of ['ac-send','ac-generate','ac-save-project'])$(id).disabled=!count||busy;$('ac-clear').disabled=!count;$('ac-count').textContent=`${count} / ${L.MAX}`;$('ac-jump-count').textContent=count;$('ac-total').textContent=L.total(selected).toFixed(1);syncCardButtons();persist();if(!$('ac-output').hidden&&outputMode==='sequence')renderPrompt();}
  function renderSequence(){
    const list=$('ac-sequence-list'),scroll=list.scrollTop;list.replaceChildren();
    if(!selected.length){const empty=node('div','ac-sequence-placeholder');empty.append(node('b','','先選一個開場動作'),node('span','','點卡片下方「＋ 加入」，開始編排。'));list.append(empty);}
    let elapsed=0;
    selected.forEach((item,i)=>{
      const a=L.BY_ID.get(item.id),row=node('div','ac-seq-item'),top=node('div','ac-seq-top'),title=node('div','ac-seq-title');title.append(node('small','',`${String(i+1).padStart(2,'0')} / ${elapsed.toFixed(1)}–${(elapsed+item.duration).toFixed(1)}s`),node('strong','',a.zh));elapsed+=item.duration;
      const remove=button('×','ac-icon-button',()=>{selected.splice(i,1);renderSequence();},`移除第 ${i+1} 鏡 ${a.zh}`);top.append(art(a,{labels:false,end:true,immediate:true}),title,remove);
      const controls=node('div','ac-seq-controls'),label=node('label','','秒數'),duration=node('input');duration.type='number';duration.min='.5';duration.max='30';duration.step='.5';duration.value=item.duration;duration.setAttribute('aria-label',`第 ${i+1} 鏡秒數`);duration.addEventListener('change',()=>{if(!duration.value||!duration.validity.valid){duration.value=item.duration;notify('秒數請設為 0.5–30 秒，以 0.5 秒為單位。');return;}item.duration=Number(duration.value);renderSequence();});label.append(duration);
      duration.addEventListener('input',()=>{if(!duration.value||!duration.validity.valid)return;item.duration=Number(duration.value);let cursor=0;list.querySelectorAll('.ac-seq-title small').forEach((title,j)=>{const end=cursor+selected[j].duration;title.textContent=`${String(j+1).padStart(2,'0')} / ${cursor.toFixed(1)}–${end.toFixed(1)}s`;cursor=end;});updateSummary();});
      const camera=node('select');camera.setAttribute('aria-label',`第 ${i+1} 鏡運鏡`);for(const [value,text] of Object.entries(S.CAM_LABELS)){const opt=node('option','',text);opt.value=value;camera.append(opt);}camera.value=item.camera;camera.addEventListener('change',()=>{item.camera=camera.value;updateSummary();});
      const earlier=button('↑','ac-icon-button',()=>move(i,-1),`第 ${i+1} 鏡往前移`),later=button('↓','ac-icon-button',()=>move(i,1),`第 ${i+1} 鏡往後移`);earlier.disabled=i===0;later.disabled=i===selected.length-1;controls.append(label,camera,earlier,later);row.append(top,controls);list.append(row);
    });list.scrollTop=scroll;updateSummary();
  }
  function move(i,delta){const j=i+delta;if(j<0||j>=selected.length)return;[selected[i],selected[j]]=[selected[j],selected[i]];renderSequence();notify(`已移到第 ${j+1} 鏡`);}
  function stopModal(){clearInterval(modalTimer);modalPlaying=false;$('ac-dialog-play').textContent='播放兩格示意';$('ac-dialog-play').setAttribute('aria-pressed','false');}
  function showStep(step){modalStep=step;$('ac-dialog-art').firstElementChild.dataset.step=step;$('ac-step-start').setAttribute('aria-pressed',String(step===0));$('ac-step-end').setAttribute('aria-pressed',String(step===1));$('ac-dialog-cue').textContent=modalAction.cues[step];}
  function openPreview(a){stopModal();document.querySelectorAll(`.ac-grid .ac-art[data-action="${a.id}"][data-failed=true]`).forEach(loadArt);modalAction=a;$('ac-dialog-title').textContent=a.zh;$('ac-dialog-meta').textContent=`${String(a.id).padStart(2,'0')} / ${L.KINDS[a.kind]} · ${a.shotZh} · 建議 ${a.duration} 秒`;$('ac-dialog-description').textContent=a.cues.join('，接著')+'。';$('ac-dialog-art').replaceChildren(art(a,{labels:false,immediate:true,full:true}));showStep(0);$('ac-dialog').showModal();$('ac-dialog').scrollTop=0;}
  $('ac-retry-images').addEventListener('click',()=>document.querySelectorAll('.ac-art[data-failed=true]').forEach(loadArt));
  addEventListener('online',()=>document.querySelectorAll('.ac-art[data-failed=true]').forEach(loadArt));
  $('ac-dialog-retry').addEventListener('click',()=>{const image=$('ac-dialog-art').firstElementChild;if(image)loadArt(image);});
  $('ac-dialog-close').addEventListener('click',()=>$('ac-dialog').close());$('ac-dialog').addEventListener('close',stopModal);
  $('ac-step-start').addEventListener('click',()=>{stopModal();showStep(0);});$('ac-step-end').addEventListener('click',()=>{stopModal();showStep(1);});
  $('ac-dialog-play').addEventListener('click',()=>{if(modalPlaying){stopModal();return;}modalPlaying=true;$('ac-dialog-play').textContent='暫停示意';$('ac-dialog-play').setAttribute('aria-pressed','true');showStep(1-modalStep);modalTimer=setInterval(()=>showStep(1-modalStep),1400);});$('ac-dialog-add').addEventListener('click',()=>addAction(modalAction.id));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopModal();document.querySelectorAll('.ac-card.is-playing').forEach(c=>c.classList.remove('is-playing'));}});
  for(const [k,text] of Object.entries(L.KINDS)){const b=button(k==='new'?`${text} 6`:text,'',()=>{kind=k;renderGallery();});b.dataset.kind=k;b.setAttribute('aria-pressed',String(k==='all'));$('ac-kind-filters').append(b);}
  for(const id of ['ac-search','ac-stage','ac-shot'])$(id).addEventListener(id==='ac-search'?'input':'change',renderGallery);
  function resetFilters(){kind='all';$('ac-search').value='';$('ac-stage').value=$('ac-shot').value='all';renderGallery();}
  $('ac-filter-reset').addEventListener('click',resetFilters);$('ac-empty-reset').addEventListener('click',resetFilters);$('ac-clear').addEventListener('click',()=>{selected=[];renderSequence();});
  $('ac-library-count').textContent=`${L.ACTIONS.length} 張動作卡`;
  fields.forEach(k=>$('ac-'+k).addEventListener('input',()=>{persist();if(!$('ac-output').hidden&&outputMode==='sequence')renderPrompt();}));
  $('ac-recommend').addEventListener('click',()=>{const reco=L.recommend({style:$('ac-style').value,tempo:$('ac-tempo').value,shot:$('ac-reco-shot').value});if(selected.length+reco.length>L.MAX){notify('這組需要 4 鏡，請先保留足夠空間。');return;}selected.push(...reco);renderSequence();notify('已依所選風格加入 4 個動作');});
  $('ac-quality-preset').addEventListener('change',()=>{if($('ac-quality-preset').value){$('ac-quality').value=$('ac-quality-preset').value;persist();}});
  $('ac-character-preset').addEventListener('click',()=>{$('ac-character').value='金色短髮、紫灰眼睛，黑色細髮箍與紅綠小花飾、愛心耳環。白色短袖襯衫與紅蝴蝶結、黑色百褶裙、白色長襪、棕色樂福鞋。眉毛被不透明瀏海遮住，不穿透頭髮。全片維持同一人物比例與服裝。';persist();notify('已帶入示範角色設定');});
  const materialKeys={quality:'quality',scene:'scene',char:'character',prop:'props'};
  function getSets(){try{const v=JSON.parse(localStorage.getItem('grok_mat_sets')||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
  function listSets(){const select=$('ac-material-select');select.replaceChildren(new Option('選擇素材組…',''));Object.keys(getSets()).forEach(name=>select.add(new Option(name,name)));}
  $('ac-material-save').addEventListener('click',()=>{const name=$('ac-material-name').value.trim();if(!name){notify('請先填寫素材組名稱。');$('ac-material-name').focus();return;}const sets=getSets();Object.defineProperty(sets,name,{value:Object.fromEntries(Object.entries(materialKeys).map(([key,id])=>[key,$('ac-'+id).value])),enumerable:true,writable:true,configurable:true});try{localStorage.setItem('grok_mat_sets',JSON.stringify(sets));listSets();$('ac-material-select').value=name;notify('素材組已儲存在此瀏覽器');}catch{notify('瀏覽器無法儲存，請複製指令留存。');}});
  $('ac-material-select').addEventListener('change',()=>{const value=getSets()[$('ac-material-select').value];if(!value)return;for(const [key,id] of Object.entries(materialKeys))$('ac-'+id).value=typeof value[key]==='string'?value[key]:'';persist();});
  $('ac-upload').addEventListener('click',()=>$('ac-image-input').click());
  $('ac-image-input').addEventListener('change',async()=>{const token=++uploadToken,f=$('ac-image-input').files[0];$('ac-image-input').value='';if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>12*1024*1024){notify('請使用 12 MB 以內的 JPG、PNG 或 WebP。');return;}const url=URL.createObjectURL(f);try{const img=new Image();img.src=url;await img.decode();if(token!==uploadToken){URL.revokeObjectURL(url);return;}if(uploadURL)URL.revokeObjectURL(uploadURL);uploadURL=url;$('ac-reference').src=url;$('ac-reference').hidden=false;$('ac-remove-image').hidden=false;notify('已載入參考圖；可依圖片填寫角色與場景。');}catch{URL.revokeObjectURL(url);notify('無法讀取圖片，請換一個檔案。');}});
  $('ac-remove-image').addEventListener('click',()=>{++uploadToken;URL.revokeObjectURL(uploadURL);uploadURL='';$('ac-reference').removeAttribute('src');$('ac-reference').hidden=true;$('ac-remove-image').hidden=true;});
  function renderPrompt(){$('ac-output-title').textContent='影片指令';$('ac-prompt').textContent=L.prompt(selected,settings(),$('ac-language').value);}
  function openOutput(mode='sequence'){outputMode=mode;$('ac-output').hidden=false;if(mode==='sequence')renderPrompt();$('ac-output').scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'start'});}
  $('ac-generate').addEventListener('click',()=>openOutput());$('ac-language').addEventListener('change',()=>{outputMode='sequence';renderPrompt();});
  $('ac-image-prompt').addEventListener('click',()=>{openOutput('image');$('ac-output-title').textContent='看圖描述指令';$('ac-prompt').textContent='請觀察我另外上傳的參考圖，只描述圖中可見資訊，不要猜測身分。請依序輸出四段可用於影片製作的文字：\n\n【畫面質感】色調、材質、光線與風格。\n【場景】位置、背景與光源。\n【角色特徵】髮型、五官、服裝與需保持一致的細節。\n【道具與限制】可見道具及動作注意事項。\n\n沒有看見的資訊請省略。';});
  async function copy(text){try{await navigator.clipboard.writeText(text);notify('已複製');}catch{$('ac-prompt').textContent=text;$('ac-output').hidden=false;const r=document.createRange();r.selectNodeContents($('ac-prompt'));const selection=getSelection();selection.removeAllRanges();selection.addRange(r);notify('已選取文字，請按 Ctrl/Cmd + C 複製。');}}
  $('ac-copy').addEventListener('click',()=>copy($('ac-prompt').textContent));$('ac-copy-gpt').addEventListener('click',()=>copy('請優化以下影片指令的表達，保留鏡頭順序、時長、動作、角色與產品設定。不要添加未提供的效果宣稱，直接輸出完整指令：\n\n'+$('ac-prompt').textContent));
  function beat(){const bpm=Math.max(40,Math.min(220,Number($('ac-bpm').value)||110)),beats=Number($('ac-beats').value)||2;return {bpm,beats,seconds:60/bpm*beats};}
  function beatInfo(){const b=beat();$('ac-beat-info').textContent=`每 ${b.beats} 拍約 ${b.seconds.toFixed(2)} 秒；套用後以 0.5 秒為單位取整。`;}
  for(const id of ['ac-bpm','ac-beats'])$(id).addEventListener('input',beatInfo);
  $('ac-music-preset').addEventListener('change',()=>{const select=$('ac-music-preset');if(!select.value)return;$('ac-bpm').value=select.value;$('ac-music').value=select.selectedOptions[0].textContent;beatInfo();persist();});
  $('ac-apply-beat').addEventListener('click',()=>{if(!selected.length){notify('請先加入動作。');return;}const seconds=Math.max(.5,Math.round(beat().seconds*2)/2);selected.forEach(s=>s.duration=seconds);renderSequence();notify(`全部分鏡已設為 ${seconds} 秒，可逐鏡微調。`);});
  async function buildProject(){
    // Crop the selected reference pose locally for portable storyboard JSON.
    const snapshot=selected.map(v=>({...v})),config=settings(),images={};
    await Promise.all([...new Set(snapshot.map(v=>v.id))].map(async id=>{const a=L.BY_ID.get(id),img=await getImage(a.atlas),w=img.naturalWidth/4,h=img.naturalHeight/2,canvas=document.createElement('canvas');canvas.width=Math.round(w);canvas.height=Math.round(h);canvas.getContext('2d').drawImage(img,a.column*w,h,w,h,0,0,w,h);images[id]=canvas.toDataURL('image/jpeg',.88);}));
    const project=L.makeProject(snapshot,config,images);return S.parseProject(JSON.stringify(project));
  }
  function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function deliver(mode){if(busy||!selected.length)return;busy=true;updateSummary();$('ac-send').textContent='正在整理圖片…';try{const project=await buildProject(),raw=JSON.stringify(project);if(mode==='download'){download(raw,'action-storyboard.json');notify('專案已下載，可由分鏡工作台開啟');}else{try{sessionStorage.setItem(L.HANDOFF,raw);}catch{download(raw,'action-storyboard.json');notify('瀏覽器無法直接傳遞，已下載專案，請在工作台開啟。');return;}persist();location.href='ad-storyboard.html?from=actions';}}catch(error){notify(error.message||'無法整理分鏡，請再試一次。');}finally{busy=false;$('ac-send').textContent='送到廣告分鏡工作台 ↗';updateSummary();}}
  $('ac-send').addEventListener('click',()=>deliver('send'));$('ac-save-project').addEventListener('click',()=>deliver('download'));
  listSets();beatInfo();renderGallery();renderSequence();
})();
