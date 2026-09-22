(() => {
  'use strict';
  const $=id=>document.getElementById(id),body=document.body,actor=$('pet-actor'),home=$('pet-home'),dock=$('pet-dock'),dockHome=$('pet-dock-home'),stage=$('pet-stage');
  const floatMenu=$('pet-floating-menu');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const names={idle:'自在待機',wave:'揮手招呼',sway:'左右搖擺',bounce:'開心跳跳'};
  const lines={idle:'慢一點，也沒關係。',wave:'嗨，很高興見到你！',sway:'左一下，右一下 ♪',bounce:'把今天的好心情跳出來！'};
  let mode='idle',paused=reduced.matches,mini=false,hiddenPet=false,ready=false,bpm=100,drag=null,suppressClick=false,homeMoved=false;
  let waveTimer=null,audio=null,master=null,sound=false,soundToken=0,beatTimer=null,beatIndex=0;
  const nodes=new Set();
  function speak(text){$('pet-speech').textContent=text;}
  function update(){
    body.dataset.mode=mode;body.dataset.paused=String(paused);body.dataset.ready=String(ready);
    $('live-state').textContent=paused?'已暫停':names[mode];
    $('pet-pause').textContent=paused?'▶ 繼續動作':'Ⅱ 暫停動作';$('pet-pause').setAttribute('aria-pressed',String(paused));
    document.querySelectorAll('[data-pet-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.petMode===mode));b.disabled=!ready;});
    $('pet-mini').disabled=!ready;
    $('pet-mini').setAttribute('aria-pressed',String(mini&&!hiddenPet));
    $('pet-mini').firstElementChild.textContent=mini&&!hiddenPet?'回到大舞台':hiddenPet?'召喚小精靈':'放到網頁上自由拖曳';
    $('dock-dance').setAttribute('aria-pressed',String(mode==='sway'||mode==='bounce'));$('dock-dance').textContent=mode==='sway'||mode==='bounce'?'☾ 休息':'♪ 跳舞';
    $('dock-pause').setAttribute('aria-pressed',String(paused));$('dock-pause').textContent=paused?'▶ 繼續':'Ⅱ 暫停';
    $('pet-sound').setAttribute('aria-checked',String(sound));
    $('sound-note').textContent=sound?(paused?'動作暫停時，音效也會暫停。':'節拍已開啟，切換頁面時會自動關閉。'):'預設安靜，點開才會播放。';
    body.style.setProperty('--cycle',`${120/bpm}s`);
    $('tempo-output').replaceChildren(document.createTextNode(bpm+' '));const unit=document.createElement('small');unit.textContent='BPM';$('tempo-output').append(unit);
    $('stage-away').hidden=!mini;$('pet-speech').hidden=mini;$('pet-recall').hidden=!hiddenPet;
  }
  function setMode(next,{temporary=false}={}){
    if(!ready)return;
    const previous=mode==='wave'?'idle':mode;clearTimeout(waveTimer);mode=next;speak(lines[next]);update();
    if(next==='wave')burst();
    if(temporary)waveTimer=setTimeout(()=>{mode=previous;speak(lines[mode]);update();},2200);
  }
  function burst(){
    if(reduced.matches||mini)return;
    const bounds=stage.getBoundingClientRect(),r=actor.getBoundingClientRect();
    for(let i=0;i<5;i++){const s=document.createElement('span');s.textContent=i%2?'✧':'♪';s.style.left=(r.left-bounds.left+r.width*(.25+.5*Math.random()))+'px';s.style.top=(r.top-bounds.top+r.height*.3)+'px';s.style.setProperty('--dx',(Math.random()*100-50)+'px');$('pet-particles').append(s);setTimeout(()=>s.remove(),900);}
  }
  const clamp=(v,a,b)=>Math.min(Math.max(v,a),Math.max(a,b));
  function placeHome(x,y){
    const w=home.clientWidth,h=home.clientHeight,s=actor.offsetWidth;
    const margin=5;actor.style.left=clamp(x,Math.min(w/2,s/2+margin),Math.max(w/2,w-s/2-margin))+'px';actor.style.top=clamp(y,Math.min(h/2,s/2+margin),Math.max(h/2,h-s/2-margin))+'px';
  }
  function placeDock(x,y){const margin=8;dock.style.left=clamp(x,margin,document.documentElement.clientWidth-dock.offsetWidth-margin)+'px';dock.style.top=clamp(y,margin,innerHeight-dock.offsetHeight-margin)+'px';dock.style.right='auto';dock.style.bottom='auto';layoutMenu();}
  function layoutMenu(){
    if(floatMenu.hidden)return;
    const r=dock.getBoundingClientRect(),m=floatMenu.getBoundingClientRect();
    let x=r.left+(r.width-m.width)/2,y=r.top-m.height-10;
    if(y<8){x=r.left>=m.width+18?r.left-m.width-10:r.right+10;y=r.top;}
    floatMenu.style.left=(clamp(x,8,document.documentElement.clientWidth-m.width-8)-r.left)+'px';floatMenu.style.top=(clamp(y,8,innerHeight-m.height-8)-r.top)+'px';
  }
  function menuOpen(open){floatMenu.hidden=!open;actor.setAttribute('aria-expanded',String(open));if(open)layoutMenu();}
  function resetPosition(){
    if(mini){dock.style.left='';dock.style.top='';dock.style.right='';dock.style.bottom='';}
    else{actor.style.left='50%';actor.style.top='50%';homeMoved=false;}
    actor.style.setProperty('--look-x','0px');actor.style.setProperty('--look-r','0deg');speak('這裡剛剛好。');
  }
  function toMini(focus=true){menuOpen(false);mini=true;hiddenPet=false;dock.hidden=false;dockHome.append(actor);actor.style.left='50%';actor.style.top='50%';resetPosition();update();if(focus)actor.focus({preventScroll:true});}
  function toStage(){menuOpen(false);mini=false;hiddenPet=false;home.append(actor);dock.hidden=true;resetPosition();update();speak('我回來啦！');actor.focus({preventScroll:true});}
  function hidePet(){menuOpen(false);hiddenPet=true;dock.hidden=true;turnSoundOff();update();$('pet-recall').focus({preventScroll:true});}
  actor.addEventListener('pointerdown',event=>{
    if(event.button!==0||!ready)return;
    const rect=(mini?dock:actor).getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,w:rect.width,h:rect.height,moved:false};suppressClick=false;actor.setPointerCapture(event.pointerId);actor.classList.add('dragging');
  });
  actor.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5){drag.moved=true;if(mini)menuOpen(false);}if(!drag.moved)return;
    if(mini)placeDock(drag.left+dx,drag.top+dy);else{const r=home.getBoundingClientRect();placeHome(drag.left+dx+drag.w/2-r.left,drag.top+dy+drag.h/2-r.top);homeMoved=true;}
  });
  function finishDrag(event){if(!drag||event.pointerId!==drag.id)return;suppressClick=drag.moved||event.type==='pointercancel';if(drag.moved)speak('好，就待在這裡。');if(actor.hasPointerCapture(event.pointerId))actor.releasePointerCapture(event.pointerId);actor.classList.remove('dragging');drag=null;setTimeout(()=>{suppressClick=false;},0);}
  actor.addEventListener('pointerup',finishDrag);actor.addEventListener('pointercancel',finishDrag);
  actor.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){suppressClick=false;return;}if(mini)menuOpen(floatMenu.hidden);setMode('wave',{temporary:true});});
  actor.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&mini){event.preventDefault();if(!floatMenu.hidden)menuOpen(false);else hidePet();return;}
    const moves={ArrowLeft:[-15,0],ArrowRight:[15,0],ArrowUp:[0,-15],ArrowDown:[0,15]};if(!moves[event.key])return;event.preventDefault();const [dx,dy]=moves[event.key];
    if(mini){menuOpen(false);const r=dock.getBoundingClientRect();placeDock(r.left+dx,r.top+dy);}else{const a=actor.getBoundingClientRect(),h=home.getBoundingClientRect();placeHome(a.left-h.left+a.width/2+dx,a.top-h.top+a.height/2+dy);homeMoved=true;}
  });
  stage.addEventListener('pointermove',event=>{if(mini||paused||drag||reduced.matches||event.pointerType==='touch')return;const r=stage.getBoundingClientRect(),factor=clamp((event.clientX-r.left)/r.width-.5,-.5,.5);actor.style.setProperty('--look-x',factor*5+'px');actor.style.setProperty('--look-r',factor*2+'deg');});
  stage.addEventListener('pointerleave',()=>{actor.style.setProperty('--look-x','0px');actor.style.setProperty('--look-r','0deg');});
  document.querySelectorAll('[data-pet-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.petMode)));
  $('pet-tempo').addEventListener('input',event=>{bpm=Number(event.target.value);update();restartBeat();});
  $('pet-pause').addEventListener('click',()=>{paused=!paused;if(!paused&&reduced.matches)body.dataset.motionOptin='true';update();restartBeat();});
  $('pet-reset').addEventListener('click',resetPosition);
  $('pet-mini').addEventListener('click',()=>mini&&!hiddenPet?toStage():toMini());
  $('dock-dismiss').addEventListener('click',()=>{menuOpen(false);actor.focus({preventScroll:true});});
  $('dock-dance').addEventListener('click',()=>setMode(mode==='sway'||mode==='bounce'?'idle':'sway'));
  $('dock-pause').addEventListener('click',()=>{$('pet-pause').click();});
  floatMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();menuOpen(false);actor.focus({preventScroll:true});}});
  document.addEventListener('pointerdown',event=>{if(!floatMenu.hidden&&!dock.contains(event.target))menuOpen(false);});
  $('return-stage').addEventListener('click',toStage);$('dock-return').addEventListener('click',toStage);$('dock-hide').addEventListener('click',hidePet);$('pet-recall').addEventListener('click',toMini);
  function stopBeat(){clearInterval(beatTimer);beatTimer=null;for(const osc of nodes){try{osc.stop();}catch{}}nodes.clear();}
  function tone(frequency,length,volume,type='sine',fall=false){
    if(!audio||!master)return;const time=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,time);if(fall)osc.frequency.exponentialRampToValueAtTime(45,time+length);gain.gain.setValueAtTime(.001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.006);gain.gain.exponentialRampToValueAtTime(.001,time+length);osc.connect(gain);gain.connect(master);nodes.add(osc);osc.onended=()=>{nodes.delete(osc);osc.disconnect();gain.disconnect();};osc.start(time);osc.stop(time+length+.02);
  }
  function tick(){if(audio?.state!=='running')return;const beat=beatIndex++%4;tone(beat%2?190:140,.13,.25,'sine',true);tone(beat%2?880:660,.07,.035,'triangle');}
  function restartBeat(){stopBeat();if(!sound||paused||document.hidden||hiddenPet)return;beatIndex=0;tick();beatTimer=setInterval(tick,60000/bpm);}
  function turnSoundOff(){soundToken++;sound=false;stopBeat();audio?.suspend().catch(()=>{});update();}
  $('pet-sound').addEventListener('click',async()=>{
    if(sound){turnSoundOff();return;}const token=++soundToken;
    try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');if(!audio){audio=new Audio();master=audio.createGain();master.gain.value=.35;master.connect(audio.destination);}await audio.resume();if(token!==soundToken)return;if(document.hidden)return; sound=true;update();restartBeat();}
    catch{sound=false;update();$('sound-note').textContent='瀏覽器無法播放音效，仍可操作角色。';}
  });
  document.addEventListener('visibilitychange',()=>{body.dataset.background=String(document.hidden);if(document.hidden)turnSoundOff();});
  window.addEventListener('pagehide',()=>{stopBeat();audio?.close().catch(()=>{});});
  reduced.addEventListener('change',event=>{if(event.matches){paused=true;delete body.dataset.motionOptin;stopBeat();} $('reduce-note').hidden=!event.matches;update();});
  function fit(){if(mini&&!hiddenPet){const r=dock.getBoundingClientRect();placeDock(r.left,r.top);}else if(homeMoved){const r=actor.getBoundingClientRect(),h=home.getBoundingClientRect();placeHome(r.left-h.left+r.width/2,r.top-h.top+r.height/2);}}
  new ResizeObserver(fit).observe(home);window.addEventListener('resize',fit);
  const asset=new URL('blackhair-sprites-v1.png',document.currentScript.src).href,maskAsset=new URL('blackhair-mask-v1.png',document.currentScript.src).href;
  async function load(){
    $('pet-loading').hidden=false;$('pet-loading').textContent='角色正在準備中…';
    try{const img=new Image(),mask=new Image();img.src=asset;mask.src=maskAsset;await Promise.all([img.decode(),mask.decode()]);ready=true;$('pet-loading').hidden=true;update();toMini(false);}
    catch{$('pet-loading').textContent='角色圖片尚未載入。';const retry=document.createElement('button');retry.type='button';retry.textContent='再試一次';retry.addEventListener('click',load);$('pet-loading').append(retry);}
  }
  $('reduce-note').hidden=!reduced.matches;update();load();
})();
