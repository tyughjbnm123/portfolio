(() => {
  'use strict';
  if(!globalThis.Storyboard||!globalThis.StoryboardData){const warning=document.createElement('p');warning.className='sb-warnings';warning.setAttribute('role','alert');warning.textContent='分鏡工具未能載入，請重新整理頁面；若持續出現，請聯絡網站維護者。';document.querySelector('main').prepend(warning);document.querySelectorAll('main button,main input,main select,main textarea').forEach(el=>el.disabled=true);document.querySelector('.sb-workspace').hidden=true;return;}
  const S=globalThis.Storyboard,D=S.D,$=id=>document.getElementById(id),all=q=>Array.from(document.querySelectorAll(q));
  let project=S.demo(),selected=project.shots[0].id,filter='all',playing=false,elapsed=0,started=0,raf=0,toastTimer,dragId=null,imageTarget=null,imageBusy=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const current=()=>project.shots.find(s=>s.id===selected)||project.shots[0];
  const index=()=>project.shots.findIndex(s=>s.id===selected);
  const time=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;
  const pad=n=>String(n).padStart(2,'0');
  const notify=text=>{clearTimeout(toastTimer);$('sb-toast').textContent=text;$('sb-toast').classList.add('is-visible');toastTimer=setTimeout(()=>$('sb-toast').classList.remove('is-visible'),3500);};
  function options(id,values){for(const [value,label] of Object.entries(values)){const opt=node('option','',label);opt.value=value;$(id).append(opt);}}
  options('sb-shot-stage',S.STAGES);options('sb-shot-frame',S.FRAME_LABELS);options('sb-shot-camera',S.CAM_LABELS);
  for(const [value,label] of Object.entries(D.EXPR_LABEL_ZH)){const b=node('button','',label);b.type='button';b.dataset.expression=value;b.addEventListener('click',()=>{stop();const s=current();s.expression=value;s.aus=S.aus(value,s.intensity);syncForm();render();});$('sb-expression-presets').append(b);}
  const auLabels={AU6:'臉頰上抬',AU12:'嘴角上揚'};
  const orderedAUs=['AU12','AU6','AU1','AU4','AU5','AU26',...D.AU_ORDER.filter(k=>!['AU12','AU6','AU1','AU4','AU5','AU26'].includes(k))];
  for(const au of orderedAUs){
    const row=node('div','sb-au-row'),label=node('label'),name=node('span','',auLabels[au]||D.AU_INFO[au].name),small=node('small','',au),out=node('output','', '0.0'),range=node('input');
    label.htmlFor='sb-au-'+au;name.append(small);out.id='sb-au-value-'+au;out.setAttribute('for','sb-au-'+au);label.append(name,out);range.id='sb-au-'+au;range.type='range';range.min='0';range.max='4';range.step='.1';range.dataset.au=au;
    range.addEventListener('input',()=>{stop();const s=current();s.aus[au]=Number(range.value);s.expression='custom';render();});row.append(label,range);$('sb-au-list').append(row);
  }
  function tab(name,focus=false){all('[data-panel]').forEach(b=>{const active=b.dataset.panel===name;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$(b.getAttribute('aria-controls')).hidden=!active;if(active&&focus)b.focus();});}
  all('[data-panel]').forEach(b=>{b.addEventListener('click',()=>tab(b.dataset.panel));b.addEventListener('keydown',e=>{const tabs=all('[data-panel]'),i=tabs.indexOf(b),next={ArrowLeft:(i+2)%3,ArrowRight:(i+1)%3,Home:0,End:2}[e.key];if(next!==undefined){e.preventDefault();tab(tabs[next].dataset.panel,true);}});});
  function syncForm(){
    const s=current();all('[data-project]').forEach(el=>el.value=project[el.dataset.project]);all('[data-shot]').forEach(el=>el.value=s[el.dataset.shot]);
    all('[data-au]').forEach(el=>el.value=s.aus[el.dataset.au]);$('sb-intensity').value=s.intensity;
  }
  function choose(id,focus=false){if(!project.shots.some(s=>s.id===id))return;stop();selected=id;elapsed=S.timeline(project)[index()].start;syncForm();render();if(focus)$('sb-shot-list').querySelector(`[data-id="${id}"]`)?.focus();}
  function shotList(){
    const list=$('sb-shot-list'),scrollTop=list.scrollTop,scrollLeft=list.scrollLeft;list.replaceChildren();
    const rows=S.timeline(project);
    project.shots.forEach((s,i)=>{
      const b=node('button','sb-shot-card');b.type='button';b.dataset.id=s.id;b.draggable=true;b.setAttribute('aria-pressed',String(s.id===selected));b.setAttribute('aria-label',`編輯第 ${i+1} 鏡 ${s.name}，${s.duration} 秒`);
      const thumb=node('div','sb-shot-thumb'),img=node('img');img.src=s.image;img.alt='';img.draggable=false;img.style.objectFit='contain';thumb.append(img,node('span','',pad(i+1)),node('span','',`${s.duration.toFixed(1)}s`));
      const info=node('div','sb-shot-card-info');info.append(node('strong','',s.name||'未命名分鏡'),node('small','',`${rows[i].start.toFixed(1)}–${rows[i].end.toFixed(1)}s · ${S.STAGES[s.stage]}`));b.append(thumb,info);
      b.addEventListener('click',()=>choose(s.id,true));b.addEventListener('dragstart',e=>{stop();dragId=s.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',s.id);});
      b.addEventListener('dragover',e=>{if(dragId&&dragId!==s.id){e.preventDefault();e.dataTransfer.dropEffect='move';b.classList.add('is-drag-over');}});
      b.addEventListener('dragleave',()=>b.classList.remove('is-drag-over'));
      b.addEventListener('drop',e=>{e.preventDefault();const from=project.shots.findIndex(v=>v.id===dragId),to=project.shots.findIndex(v=>v.id===s.id);if(from>=0&&to>=0&&from!==to){const [moved]=project.shots.splice(from,1);project.shots.splice(to,0,moved);choose(moved.id,true);notify('分鏡順序已更新');}dragId=null;});
      b.addEventListener('dragend',()=>{dragId=null;all('.is-drag-over').forEach(el=>el.classList.remove('is-drag-over'));});list.append(b);
    });list.scrollTop=scrollTop;list.scrollLeft=scrollLeft;
    $('sb-shot-count').textContent=pad(project.shots.length);$('sb-add').disabled=$('sb-duplicate').disabled=project.shots.length>=S.MAX_SHOTS;$('sb-delete').disabled=project.shots.length<=1;
    $('sb-move-back').disabled=$('sb-prev').disabled=index()===0;$('sb-move-forward').disabled=$('sb-next').disabled=index()===project.shots.length-1;
  }
  function timeline(){
    const track=$('sb-timeline');track.replaceChildren();project.shots.forEach((s,i)=>{const b=node('button','sb-time-block');b.type='button';b.style.flex=s.duration+' 1 0%';b.setAttribute('aria-pressed',String(s.id===selected));b.setAttribute('aria-label',`跳至第 ${i+1} 鏡，${s.duration} 秒`);b.append(node('span','',pad(i+1)),node('small','',`${s.duration.toFixed(1)}s`));b.addEventListener('click',()=>choose(s.id));track.append(b);});
    const duration=S.total(project);$('sb-total-duration').textContent=duration.toFixed(1)+' 秒';$('sb-total-shots').textContent=project.shots.length+' 個分鏡';$('sb-duration-status').textContent=`實際 ${duration.toFixed(1)} 秒 / 目標 ${project.target} 秒`;$('sb-duration-status').dataset.warning=String(duration!==project.target);$('sb-scrubber').max=duration;
  }
  function paintProgress(){
    const duration=S.total(project),s=current(),row=S.timeline(project)[index()],progress=Math.max(0,Math.min(1,(elapsed-row.start)/s.duration));
    $('sb-scrubber').value=elapsed;$('sb-playhead').style.left=`${duration?elapsed/duration*100:0}%`;$('sb-transport-time').textContent=`${time(elapsed)} / ${time(duration)}`;$('sb-frame-time').textContent=time(elapsed);
    let scale=s.zoom,x=0,y=0;
    if(s.imageFit==='contain')scale=1;
    else if(!reduced.matches){if(s.camera==='pushPull')scale*=1+.08*progress;if(s.camera==='orbit'||s.camera==='side'){scale*=1.06;x=(progress-.5)*3;}if(s.camera==='lowAngle'||s.camera==='highAngle'){scale*=1.06;y=(progress-.5)*3*(s.camera==='lowAngle'?-1:1);}}
    $('sb-stage-image').style.transform=`translate(${x}%,${y}%) scale(${scale})`;
  }
  function preview(){
    const s=current(),img=$('sb-stage-image');
    if(img.getAttribute('src')!==s.image){$('sb-image-error').hidden=true;img.hidden=false;img.src=s.image;}
    img.alt=s.imageLabel;img.style.objectFit=s.imageFit;img.style.objectPosition=s.imageFit==='contain'?'50% 50%':`${s.focusX}% ${s.focusY}%`;img.style.transformOrigin=`${s.focusX}% ${s.focusY}%`;
    for(const id of ['sb-shot-zoom','sb-shot-focusX','sb-shot-focusY'])$(id).disabled=s.imageFit==='contain';
    $('sb-stage-shell').dataset.ratio=project.ratio;$('sb-preview-info').textContent=`SHOT ${pad(index()+1)} / ${pad(project.shots.length)}`;$('sb-stage-number').textContent=pad(index()+1);
    $('sb-stage-frame').textContent=`${S.FRAME_LABELS[s.frame]} / ${S.CAM_LABELS[s.camera]}`;$('sb-stage-caption').textContent=s.caption;
    $('sb-action-cue').textContent=S.actionText(s);$('sb-expression-cue').textContent=S.expressionText(s);
    $('sb-edit-number').textContent=`SHOT ${pad(index()+1)} / ${pad(project.shots.length)}`;$('sb-edit-title').textContent=s.name||'未命名分鏡';$('sb-zoom-value').textContent=s.zoom.toFixed(2)+'×';$('sb-image-name').textContent=s.imageLabel;$('sb-image-name').title=s.imageLabel;
    paintProgress();
    requestAnimationFrame(imageInfo);
  }
  function imageInfo(){const box=$('sb-stage').getBoundingClientRect(),img=$('sb-stage-image'),size={'16:9':'1920 × 1080','9:16':'1080 × 1920','1:1':'1080 × 1080'}[project.ratio];$('sb-preview-size').textContent=`預覽 ${Math.round(box.width)} × ${Math.round(box.height)} px · ${project.ratio}`;$('sb-image-size-help').textContent=`建議素材 ${size} px。${img.naturalWidth?'原圖 '+img.naturalWidth+' × '+img.naturalHeight+' px。':''}${current().imageFit==='contain'?'完整顯示保留全圖，預演時不做放大或位移。':'填滿畫面會依比例、位置與放大程度裁切。'}`;}
  function actionList(){
    const s=current(),search=$('sb-action-search').value.trim().toLowerCase(),list=$('sb-action-list'),scroll=list.scrollTop;list.replaceChildren();
    const matches=D.ACTIONS.filter(a=>(filter==='all'||a.cat.includes(filter))&&(!search||`${a.zh} ${a.en}`.toLowerCase().includes(search)));
    for(const a of matches){const b=node('button','sb-action-card');b.type='button';b.dataset.action=a.id;b.setAttribute('aria-pressed',String(s.actionId===a.id));b.append(node('span','',`${pad(a.id)} / ${a.shotZh}`),node('strong','',a.zh));b.addEventListener('click',()=>{stop();current().actionId=a.id;render();$('sb-action-list').querySelector(`[data-action="${a.id}"]`)?.focus();});list.append(b);}
    list.scrollTop=scroll;$('sb-action-empty').hidden=matches.length>0;$('sb-current-action').textContent=S.actionText(s);
    all('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
  }
  function expression(){const s=current();all('[data-expression]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.expression===s.expression)));$('sb-intensity').disabled=s.expression==='custom';$('sb-intensity-label').textContent=s.expression==='custom'?'自訂 AU':s.intensity<.8?'輕微':s.intensity>1.2?'明顯':'自然';$('sb-expression-title').textContent=s.expression==='custom'?'自訂表情':D.EXPR_LABEL_ZH[s.expression];$('sb-expression-text').textContent=S.expressionText(s);all('[data-au]').forEach(el=>$('sb-au-value-'+el.dataset.au).textContent=s.aus[el.dataset.au].toFixed(1));}
  function output(){
    $('sb-script').textContent=S.script(project);const warnings=S.warnings(project);$('sb-warnings').replaceChildren(...warnings.map(t=>node('p','',t)));$('sb-warnings').hidden=!warnings.length;
    const box=$('sb-script-summary'),scroll=box.scrollLeft;box.replaceChildren();const rows=S.timeline(project);
    project.shots.forEach((s,i)=>{const b=node('button','sb-script-tile');b.type='button';b.setAttribute('aria-pressed',String(s.id===selected));b.append(node('small','',`${pad(i+1)} / ${rows[i].start.toFixed(1)}–${rows[i].end.toFixed(1)}s`),node('strong','',s.name||'未命名分鏡'),node('p','',s.description||'尚未填寫畫面描述'));b.addEventListener('click',()=>{choose(s.id);$('sb-stage-shell').scrollIntoView({block:'center',behavior:reduced.matches?'auto':'smooth'});});box.append(b);});box.scrollLeft=scroll;
  }
  function render(){shotList();timeline();preview();actionList();expression();output();}
  function stop(){playing=false;cancelAnimationFrame(raf);$('sb-play').replaceChildren(document.createTextNode('▶ '),node('span','','播放分鏡'));$('sb-play').setAttribute('aria-label','播放分鏡');}
  function tick(now){
    if(!playing)return;elapsed=Math.min(S.total(project),(now-started)/1000);const s=project.shots[S.atTime(project,elapsed)];
    if(s.id!==selected){selected=s.id;syncForm();render();}else paintProgress();
    if(elapsed>=S.total(project)){stop();return;}raf=requestAnimationFrame(tick);
  }
  $('sb-play').addEventListener('click',()=>{if(playing){stop();return;}if(elapsed>=S.total(project))elapsed=0;selected=project.shots[S.atTime(project,elapsed)].id;syncForm();render();playing=true;started=performance.now()-elapsed*1000;$('sb-play').replaceChildren(document.createTextNode('Ⅱ '),node('span','','暫停預演'));$('sb-play').setAttribute('aria-label','暫停分鏡預演');raf=requestAnimationFrame(tick);});
  $('sb-scrubber').addEventListener('input',()=>{stop();elapsed=Number($('sb-scrubber').value);const s=project.shots[S.atTime(project,elapsed)];if(selected!==s.id){selected=s.id;syncForm();render();}else paintProgress();});
  for(const [id,delta] of [['sb-prev',-1],['sb-next',1]])$(id).addEventListener('click',()=>{const s=project.shots[index()+delta];if(s)choose(s.id);});
  all('[data-project]').forEach(el=>el.addEventListener('input',()=>{stop();project[el.dataset.project]=el.dataset.project==='target'?Number(el.value):el.value;render();}));
  all('[data-shot]').forEach(el=>{
    const numeric=['duration','zoom','focusX','focusY'].includes(el.dataset.shot);
    el.addEventListener('input',()=>{stop();if(numeric&&(!el.value||!el.validity.valid))return;current()[el.dataset.shot]=numeric?Number(el.value):el.value;if(el.dataset.shot==='frame'){current().zoom={wide:1,medium:1.05,close:1.35,detail:1.65}[el.value];$('sb-shot-zoom').value=current().zoom;}elapsed=S.timeline(project)[index()].start;render();});
    if(numeric)el.addEventListener('change',()=>{if(!el.value||!el.validity.valid){el.value=current()[el.dataset.shot];notify('秒數請設為 0.5–30 秒，以 0.5 秒為單位。');}});
  });
  $('sb-intensity').addEventListener('input',()=>{stop();const s=current();s.intensity=Number($('sb-intensity').value);s.aus=S.aus(s.expression,s.intensity);all('[data-au]').forEach(el=>el.value=s.aus[el.dataset.au]);render();});
  $('sb-action-search').addEventListener('input',actionList);all('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;actionList();}));
  $('sb-clear-action').addEventListener('click',()=>{stop();current().actionId=0;render();});
  function fitsProject(shot){if(JSON.stringify(project).length+JSON.stringify(shot).length>28000000){notify('專案圖片已接近容量上限，請先縮小圖片再新增分鏡。');return false;}return true;}
  $('sb-add').addEventListener('click',()=>{if(project.shots.length>=S.MAX_SHOTS)return;const s=S.shot({image:current().image,imageLabel:current().imageLabel});if(!fitsProject(s))return;project.shots.splice(index()+1,0,s);choose(s.id);tab('scene');$('sb-shot-name').focus();$('sb-shot-name').select();notify('已新增分鏡');});
  $('sb-duplicate').addEventListener('click',()=>{if(project.shots.length>=S.MAX_SHOTS)return;const s=S.shot({...structuredClone(current()),id:S.shot().id,name:current().name+'（副本）'});if(!fitsProject(s))return;project.shots.splice(index()+1,0,s);choose(s.id);notify('已複製這一鏡');});
  $('sb-delete').addEventListener('click',()=>{if(project.shots.length<=1)return;const i=index();project.shots.splice(i,1);choose(project.shots[Math.min(i,project.shots.length-1)].id,true);notify('分鏡已刪除');});
  for(const [id,delta] of [['sb-move-back',-1],['sb-move-forward',1]])$(id).addEventListener('click',()=>{stop();if(S.move(project,selected,delta)){choose(selected);notify(`已移至第 ${index()+1} 鏡`);}});
  $('sb-brief-toggle').addEventListener('click',()=>{const open=$('sb-brief-fields').hidden;$('sb-brief-fields').hidden=!open;$('sb-brief-toggle').setAttribute('aria-expanded',String(open));$('sb-brief-toggle').textContent=open?'收起設定 −':'企劃設定 ＋';});
  function download(text,name,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function copy(text){let success=false;try{await navigator.clipboard.writeText(text);success=true;}catch{const t=node('textarea');t.value=text;t.style.position='fixed';t.style.top='-9999px';document.body.append(t);t.select();try{success=document.execCommand('copy');}catch{}finally{t.remove();}}if(success)notify('分鏡指令已複製');else{$('sb-script').parentElement.open=true;$('sb-script').textContent=text;const r=document.createRange();r.selectNodeContents($('sb-script'));const sel=getSelection();sel.removeAllRanges();sel.addRange(r);notify('已選取文字，請按 Ctrl/Cmd + C 複製');}}
  $('sb-copy-shot').addEventListener('click',()=>copy(S.prompt(project,current())));$('sb-copy-all').addEventListener('click',()=>copy(S.script(project)));
  $('sb-download-script').addEventListener('click',()=>{download(S.script(project),'ad-storyboard.txt','text/plain;charset=utf-8');notify('分鏡稿已準備下載');});
  $('sb-save').addEventListener('click',()=>{download(JSON.stringify(project,null,2),'ad-storyboard-project.json','application/json;charset=utf-8');notify('專案已準備下載，可在此工作台重新開啟');});
  $('sb-import').addEventListener('click',()=>$('sb-project-file').click());
  $('sb-project-file').addEventListener('change',async()=>{const input=$('sb-project-file'),file=input.files[0];input.value='';if(!file)return;try{if(file.size>30000000)throw Error('請選擇 30 MB 以內的專案檔。');const next=S.parseProject(await file.text());stop();project=next;selected=project.shots[0].id;elapsed=0;syncForm();render();notify('專案已開啟');}catch(error){notify(error.message||'專案檔無法開啟，請確認格式。');}});
  function openImagePicker(){
    if(imageBusy)return;
    stop();imageTarget=current();$('sb-image-file').click();
  }
  $('sb-choose-image').addEventListener('click',openImagePicker);
  $('sb-upload-preview').addEventListener('click',openImagePicker);
  function setImageBusy(busy){
    imageBusy=busy;
    $('sb-choose-image').disabled=$('sb-upload-preview').disabled=busy;
    $('sb-image-dropzone').setAttribute('aria-busy',String(busy));
    $('sb-upload-label').textContent=busy?'正在讀取圖片…':'上傳這一鏡的圖片';
  }
  async function uploadImage(file,target){
    if(!file)return;
    if(imageBusy){notify('圖片仍在讀取，請稍候再上傳。');return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){notify('請使用 5 MB 以內的 JPEG、PNG 或 WebP 圖片。');return;}
    stop();setImageBusy(true);
    try{
      const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
      const image=new Image();image.src=data;await image.decode();
      if(!S.validImage(data))throw Error('invalid image');
      const draftSize=JSON.stringify(project).length-target.image.length+data.length;if(draftSize>28000000){notify('此專案圖片總量已接近上限，請先縮小圖片。');return;}
      if(!project.shots.includes(target)){notify('原分鏡已移除，請重新選擇圖片。');return;}
      stop();target.image=data;target.imageLabel=file.name;target.imageFit='contain';target.focusX=50;target.focusY=50;target.zoom=1;syncForm();render();notify(`第 ${project.shots.indexOf(target)+1} 鏡的圖片已更新，先以完整圖片顯示`);
    }catch{notify('圖片無法讀取，請換一個檔案。');}
    finally{setImageBusy(false);}
  }
  $('sb-image-file').addEventListener('change',()=>{
    const input=$('sb-image-file'),file=input.files[0],target=imageTarget||current();
    imageTarget=null;input.value='';uploadImage(file,target);
  });
  const isFileDrag=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  for(const id of ['sb-stage-shell','sb-image-dropzone']){
    const zone=$(id);
    zone.addEventListener('dragover',e=>{
      if(!isFileDrag(e))return;
      e.preventDefault();e.dataTransfer.dropEffect=imageBusy?'none':'copy';zone.classList.add('is-file-over');
    });
    zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove('is-file-over');});
    zone.addEventListener('drop',e=>{
      zone.classList.remove('is-file-over');if(!isFileDrag(e))return;
      e.preventDefault();const files=Array.from(e.dataTransfer.files);
      if(files.length!==1){notify('每個分鏡使用一張圖片，請一次上傳一個檔案。');return;}
      uploadImage(files[0],current());
    });
  }
  document.addEventListener('dragover',e=>{if(isFileDrag(e))e.preventDefault();});
  document.addEventListener('drop',e=>{if(isFileDrag(e))e.preventDefault();});
  $('sb-stage-image').addEventListener('error',()=>{$('sb-stage-image').hidden=true;$('sb-image-error').hidden=false;});
  $('sb-stage-image').addEventListener('load',()=>{$('sb-stage-image').hidden=false;$('sb-image-error').hidden=true;imageInfo();});
  new ResizeObserver(imageInfo).observe($('sb-stage'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  syncForm();render();
})();
