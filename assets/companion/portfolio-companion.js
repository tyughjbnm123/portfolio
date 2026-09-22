(() => {
  'use strict';
  if(document.getElementById('yk-companion-widget'))return;
  const base=new URL('.',document.currentScript.src),KEY='yk-companion-preferences-v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const state={open:false,menu:false,ready:false,dance:saved.dance===true,paused:reduced.matches||saved.paused===true,wave:false};
  let position=saved.position&&Number.isFinite(saved.position.x)&&Number.isFinite(saved.position.y)?saved.position:null;
  let loadingPromise=null,waveTimer=null,drag=null,suppressClick=false;
  const host=document.createElement('div');host.id='yk-companion-widget';
  const root=host.attachShadow({mode:'open'}),sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('portfolio-companion.css?v=20260922-v20b',base).href;root.append(sheet);
  const ui=document.createElement('div');
  ui.innerHTML=`<button class="launcher" type="button" aria-expanded="false" aria-controls="companion-panel"><span aria-hidden="true">✧</span> 召喚小精靈</button>
    <section class="panel" id="companion-panel" aria-label="網頁小精靈" hidden>
      <button class="actor" type="button" aria-label="小精靈，拖曳移動或點擊開啟選單" aria-expanded="false" aria-controls="companion-menu" title="抓住我，放到你喜歡的位置 · 點一下開啟選單" disabled><span class="motion"><span class="sprite" aria-hidden="true"></span></span></button>
      <div class="load-status" hidden><p class="loading" role="status">角色準備中…</p><button class="retry" type="button" hidden>重新載入</button><button class="cancel" type="button">收起</button></div>
      <div class="menu" id="companion-menu" role="group" aria-label="小精靈選單" hidden>
        <div class="menu-heading"><strong>網頁小精靈</strong><button class="dismiss" type="button" aria-label="關閉小精靈選單">×</button></div>
        <p class="tip">抓住角色，就能拖到任何角落。</p>
        <div class="controls"><button class="dance" type="button" aria-pressed="false">♪ 跳舞</button><button class="pause" type="button" aria-pressed="false">Ⅱ 暫停</button></div>
        <a class="visit" href="${new URL('../../companion-lab.html',base).href}">完整試玩 ↗</a><button class="close" type="button">收起小精靈</button>
      </div>
    </section>`;
  root.append(ui);document.body.append(host);
  const $=s=>root.querySelector(s),launcher=$('.launcher'),panel=$('.panel'),actor=$('.actor'),sprite=$('.sprite'),menu=$('.menu');
  const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
  function viewportWidth(){return Math.min(innerWidth,document.documentElement.getBoundingClientRect().right);}
  function scale(){return host.getBoundingClientRect().width/host.offsetWidth||1;}
  function remember(){try{localStorage.setItem(KEY,JSON.stringify({open:state.open,dance:state.dance,paused:state.paused,position}));}catch{}}
  function place(x,y){const r=host.getBoundingClientRect(),zoom=scale();host.style.left=clamp(x,8,viewportWidth()-r.width-8)/zoom+'px';host.style.top=clamp(y,8,innerHeight-r.height-8)/zoom+'px';host.style.right='auto';host.style.bottom='auto';layoutMenu();}
  function savePosition(){const r=host.getBoundingClientRect();position={x:clamp(r.left/Math.max(1,viewportWidth()-r.width),0,1),y:clamp(r.top/Math.max(1,innerHeight-r.height),0,1)};remember();}
  function layoutMenu(){
    if(!state.menu)return;
    const r=host.getBoundingClientRect(),m=menu.getBoundingClientRect(),zoom=scale();
    let x=r.left+(r.width-m.width)/2,y=r.top-m.height-10;
    if(y<8){x=r.left>=m.width+18?r.left-m.width-10:r.right+10;y=r.top;}
    x=clamp(x,8,viewportWidth()-m.width-8);y=clamp(y,8,innerHeight-m.height-8);
    menu.style.left=(x-r.left)/zoom+'px';menu.style.top=(y-r.top)/zoom+'px';
  }
  function fit(){if(!state.open)return;const r=host.getBoundingClientRect();if(position&&!drag)place(position.x*Math.max(0,viewportWidth()-r.width),position.y*Math.max(0,innerHeight-r.height));else if(r.left<8||r.top<8||r.right>viewportWidth()-8||r.bottom>innerHeight-8)place(r.left,r.top);layoutMenu();}
  function render(){
    panel.hidden=!state.open;launcher.hidden=state.open;menu.hidden=!state.menu;
    launcher.setAttribute('aria-expanded',String(state.open));actor.setAttribute('aria-expanded',String(state.menu));
    host.dataset.mode=state.wave?'wave':state.dance?'dance':'idle';host.dataset.paused=String(state.paused);host.dataset.ready=String(state.ready);actor.disabled=!state.ready;
    $('.dance').textContent=state.dance?'☾ 休息':'♪ 跳舞';$('.dance').setAttribute('aria-pressed',String(state.dance));
    $('.pause').textContent=state.paused?'▶ 繼續':'Ⅱ 暫停';$('.pause').setAttribute('aria-pressed',String(state.paused));requestAnimationFrame(layoutMenu);
  }
  function load(){
    if(state.ready)return Promise.resolve();if(loadingPromise)return loadingPromise;
    $('.load-status').hidden=false;$('.loading').textContent='角色準備中…';$('.retry').hidden=true;
    const img=new Image(),mask=new Image();img.src=new URL('blackhair-sprites-v1.png',base).href;mask.src=new URL('blackhair-mask-v1.png',base).href;
    loadingPromise=Promise.all([img.decode(),mask.decode()]).then(()=>{sprite.style.backgroundImage=`url("${img.src}")`;sprite.style.maskImage=`url("${mask.src}")`;state.ready=true;$('.load-status').hidden=true;render();}).catch(()=>{$('.loading').textContent='角色暫時沒有載入。';$('.retry').hidden=false;}).finally(()=>{loadingPromise=null;});return loadingPromise;
  }
  function open(focus=true){state.open=true;remember();render();requestAnimationFrame(fit);load().then(()=>{if(focus&&state.open&&state.ready)actor.focus({preventScroll:true});});}
  function close(){state.open=false;state.menu=false;state.wave=false;clearTimeout(waveTimer);host.style.left='';host.style.top='';host.style.right='';host.style.bottom='';remember();render();launcher.focus({preventScroll:true});}
  function hideMenu(focus=false){state.menu=false;render();if(focus)actor.focus({preventScroll:true});}
  launcher.addEventListener('click',()=>open());$('.close').addEventListener('click',close);$('.cancel').addEventListener('click',close);$('.retry').addEventListener('click',load);$('.dismiss').addEventListener('click',()=>hideMenu(true));
  $('.dance').addEventListener('click',()=>{clearTimeout(waveTimer);state.wave=false;state.dance=!state.dance;remember();render();});
  $('.pause').addEventListener('click',()=>{state.paused=!state.paused;if(!state.paused&&reduced.matches)host.dataset.motionOptin='true';remember();render();});
  actor.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){suppressClick=false;return;}clearTimeout(waveTimer);state.menu=!state.menu;state.wave=true;render();waveTimer=setTimeout(()=>{state.wave=false;render();},1800);});
  actor.addEventListener('pointerdown',event=>{if(event.button!==0||!state.ready)return;const r=host.getBoundingClientRect();drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:r.left,y:r.top,moved:false};suppressClick=false;actor.setPointerCapture(event.pointerId);host.dataset.dragging='true';});
  actor.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.hypot(dx,dy)>5&&!drag.moved){drag.moved=true;hideMenu();}if(drag.moved)place(drag.x+dx,drag.y+dy);});
  function end(event){if(!drag||event.pointerId!==drag.id)return;suppressClick=drag.moved||event.type==='pointercancel';if(drag.moved)savePosition();drag=null;delete host.dataset.dragging;if(actor.hasPointerCapture(event.pointerId))actor.releasePointerCapture(event.pointerId);setTimeout(()=>{suppressClick=false;},0);}
  actor.addEventListener('pointerup',end);actor.addEventListener('pointercancel',end);actor.addEventListener('lostpointercapture',end);
  document.addEventListener('pointerdown',event=>{if(state.menu&&!event.composedPath().includes(host))hideMenu();});
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&state.open){event.preventDefault();event.stopPropagation();if(state.menu)hideMenu(true);else close();return;}if(event.target!==actor)return;
    const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[event.key];if(delta){event.preventDefault();event.stopPropagation();hideMenu();const r=host.getBoundingClientRect();place(r.left+delta[0],r.top+delta[1]);savePosition();}
  });
  document.addEventListener('visibilitychange',()=>{host.dataset.background=String(document.hidden);});
  reduced.addEventListener('change',event=>{if(event.matches){state.paused=true;delete host.dataset.motionOptin;remember();render();}});
  window.addEventListener('resize',fit);new ResizeObserver(fit).observe(host);sheet.addEventListener('load',fit);
  render();if(saved.open===true)open(false);
})();
