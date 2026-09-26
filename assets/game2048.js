(() => {
  'use strict';
  const G = window.Game2048, $ = s => document.querySelector(s);
  const boardEl = $('#board'), layer = $('.tile-layer'), resultDialog = $('#result-dialog'), restartDialog = $('#restart-dialog');
  const SAVE = 'yichi-2048-session-v1', BEST = 'yichi-2048-best-v1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const number = n => n.toLocaleString('zh-TW');
  let game, busy = false, paused = false, sending = false, best = Number(read(BEST) || 0), sound = read('yichi-2048-sound') === 'on', audio, cloud;
  let rankBusy = false, rankLoaded = false, lastRefresh = 0, currentMove = 0;
  function read(key) {try{return localStorage.getItem(key);}catch{return null;}}
  function write(key,value) {try{localStorage.setItem(key,value);return true;}catch{return false;}}
  function persist() { if (!write(SAVE,JSON.stringify(game))) $('#game-message').textContent='瀏覽器無法保存本局，關閉頁面後進度不會保留。'; }
  function makeGame() {return {version:1,id:crypto.randomUUID(),board:G.create(),score:0,moves:0,outcome:'playing',submitted:false};}
  function restore() {
    try {
      const value = JSON.parse(read(SAVE));
      if (value?.version !== 1 || !/^[a-f0-9-]{36}$/.test(value.id) || !Array.isArray(value.board) || value.board.length!==16 || !value.board.every(n=>Number.isInteger(n)&&n>=0&&n<=2048&&(n===0||(n>=2&&(n&(n-1))===0))) || !Number.isInteger(value.score) || value.score<0 || value.score>100000 || !Number.isInteger(value.moves)||value.moves<0||value.moves>10000) return null;
      value.outcome=G.outcome(value.board); return value;
    } catch {return null;}
  }
  function tile(value,index) {
    const node=document.createElement('span');node.className='tile';node.dataset.value=value;node.dataset.index=index;
    node.style.setProperty('--x',index%4);node.style.setProperty('--y',Math.floor(index/4));node.textContent=value;
    node.setAttribute('aria-label',`第 ${Math.floor(index/4)+1} 列、第 ${index%4+1} 格：${value}`);return node;
  }
  function render(merged=[],spawn=-1) {
    layer.replaceChildren(...game.board.flatMap((v,i)=> {if(!v)return [];const n=tile(v,i);if(merged.includes(i))n.classList.add('merged');else if(i===spawn)n.classList.add('new');return [n];}));
    $('#score').textContent=number(game.score);$('#best').textContent=number(best);$('#move-count').textContent=`${game.moves} 步`;
    $('#pause').textContent=game.outcome==='playing'?'暫停':'查看結算';
    document.querySelectorAll('[data-direction]').forEach(b=>b.disabled=game.outcome!=='playing'||paused);
  }
  function beep(merged) {
    if(!sound)return;
    try {
      audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();
      const oscillator=audio.createOscillator(),volume=audio.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(merged?520:260,audio.currentTime);volume.gain.setValueAtTime(.025,audio.currentTime);volume.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.09);oscillator.connect(volume);volume.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.1);
    } catch {}
  }
  function move(direction) {
    if(busy||paused||game.outcome!=='playing'||resultDialog.open||restartDialog.open)return;
    const step=G.slide(game.board,direction);if(!step.changed)return;
    busy=true;const token=++currentMove;
    const spawned=G.spawn(step.board,Math.random,direction);game.board=spawned.board;game.score+=step.gain;game.moves++;game.outcome=G.outcome(game.board);
    if(game.score>best){best=game.score;write(BEST,String(best));}persist();beep(step.gain>0);
    for(const path of step.paths){const n=layer.querySelector(`[data-index="${path.from}"]`);if(n){n.style.setProperty('--x',path.to%4);n.style.setProperty('--y',Math.floor(path.to/4));}}
    setTimeout(()=>{if(token!==currentMove)return;render(step.merged,spawned.index);busy=false;$('#announcement').textContent=step.gain?`合併得 ${step.gain} 分，目前 ${game.score} 分。`:`已移動，目前 ${game.score} 分。`;if(game.outcome!=='playing')showResult();},reduced?0:125);
  }
  function setPause(value) {paused=value;$('#pause-overlay').hidden=!paused;render();if(!paused)boardEl.focus({preventScroll:true});}
  function reset() {currentMove++;busy=false;game=makeGame();paused=false;$('#pause-overlay').hidden=true;$('#game-message').textContent='';resultDialog.close();restartDialog.close();persist();render();boardEl.focus({preventScroll:true});}
  function showResult() {
    $('#result-title').textContent=game.outcome==='won'?'2048，做到了！':'這一局，很不錯。';
    $('#result-description').textContent=game.outcome==='won'?'你把小小的數字，合成了這次的目標。':'棋盤已經無法移動，留下這次的成績吧。';
    $('#final-score').textContent=number(game.score);$('#final-detail').textContent=`${game.moves} 步 · 最大方塊 ${Math.max(...game.board)}`;
    $('#player-name').value=game.name||read('yichi-2048-name')||'';$('#player-name').disabled=!!game.submitted;
    $('#submit-score').disabled=!!game.submitted||game.score===0;
    $('#submit-status').textContent=game.submitted?'這局成績已送出，謝謝你來玩！':game.score===0?'這局沒有得分，再挑戰一次吧。':'';$('#submit-status').dataset.error='false';
    if(!resultDialog.open)resultDialog.showModal();
  }
  function getCloud() {if(!cloud)cloud=import('./game2048-firebase.js?v=20260925-1').catch(e=>{cloud=null;throw e;});return cloud;}
  function cloudError(error) {
    if(error.code==='permission-denied')return '排行榜暫時無法存取，請稍後再試。';
    if(error.code==='auth/operation-not-allowed'||error.code==='auth/configuration-not-found')return '排行榜的訪客登入尚未啟用，請稍後再試。';
    if(error.code==='resource-exhausted'||error.code==='auth/too-many-requests')return '目前使用人數較多，請稍後再試。';
    if(error.code==='unavailable'||error.code==='auth/network-request-failed'||error.name==='TimeoutError'||error instanceof TypeError)return '連線暫時中斷，請確認網路後重試。';
    return error.code?'成績未送出，請稍後重試。':error.message||'連線暫時中斷，請稍後重試。';
  }
  function timeout(promise,ms=12000) {return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new DOMException('timeout','TimeoutError')),ms))]);}
  async function ranks(force=false) {
    if(rankBusy||(!force&&Date.now()-lastRefresh<10000))return;
    rankBusy=true;lastRefresh=Date.now();$('#refresh').disabled=true;$('#rank-status').textContent='正在讀取排行榜…';
    try {
      const api=await timeout(getCloud()), rows=await timeout(api.leaderboard());
      $('#rank-list').replaceChildren(...rows.map((row,i)=>{
        const li=document.createElement('li'),rank=document.createElement('span'),player=document.createElement('span'),detail=document.createElement('small'),score=document.createElement('strong');
        rank.className='rank-num';rank.textContent=String(i+1).padStart(2,'0');player.className='rank-player';player.textContent=row.name;detail.textContent=`最大 ${row.maxTile} · ${row.outcome==='won'?'達成 2048':'挑戰完成'}`;score.textContent=number(row.score);player.append(detail);li.append(rank,player,score);if(row.id===game.id)li.className='is-yours';return li;
      }));rankLoaded=true;$('#rank-status').textContent=rows.length?'':'還沒有紀錄。第一個名字，會是你嗎？';
    } catch(e){$('#rank-status').textContent=(rankLoaded?'目前顯示上次讀取的紀錄。':'')+cloudError(e);}
    finally{rankBusy=false;$('#refresh').disabled=false;}
  }
  $('#result-form').addEventListener('submit',async e=>{
    e.preventDefault();if(sending||game.submitted||game.outcome==='playing'||game.score===0)return;
    let name;try{name=G.normalizeName($('#player-name').value);}catch(err){$('#submit-status').textContent=err.message;$('#submit-status').dataset.error='true';return;}
    game.name=name;write('yichi-2048-name',name);persist();const id=game.id;sending=true;
    $('#submit-score').disabled=true;$('#result-close').disabled=true;$('#submit-status').dataset.error='false';$('#submit-status').textContent='正在送出成績…';
    try {const api=await timeout(getCloud());await timeout(api.submit({id,name,score:game.score,moves:game.moves,maxTile:Math.max(...game.board),outcome:game.outcome}));if(id===game.id){game.submitted=true;persist();$('#player-name').disabled=true;$('#submit-status').textContent='成績已送出！可在排行榜查看前 20 名。';ranks(true);}}
    catch(error){$('#submit-status').textContent=cloudError(error)+' 本局已保留，可再次送出。';$('#submit-status').dataset.error='true';}
    finally{sending=false;$('#submit-score').disabled=!!game.submitted;$('#result-close').disabled=false;}
  });
  resultDialog.addEventListener('cancel',e=>{if(sending)e.preventDefault();});
  $('#result-close').addEventListener('click',()=>{resultDialog.close();$('#pause').focus({preventScroll:true});});
  $('#new-game').addEventListener('click',()=>{if(sending)return;if(game.moves>0&&game.outcome==='playing')restartDialog.showModal();else reset();});
  $('#restart-confirm').addEventListener('click',reset);$('#restart-cancel').addEventListener('click',()=>restartDialog.close());
  $('#pause').addEventListener('click',()=>game.outcome==='playing'?setPause(true):showResult());$('#resume').addEventListener('click',()=>setPause(false));
  document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>move(b.dataset.direction)));
  const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down',A:'left',D:'right',W:'up',S:'down'};
  document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||e.ctrlKey||e.altKey||e.metaKey||resultDialog.open||restartDialog.open)return;if(keyMap[e.key]){e.preventDefault();move(keyMap[e.key]);}else if(e.key==='Escape'&&game.outcome==='playing')setPause(!paused);});
  let pointer;
  boardEl.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};boardEl.setPointerCapture(e.pointerId);});
  boardEl.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});
  boardEl.addEventListener('pointercancel',()=>{pointer=null;});
  function soundButton(){ $('#sound').setAttribute('aria-pressed',String(sound));$('#sound').setAttribute('aria-label',sound?'關閉音效':'開啟音效'); }
  $('#sound').addEventListener('click',()=>{sound=!sound;write('yichi-2048-sound',sound?'on':'off');soundButton();beep(true);});
  $('#refresh').addEventListener('click',()=>ranks());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.outcome==='playing'&&game.moves>0)setPause(true);});
  $('.board-cells').replaceChildren(...Array.from({length:16},()=>document.createElement('span')));
  game=restore()||makeGame();if(!Number.isFinite(best))best=0;best=Math.max(best,game.score);soundButton();render();persist();
  if(game.outcome!=='playing')showResult();ranks(true);
})();
