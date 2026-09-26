(() => {
  'use strict';
  const V=window.SlideVisualizer,byId=id=>document.getElementById('sv-'+id),key='yichi-slide-visualizer-v1';
  const source=byId('content'),purpose=byId('purpose'),takeaway=byId('takeaway'),title=byId('title'),caption=byId('caption');
  let model,dirty=false,busy=false,saveFailed=false,restoreDraft=null,downloadUrl=null,revision=0;
  try{restoreDraft=V.restore(JSON.parse(localStorage.getItem(key)));}catch{}
  function message(id,text,error=false){const el=byId(id);el.textContent=text;el.dataset.error=String(error);}
  function save(){try{localStorage.setItem(key,JSON.stringify({version:1,source:source.value,purpose:purpose.value,takeaway:takeaway.value,dirty,model}));}catch{if(!saveFailed){message('input-note','此瀏覽器無法保存草稿；仍可使用與下載，關閉前請先匯出。');saveFailed=true;}}}
  function count(){byId('count').textContent=source.value.length+' / 2000';}
  function ready(){return !dirty&&!busy&&model.points.every(p=>p.trim());}
  function exportState(){['copy','svg','png'].forEach(id=>byId(id).disabled=!ready());byId('add').title=model.points.some(p=>!p.trim())?'請先填寫空白重點':'';}
  function clearExport(){message('export-status','');byId('copy-fallback').hidden=true;byId('export-file').hidden=true;if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null;}byId('export-file').removeAttribute('href');}
  function markDirty(){dirty=true;count();byId('result-state').textContent='內容已更動，請重新產生';byId('result-state').dataset.dirty='true';clearExport();exportState();save();}
  [source,purpose,takeaway].forEach(el=>el.addEventListener('input',markDirty));
  function paint(){
    revision++;
    const p=V.purposes[model.purpose];
    const proposals=byId('proposals');proposals.replaceChildren();
    for(let i=0;i<3;i++){
      const button=document.createElement('button');button.type='button';button.className='sv-proposal';button.dataset.proposal=String(i);button.setAttribute('aria-pressed',String(i===model.selected));button.setAttribute('aria-label',p.names[i]+'：'+p.reasons[i]);
      const preview=document.createElement('span');preview.innerHTML=V.render(model,i);const svg=preview.firstElementChild;svg.setAttribute('aria-hidden','true');svg.removeAttribute('aria-label');
      // Each inline SVG owns its marker ID, so previews never reference another palette.
      svg.querySelectorAll('[id]').forEach(el=>el.id+='-thumb-'+i);svg.querySelectorAll('[marker-end]').forEach(el=>el.setAttribute('marker-end',`url(#sv-arrow-thumb-${i})`));
      const copy=document.createElement('span');copy.className='sv-proposal-copy';const heading=document.createElement('strong');heading.textContent=p.names[i];const selected=document.createElement('em');selected.textContent=i===model.selected?'已選擇':'';heading.append(selected);const reason=document.createElement('span');reason.textContent=p.reasons[i];copy.append(heading,reason);button.append(svg,copy);
      button.addEventListener('click',()=>{model.selected=i;clearExport();paint();save();byId('proposals').querySelector(`[data-proposal="${i}"]`).focus({preventScroll:true});});proposals.append(button);
    }
    byId('canvas').innerHTML=V.render(model);byId('canvas').setAttribute('aria-label',V.copyText(model));byId('preview-heading').textContent=p.names[model.selected]+' · 預覽';
    byId('layout-tip').textContent=model.points.some(x=>!x.trim())?'請填寫空白重點，或將它移除，才能下載圖解。':p.tip+(model.points.some(x=>x.length>48)?' 文字較多，精簡後會更容易閱讀。':'');
    document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===model.palette)));
    byId('add').disabled=model.points.length>=6;exportState();
  }
  function editors(focusIndex){
    title.value=model.title;caption.value=model.caption;const parent=byId('points');parent.replaceChildren();
    model.points.forEach((value,i)=>{
      const row=document.createElement('div');row.className='sv-point';const label=document.createElement('label');label.htmlFor='sv-point-'+i;label.textContent=String(i+1).padStart(2,'0');
      const field=document.createElement('input');field.id=label.htmlFor;field.value=value;field.maxLength=96;field.setAttribute('aria-label',`重點 ${i+1}`);field.addEventListener('input',()=>{model.points[i]=field.value;paint();save();clearExport();});
      const actions=document.createElement('div');actions.className='sv-point-actions';
      for(const [name,symbol,disabled,action] of [
        ['上移','↑',i===0,()=>{[model.points[i-1],model.points[i]]=[model.points[i],model.points[i-1]];return i-1;}],
        ['下移','↓',i===model.points.length-1,()=>{[model.points[i+1],model.points[i]]=[model.points[i],model.points[i+1]];return i+1;}],
        ['移除','×',model.points.length<=2,()=>{model.points.splice(i,1);return Math.min(i,model.points.length-1);}]
      ]){const b=document.createElement('button');b.type='button';b.textContent=symbol;b.disabled=disabled;b.setAttribute('aria-label',`${name}重點 ${i+1}`);b.addEventListener('click',()=>{const next=action();paint();editors(next);save();clearExport();});actions.append(b);}
      row.append(label,field,actions);parent.append(row);
    });
    if(Number.isInteger(focusIndex))byId('point-'+focusIndex)?.focus({preventScroll:true});
  }
  function generate(isExample=false){
    try{
      const palette=model?.palette||'sage';model=V.make(source.value,purpose.value,takeaway.value);model.palette=palette;dirty=false;
      byId('result-state').textContent=isExample?'示範內容':'已整理 '+model.points.length+' 個重點';byId('result-state').dataset.dirty='false';
      paint();editors();count();clearExport();message('input-note',isExample?'這是範例。可先切換提案，再貼上自己的內容。':`已整理成 ${model.points.length} 個重點。下方可以修改文字與順序。`);save();
    }catch(error){message('input-note',error.message,true);source.focus();}
  }
  byId('form').addEventListener('submit',e=>{e.preventDefault();generate();});
  byId('example').addEventListener('click',()=>{
    if((dirty||source.value)&&!confirm('套用此目的的範例？目前的內容與圖解修改會被取代。'))return;
    source.value=V.examples[purpose.value].content;takeaway.value=V.examples[purpose.value].takeaway;generate(true);
  });
  title.addEventListener('input',()=>{model.title=title.value;paint();save();clearExport();});
  caption.addEventListener('input',()=>{model.caption=caption.value;paint();save();clearExport();});
  byId('add').addEventListener('click',()=>{if(model.points.length>=6)return;model.points.push('');paint();editors(model.points.length-1);save();clearExport();});
  document.querySelectorAll('[data-palette]').forEach(button=>button.addEventListener('click',()=>{model.palette=button.dataset.palette;paint();save();clearExport();}));
  function download(blob,extension){if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(blob);const a=byId('export-file');a.href=downloadUrl;a.download='簡報圖解-'+V.purposes[model.purpose].label+'.'+extension;a.hidden=false;a.textContent='若未開始下載，點此儲存 '+extension.toUpperCase()+' ↗';a.click();}
  byId('svg').addEventListener('click',()=>{if(!ready())return;download(new Blob([V.render(model)],{type:'image/svg+xml;charset=utf-8'}),'svg');message('export-status','SVG 已準備下載，可縮放並保留向量文字。');});
  byId('png').addEventListener('click',async()=>{
    if(!ready())return;const svg=V.render(model),exportRevision=revision;busy=true;exportState();message('export-status','正在準備 2400 × 1350 圖片…');let url;
    try{url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('圖片轉換失敗'));img.src=url;});
      const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1350;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('此瀏覽器無法建立圖片');ctx.drawImage(img,0,0,2400,1350);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('無法匯出 PNG');if(revision!==exportRevision||dirty){message('export-status','內容已變更，請重新下載最新圖解。');return;}download(blob,'png');message('export-status','PNG 已準備下載，尺寸為 2400 × 1350。');
    }catch(error){message('export-status',error.message+'，請改用 SVG 下載。',true);}finally{if(url)URL.revokeObjectURL(url);busy=false;exportState();}
  });
  byId('copy').addEventListener('click',async()=>{if(!ready())return;const text=V.copyText(model);try{await navigator.clipboard.writeText(text);message('export-status','已複製標題、重點與圖解方式。');}catch{const field=byId('copy-fallback');field.value=text;field.hidden=false;field.focus();field.select();message('export-status','瀏覽器未允許自動複製，請複製下方已選取的文字。');}});
  if(restoreDraft){source.value=restoreDraft.source;purpose.value=restoreDraft.purpose;takeaway.value=restoreDraft.takeaway;model=restoreDraft.model;dirty=restoreDraft.dirty;paint();editors();count();byId('result-state').textContent=dirty?'內容已更動，請重新產生':'已恢復上次草稿';byId('result-state').dataset.dirty=String(dirty);message('input-note','已恢復此瀏覽器上次保留的內容。');}
  else {purpose.value='process';source.value=V.examples.process.content;takeaway.value=V.examples.process.takeaway;generate(true);}
})();
