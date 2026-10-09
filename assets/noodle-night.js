(() => {
  'use strict';
  const G=window.NoodleGame, game=new G.Session(), $=id=>document.getElementById(id);
  const canvas=$('night-canvas'),ctx=canvas.getContext('2d'),scene=$('night-scene'),panel=document.querySelector('.night-game');
  const bestKey='yichi-noodle-best-v1';
  let frame=0,last=0,best=0,feedback='',lastPhase='ready',lastHits=0,stored=false;
  const tr=(zh,en)=>window.YKLanguage?.language==='en'?en:zh;
  const put=(id,value)=>{const el=$(id);if(el.textContent!==String(value))el.textContent=String(value);};
  try{const value=Number(localStorage.getItem(bestKey));if(Number.isInteger(value)&&value>=0&&value<=10000)best=value;}catch{}
  const rect=(x,y,w,h,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
  const line=(x,y,x2,y2,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
  const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  const text=(value,x,y,color,size=12,align='center')=>{ctx.fillStyle=color;ctx.font=`600 ${size}px "Segoe UI", "Microsoft JhengHei", sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);};
  function car(x,y,color,player=false){
    ctx.save();ctx.translate(x,y);
    if(player&&game.invincible>0)ctx.globalAlpha=.55;
    ellipse(2,5,23,39,'#080e215e');
    if(player){const glow=ctx.createLinearGradient(0,-31,0,-115);glow.addColorStop(0,'#ffe6a832');glow.addColorStop(1,'#ffe6a800');ctx.fillStyle=glow;ctx.beginPath();ctx.moveTo(-14,-26);ctx.lineTo(-32,-110);ctx.lineTo(32,-110);ctx.lineTo(14,-26);ctx.fill();}
    rect(-22,-19,6,12,2,'#0b1020');rect(16,-19,6,12,2,'#0b1020');rect(-22,13,6,12,2,'#0b1020');rect(16,13,6,12,2,'#0b1020');
    rect(-19,-34,38,68,9,color);rect(-15,-17,30,17,4,'#203143');rect(-13,4,26,18,3,'#243649');
    rect(-15,-29,7,4,1,'#fff0c1');rect(8,-29,7,4,1,'#fff0c1');rect(-15,27,7,4,1,'#ff747b');rect(8,27,7,4,1,'#ff747b');
    line(-17,-5,-17,22,'#fff8de66',2);line(17,-5,17,22,'#fff8de66',2);
    if(player){rect(-10,5,20,13,3,'#ffc99a');text('YOU',0,14,'#563c3e',7);}
    ctx.restore();
  }
  function drawRoad(){
    rect(0,0,480,440,0,'#141e30');
    const travel=game.distance*.65;
    for(let side=0;side<2;side++){
      const bx=side?381:9;
      for(let row=-1;row<5;row++){
        const y=row*128+travel%128;
        rect(bx+5,y+5,78,108,4,'#0d1527');rect(bx,y,78,103,4,row%2?'#27324a':'#2d3045');
        rect(bx+6,y+6,66,15,2,'#414056');
        for(let wy=0;wy<3;wy++)for(let wx=0;wx<3;wx++){
          rect(bx+10+wx*21,y+32+wy*21,11,12,1,(wx+wy+row+side)%3===0?'#dbac7777':'#151e32');
        }
        rect(side?bx:bx+65,y+35,14,42,2,row%2?'#6d3a4c':'#315154');
      }
      rect(side?361:101,0,18,440,0,'#414456');
      for(let i=-1;i<4;i++){
        const y=i*155+travel%155, x=side?370:110;
        const light=ctx.createRadialGradient(x,y+8,0,x,y+8,50);light.addColorStop(0,'#ffd39424');light.addColorStop(1,'#ffd39400');
        ctx.fillStyle=light;ctx.fillRect(x-50,y-42,100,100);rect(x-2,y-6,4,18,2,'#8d8590');ellipse(x,y-6,4,4,'#e4c5a0');
      }
    }
    rect(122,0,236,440,0,'#29344a');
    line(124,0,124,440,'#e1b07f88',2);line(356,0,356,440,'#e1b07f88',2);
    ctx.setLineDash([20,23]);ctx.lineDashOffset=-travel%43;line(201,0,201,440,'#c4c9d14d',2);line(279,0,279,440,'#c4c9d14d',2);ctx.setLineDash([]);
    if(game.distance>G.DISTANCE-230){
      const y=-60+(game.distance-(G.DISTANCE-230))/230*230;
      for(let i=0;i<8;i++)rect(134+i*27,y,16,25,0,'#c3c6cb99');
      rect(130,y-55,220,29,4,'#344a48');text(tr('前方：你的家','HOME AHEAD'),240,y-36,'#e5e6c8',12);
    }
    for(const item of game.traffic){
      const x=162+item.lane*78,y=item.y*440;
      if(item.kind==='car')car(x,y,['#a6b8ba','#ad858f','#8694b0'][item.color]);
      else{rect(x-22,y-12,44,27,3,'#bd7e62');line(x-17,y+10,x-5,y-8,'#f4d1a6',5);line(x+4,y+10,x+16,y-8,'#f4d1a6',5);rect(x-24,y+14,48,5,2,'#141e30');}
    }
    car(162+game.x*78,370,'#f0b580',true);
    if(game.phase==='drive'){
      rect(137,16,206,29,14,'#101c30cb');
      text(tr(`剩餘 ${Math.max(0,Math.ceil(G.LIMIT-game.elapsed))} 秒抵達`,`ARRIVE IN ${Math.max(0,Math.ceil(G.LIMIT-game.elapsed))} s`),240,35,'#f9dcc0',12);
      if(game.slow>0){rect(160,304,160,28,14,'#753d3bef');text(tr('碰撞！−4 秒','BUMP! −4 s'),240,323,'#ffe3c8',13);}
    }
  }
  function drawBowl(){
    const done=game.phase==='served',step=done?3:game.cookStage;
    rect(0,0,480,440,0,'#293043');
    for(let x=0;x<480;x+=40)for(let y=0;y<245;y+=40){rect(x+1,y+1,38,38,2,(x+y)%80===0?'#303a49':'#343e4d');}
    rect(0,245,480,195,0,'#936c56');for(let i=0;i<5;i++)line(0,248+i*40,480,248+i*40,'#654c46',2);
    ellipse(244,288,111,17,'#281d2a55');
    ctx.fillStyle='#ebe0cc';ctx.beginPath();ctx.moveTo(142,225);ctx.bezierCurveTo(154,312,328,312,338,225);ctx.fill();
    ellipse(240,225,98,39,'#f6ecd8');ellipse(240,225,86,31,step>=1?'#9f4e30':'#d0b66b');
    ctx.strokeStyle='#ebc972';ctx.lineWidth=3;
    for(let n=0;n<9;n++){ctx.beginPath();ctx.ellipse(220+n*4,223+(n%3)*3,46-n*2,12,Math.sin(n)*.12,0,Math.PI*1.8);ctx.stroke();}
    if(game.garnishes.includes('beef')||done){for(let n=0;n<3;n++){rect(243+n*11,206+n*9,23,15,4,'#63362d');line(247+n*11,210+n*9,262+n*11,210+n*9,'#b87950',2);}}
    if(game.garnishes.includes('greens')||done){for(let n=0;n<3;n++){ellipse(192+n*11,215-n*3,7,14,'#79a477');line(192+n*11,210-n*3,203+n*11,231-n*3,'#b5c49a',3);}}
    line(357,179,378,269,'#e9c993',4);line(369,178,390,268,'#e9c993',4);
    line(180,265,300,265,'#b8755c',3);text('夜食',240,286,'#885645',13);
    ctx.strokeStyle='#e8e2d166';ctx.lineWidth=2;
    for(let i=0;i<3;i++){const x=213+i*26;ctx.beginPath();ctx.moveTo(x,177);ctx.bezierCurveTo(x+17,165,x-14,149,x+6,132);ctx.stroke();}
    rect(23,160,52,55,5,'#686c6d');ellipse(49,161,26,9,'#8a8c82');line(22,165,24,205,'#c0b99c',3);
    ellipse(435,233,20,9,'#cbaf88');ellipse(435,233,15,6,'#784838');
  }
  function draw(){
    if(!ctx)return;
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,480,440);
    if(['cook','served'].includes(game.phase))drawBowl();else drawRoad();
  }
  function updateHUD(){
    put('night-clock',G.clock(game.phase==='ready'?0:game.elapsed));
    put('distance-label',tr('距離家裡','DISTANCE HOME'));
    put('night-distance',game.distance>=G.DISTANCE?tr('已到家','HOME'):`${((G.DISTANCE-game.distance)/1000).toFixed(2)} km`);
    $('night-progress').style.width=`${game.distance/G.DISTANCE*100}%`;
    document.querySelector('.night-route').setAttribute('aria-valuenow',Math.floor(game.distance/G.DISTANCE*100));
    const driving=game.phase==='drive'&&!game.paused;
    $('night-left').disabled=!driving;$('night-right').disabled=!driving;
    $('night-pause').disabled=!['drive','cook'].includes(game.phase);
    put('night-pause',game.paused?tr('繼續 ▷','Resume ▷'):tr('暫停 Ⅱ','Pause Ⅱ'));
    put('night-best',best||'—');
    put('night-road-hint',driving?(game.accelerating&&game.slow===0?tr('↑ 加速中 · ← → / A D 換道','↑ Boosting · ← → / A D to steer'):tr('← → / A D 換道 · 按住 ↑ 加速','← → / A D to steer · Hold ↑ to boost')):tr('左右換道，準時到家。','Switch lanes. Get home on time.'));
  }
  function render(){
    panel.dataset.phase=game.phase;updateHUD();
    const cooking=game.phase==='cook'&&!game.paused;
    $('night-cooking').hidden=!cooking;
    const overlay=game.paused||['ready','arrived','late','served'].includes(game.phase);
    $('night-overlay').hidden=!overlay;$('overlay-result').hidden=game.phase!=='served'||game.paused;
    $('night-sign').innerHTML=tr('回家煮麵','HOME')+' <b>BEFORE 03:00</b>';
    scene.setAttribute('aria-label',tr('開車場景，使用左右方向鍵或 A、D 切換車道，按住向上方向鍵加速。','Driving scene. Use Left / Right or A / D to change lanes. Hold Up to accelerate.'));
    for(const [id,active] of [['step-drive',!['cook','served'].includes(game.phase)],['step-cook',['cook','served'].includes(game.phase)]]){
      if(active)$(id).setAttribute('aria-current','step');else $(id).removeAttribute('aria-current');
    }
    if(overlay){
      let title,copy,label,kicker;
      if(game.paused){kicker='TAKE A LITTLE BREAK';title=tr('先停一下。','Take a breath.');copy=tr('時間和進度都停在這裡，準備好再繼續。','Your time and progress are paused. Continue when you are ready.');label=tr('繼續這趟旅程 →','Continue →');}
      else if(game.phase==='ready'){kicker='THE LAST BOWL OF THE NIGHT';title=tr('夜路的盡頭，\n有一碗熱湯。','A late-night drive.\nA warm bowl awaits.');copy=tr('凌晨 2:50，距離家裡還有 3.2 公里。\n趕在 3 點前回家，親手煮一碗牛肉麵。','It’s 2:50 AM. Home is still 3.2 km away.\nGet home before 3 AM and cook a bowl of beef noodles.');label=tr('開車回家 →','Drive home →');}
      else if(game.phase==='arrived'){kicker='HOME SWEET HOME';title=tr('到家了，準備開火。','Home in time. Let’s cook.');copy=tr(`你在 ${G.clock(game.arrival)} 回到家，路上碰撞 ${game.hits} 次。\n走進廚房，為自己煮一碗熱騰騰的牛肉麵。`,`You got home at ${G.clock(game.arrival)}, with ${game.hits} bumps.\nHead into your kitchen and cook a warm bowl of beef noodles.`);label=tr('進廚房煮麵 →','Into the kitchen →');}
      else if(game.phase==='late'){kicker='THE CITY HAS FALLEN ASLEEP';title=tr('差一點，沒趕上三點。','A little too late.');copy=tr('已經凌晨 3 點，還沒回到家。\n再試一次，換道閃開車輛和路障。','It’s 3 AM, and you haven’t made it home.\nTry again and steer around the traffic.');label=tr('再開一趟 →','Try another drive →');}
      else {const r=game.result;kicker='YOUR MIDNIGHT SPECIAL';title=r.stars===3?tr('這碗，值得這趟夜路。','Worth the midnight drive.'):tr('熱騰騰的宵夜，上桌。','Your midnight meal is served.');copy=tr(`準時到家，完成 ${r.stars} 星牛肉麵。\n${r.stars===3?'火候與湯量都剛剛好。':'下次抓準綠色區域，挑戰更好口感。'}`,`Home on time, with a ${r.stars}-star bowl.\n${r.stars===3?'Perfect noodles. Just enough broth.':'Aim for the green zones for a tastier bowl.'}`);label=tr('再煮一碗 ↻','One more bowl ↻');put('overlay-result',`${'★'.repeat(r.stars)}${'☆'.repeat(3-r.stars)}  ·  ${r.score} ${tr('分','PTS')}`);}
      put('overlay-title',title);$('overlay-title').style.whiteSpace='pre-line';
      put('overlay-copy',copy);$('overlay-copy').style.whiteSpace='pre-line';
      put('overlay-kicker',kicker);put('night-primary',label);
    }
    if(cooking){
      const step=game.cookStage;
      put('cook-kicker',`STEP 0${step+1} / 03`);
      put('cook-title',[tr('先把麵煮好','Noodles first'),tr('再來一勺熱湯','Add the hot broth'),tr('最後，加上好料','The finishing touches')][step]);
      put('cook-hint',step<2?tr('指針進入綠色區域時按下按鈕。','Press the button when the needle is in the green zone.'):tr('放入牛肉和青菜，就可以上桌了。','Add beef and greens, then serve your bowl.'));
      $('cook-meter').hidden=step===2;$('cook-garnishes').hidden=step!==2;
      put('cook-action',[tr('起鍋！','Lift the noodles!'),tr('湯夠了！','Enough broth!'),tr('上桌 →','Serve →')][step]);
      $('cook-action').disabled=step===2&&game.garnishes.length<2;
      document.querySelectorAll('[data-garnish]').forEach(b=>{const added=game.garnishes.includes(b.dataset.garnish);b.disabled=added;b.setAttribute('aria-pressed',added);b.textContent=`${added?'✓':'＋'} ${b.dataset.garnish==='beef'?tr('牛肉','Beef'):tr('青菜','Greens')}`;});
      put('cook-feedback',feedback);
    }
    draw();
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
  function startLoop(){stop();if(!game.paused&&['drive','cook'].includes(game.phase))frame=requestAnimationFrame(loop);}
  function checkTransition(){
    if(game.hits!==lastHits){lastHits=game.hits;put('night-live',tr('碰撞了！減速，倒數損失 4 秒。','Bump! Slowed down and lost 4 seconds.'));}
    if(game.phase!==lastPhase){lastPhase=game.phase;render();if(['arrived','late','served'].includes(game.phase))$('night-primary').focus({preventScroll:true});}
  }
  function loop(now){
    const dt=last?(now-last)/1000:0;last=now;
    // A stalled/backgrounded frame must not eat the player's remaining time.
    if(dt>.6){pause();return;}
    game.tick(dt);checkTransition();updateHUD();
    if(game.phase==='cook')$('cook-needle').style.left=`${game.meter}%`;
    draw();
    if(!game.paused&&['drive','cook'].includes(game.phase))frame=requestAnimationFrame(loop);else stop();
  }
  function pause(){if(!game.pause())return;stop();render();$('night-primary').focus({preventScroll:true});}
  function resume(){if(!game.resume())return;render();scene.focus({preventScroll:true});startLoop();}
  function start(){game.reset();game.start();lastPhase='drive';lastHits=0;stored=false;feedback='';put('night-live',tr('出發！你的車是杏色的那一台。','Let’s go! You’re driving the apricot-colored car.'));render();scene.focus({preventScroll:true});panel.scrollIntoView({block:'center',behavior:'instant'});startLoop();}
  $('night-primary').addEventListener('click',()=>{
    if(game.paused){resume();return;}
    if(game.phase==='arrived'){game.beginCooking();lastPhase='cook';put('night-live',tr('已準時到家，現在專心煮麵。','Home on time. Enjoy the cooking.'));render();$('cook-action').focus({preventScroll:true});startLoop();return;}
    if(['ready','late','served'].includes(game.phase))start();
  });
  $('night-left').addEventListener('click',()=>game.move(-1));$('night-right').addEventListener('click',()=>game.move(1));
  $('night-pause').addEventListener('click',()=>game.paused?resume():pause());
  function cookingAction(){
    if(game.cookStage<2){const q=game.cook();if(q===null)return;feedback=q===100?tr('剛剛好！＋100','Perfect! +100'):q===65?tr('還不錯！＋65','Pretty good! +65'):tr('下次再抓準一點。＋30','A little early or late. +30');render();}
    else if(game.serve()){
      if(!stored){stored=true;if(game.result.score>best){best=game.result.score;try{localStorage.setItem(bestKey,String(best));}catch{put('night-live',tr('本次成績未能存到瀏覽器。','This result could not be saved in the browser.'));}}}
      checkTransition();stop();render();
    }
  }
  $('cook-action').addEventListener('click',cookingAction);
  document.querySelectorAll('[data-garnish]').forEach(b=>b.addEventListener('click',()=>{game.garnish(b.dataset.garnish);render();if(game.garnishes.length===2)$('cook-action').focus({preventScroll:true});}));
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable]'))return;
    if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)&&game.phase==='drive'&&!game.paused){e.preventDefault();if(!e.repeat)game.move(['ArrowLeft','KeyA'].includes(e.code)?-1:1);}
    else if(e.code==='ArrowUp'&&game.phase==='drive'&&!game.paused){e.preventDefault();if(!e.repeat){game.accelerate(true);updateHUD();}}
    else if(e.code==='KeyP'&&['drive','cook'].includes(game.phase)){e.preventDefault();if(!e.repeat)game.paused?resume():pause();}
    else if(e.code==='Space'&&game.phase==='cook'&&!game.paused&&!e.target.closest('button,a')){e.preventDefault();if(!e.repeat)cookingAction();}
  });
  document.addEventListener('keyup',e=>{if(e.code==='ArrowUp'){game.accelerate(false);updateHUD();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('blur',pause);
  window.addEventListener('pagehide',()=>{game.accelerate(false);stop();});
  window.addEventListener('yk:language',()=>{feedback='';put('night-live','');render();});
  render();
})();
