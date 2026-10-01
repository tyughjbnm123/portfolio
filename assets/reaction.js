(() => {
  'use strict';
  const G=window.ReactionGame, $=id=>document.getElementById(id), game=new G.Session();
  const BEST='yichi-reaction-best-v1', LAST='yichi-reaction-last-v1', NAME='yichi-reaction-name-v1';
  const tr=(zh,en)=>window.YKLanguage?.language==='en'?en:zh;
  const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
  const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
  const themeButtons=[...document.querySelectorAll('[data-reaction-theme]')];
  function selectTheme(value){
    const theme=['violet','ocean','sunset','forest'].includes(value)?value:'violet';
    document.body.dataset.reactionTheme=theme;
    themeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reactionTheme===theme)));
    save('yichi-reaction-theme',theme);
  }
  themeButtons.forEach(button=>button.addEventListener('click',()=>selectTheme(button.dataset.reactionTheme)));
  selectTheme(read('yichi-reaction-theme'));
  let best=Number(read(BEST))||0, previous=null, completed=null, sent=false, sending=false;
  let timer=0, frame=0, expiry=0, generation=0, runId=crypto.randomUUID(), cloud, rankBusy=false, rankLoaded=false;
  let submitMessage='',rankMessage='',rows=[];
  if(best<1||best>G.MAX_MS)best=0;
  try {
    const stored=JSON.parse(read(LAST));
    if(stored&&G.summary(stored.rounds)&&/^[a-f0-9-]{36}$/.test(stored.id)&&Number.isInteger(stored.falseStarts)&&stored.falseStarts>=0){
      completed=stored;game.rounds=stored.rounds.slice();game.falseStarts=stored.falseStarts;game.state='complete';
      runId=stored.id;sent=stored.sent===true;submitMessage=sent?'sent':'';
      previous=Number.isFinite(stored.previous)&&stored.previous>0?stored.previous:null;
    }
  } catch {}
  function stopClock(){generation++;clearTimeout(timer);clearTimeout(expiry);cancelAnimationFrame(frame);timer=frame=expiry=0;}
  function startRound(){
    const wait=game.wait();if(wait===null)return;
    stopClock();const token=generation;render();
    timer=setTimeout(()=>{
      if(token!==generation||game.state!=='waiting')return;
      frame=requestAnimationFrame(()=>{
        if(token!==generation||game.state!=='waiting')return;
        if(document.hidden||!document.hasFocus()){interrupt();return;}
        game.cue(performance.now());render();
        expiry=setTimeout(()=>{if(token===generation){game.interrupt('timeout');stopClock();render();}},G.MAX_MS);
      });
    },wait);
  }
  function activate(){
    if(sending)return;
    if(['idle','round','early','interrupted'].includes(game.state)){startRound();return;}
    const result=game.press(performance.now());if(!result)return;
    stopClock();
    if(result==='complete'){
      let last;try{last=JSON.parse(read(LAST));}catch{}
      previous=last&&G.summary(last.rounds)?.averageMs||null;
      completed={id:runId,rounds:game.rounds.slice(),falseStarts:game.falseStarts,previous,sent:false};
      save(LAST,JSON.stringify(completed));
      if(!best||game.result.averageMs<best){best=game.result.averageMs;save(BEST,String(best));}
    }
    render();
  }
  function interrupt(){if(game.interrupt()){stopClock();render();}}
  function reset(){
    if(sending)return;stopClock();game.reset();runId=crypto.randomUUID();completed=null;sent=false;submitMessage='';previous=null;
    render();$('reaction-pad').focus({preventScroll:true});
  }
  function render(){
    const state=game.state,n=game.rounds.length,current=Math.min(n+1,5);
    const messages={
      idle:[tr('準備好了嗎','READY WHEN YOU ARE'),tr('等綠燈，快按！','Wait for green.'),tr('點一下或按空白鍵開始','Tap or press Space to start')],
      waiting:[tr('保持專注','STAY FOCUSED'),tr('等一下…','Wait for it…'),tr('變綠之前，先別按','Hold on until the light turns green')],
      go:[tr('就是現在','RIGHT NOW'),tr('按！','GO!'),tr('點螢幕或按空白鍵','Tap the panel or press Space')],
      early:[tr('太心急了','A LITTLE TOO SOON'),tr('搶跑了！','Too soon!'),tr('點一下，重試這一回合','Tap to retry this round')],
      interrupted:[tr('休息一下','TAKE A BREATH'),tr('這回合重來','Try this round again'),game.reason==='timeout'?tr('等待太久，點一下重試','Timed out. Tap to retry'):tr('已離開遊戲畫面，點一下繼續','You left the game. Tap to continue')],
      round:[tr('反應時間','REACTION TIME'),`${game.rounds.at(-1)} ms`,tr('點一下，進入下一回合','Tap to start the next round')],
      complete:[tr('五回合完成','FIVE ROUNDS COMPLETE'),`${game.result?.averageMs.toFixed(1)} ms`,tr('這是你的平均反應時間','Your average reaction time')]
    };
    const [kicker,title,hint]=messages[state];
    $('reaction-pad').dataset.state=state;$('reaction-pad').disabled=state==='complete';
    $('pad-kicker').textContent=kicker;$('pad-title').textContent=title;$('pad-hint').textContent=hint;
    $('reaction-pad').setAttribute('aria-label',`${title} ${hint}`);
    $('round-label').textContent=tr(`第 ${current} / 5 回合`,`ROUND ${current} / 5`);
    $('round-results').setAttribute('aria-label',tr('五回合成績','Results for five rounds'));
    $('round-results').replaceChildren(...Array.from({length:5},(_,i)=>{
      const li=document.createElement('li'),label=document.createElement('small'),value=document.createElement('strong');
      label.textContent=String(i+1).padStart(2,'0');value.textContent=game.rounds[i]===undefined?'—':String(game.rounds[i]);
      li.className=i<n?'is-done':i===n?'is-current':'';
      li.setAttribute('aria-label',tr(`第 ${i+1} 回合：${game.rounds[i]===undefined?'尚未完成':game.rounds[i]+' 毫秒'}`,`Round ${i+1}: ${game.rounds[i]===undefined?'pending':game.rounds[i]+' milliseconds'}`));
      li.append(label,value);return li;
    }));
    $('current-average').textContent=n?(game.rounds.reduce((a,b)=>a+b,0)/n).toFixed(1)+' ms':'—';
    $('fastest-time').textContent=n?Math.min(...game.rounds)+' ms':'—';
    $('personal-best').textContent=best?best.toFixed(1)+' ms':'—';
    $('reaction-status').textContent=state==='early'?tr('搶跑不計分，仍是同一回合。','False starts do not count. Retry the same round.'):
      state==='round'?tr(`第 ${n} 回合 ${game.rounds.at(-1)} 毫秒。`,`Round ${n}: ${game.rounds.at(-1)} milliseconds.`):
      state==='complete'?tr(`完成！平均 ${game.result.averageMs.toFixed(1)} 毫秒，共搶跑 ${game.falseStarts} 次。`,`Complete! Average ${game.result.averageMs.toFixed(1)} milliseconds; ${game.falseStarts} false starts.`):'';
    $('reaction-result').hidden=state!=='complete';
    if(state==='complete'){
      const change=previous?Number((previous-game.result.averageMs).toFixed(1)):null;
      $('result-comparison').textContent=change===null?tr('第一個紀錄，下次來超越自己。','Your first benchmark. Beat it next time.'):
        change>0?tr(`比上一局快了 ${change.toFixed(1)} ms！`,`You are ${change.toFixed(1)} ms faster than last time!`):
        change<0?tr(`比上一局慢了 ${Math.abs(change).toFixed(1)} ms，再試一次？`,`${Math.abs(change).toFixed(1)} ms slower than last time. Try again?`):tr('與上一局一樣快！','Exactly as quick as last time!');
    }
    $('restart-reaction').disabled=sending;$('reaction-name').disabled=sent||sending;$('submit-reaction').disabled=sent||sending;
    const notices={
      sending:tr('正在送出成績…','Submitting your result…'),sent:tr('成績已送出！','Result submitted!'),
      name:tr('暱稱請用 1–16 個文字、數字、空格或 . _ -。','Use 1–16 letters, numbers, spaces or . _ -.'),
      permission:tr('排行榜尚未開放或暫時無法存取。本局已保留，可稍後重試。','The leaderboard is not available yet. Your result is saved for retry.'),
      cooldown:tr('剛剛已送出成績，請稍候 30 秒再試。','Please wait 30 seconds before submitting again.'),
      network:tr('連線未完成。本局已保留，請稍後重試。','Connection failed. Your result is saved. Please retry.'),
      auth:tr('排行榜訪客登入暫時無法使用，請稍後重試。','Guest sign-in is unavailable. Please try again later.')
    };
    $('submit-status').textContent=notices[submitMessage]||'';
  }
  function persist(){if(completed)save(LAST,JSON.stringify({...completed,sent}));}
  function cloudApi(){return cloud ||= import('./reaction-firebase.js?v=20261001-reaction1').catch(e=>{cloud=null;throw e;});}
  function withTimeout(promise){let timeout;return Promise.race([promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),12000);})]).finally(()=>clearTimeout(timeout));}
  function errorCode(e){return e.code==='permission-denied'?'permission':e.message==='cooldown'?'cooldown':String(e.code||'').startsWith('auth/')?'auth':'network';}
  function renderRanks(){
    $('reaction-ranks').replaceChildren(...rows.map((row,i)=>{
      const li=document.createElement('li'),place=document.createElement('span'),name=document.createElement('span'),score=document.createElement('strong');
      place.className='rank-position';place.textContent=String(i+1).padStart(2,'0');name.className='rank-name';name.textContent=row.name;score.textContent=Number(row.averageMs).toFixed(1);li.append(place,name,score);return li;
    }));
    const text={loading:tr('正在讀取排行榜…','Loading leaderboard…'),empty:tr('還沒有紀錄，來留下第一個成績。','No results yet. Set the first benchmark.'),
      permission:tr('共用排行榜尚未開放，仍可遊玩並保存個人最佳。','The shared leaderboard is not available yet. You can still play and save your personal best.'),
      network:tr('排行榜暫時無法連線，請稍後重新整理。','Leaderboard connection failed. Refresh to try again.')};
    $('rank-status').textContent=(rankLoaded&&['permission','network'].includes(rankMessage)?tr('目前顯示上次讀取的紀錄。','Showing the last loaded results. '):'')+(text[rankMessage]||'');
  }
  async function ranks(){
    if(rankBusy)return;rankBusy=true;$('refresh-reaction').disabled=true;rankMessage='loading';renderRanks();
    try{const api=await withTimeout(cloudApi());rows=await withTimeout(api.leaderboard());rankLoaded=true;rankMessage=rows.length?'':'empty';}
    catch(e){rankMessage=e.code==='permission-denied'?'permission':'network';}
    finally{rankBusy=false;$('refresh-reaction').disabled=false;renderRanks();}
  }
  $('reaction-form').addEventListener('submit',async e=>{
    e.preventDefault();if(sending||sent||game.state!=='complete'||!completed)return;
    let name;try{name=G.normalizeName($('reaction-name').value);}catch{submitMessage='name';render();return;}
    sending=true;submitMessage='sending';save(NAME,name);render();
    try{const api=await withTimeout(cloudApi());await withTimeout(api.submit({...completed,...game.result,name}));sent=true;submitMessage='sent';persist();ranks();}
    catch(e){submitMessage=errorCode(e);persist();}
    finally{sending=false;render();}
  });
  $('reaction-pad').addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();$('reaction-pad').focus({preventScroll:true});activate();});
  // Assistive-technology clicks are accepted; physical pointer clicks already ran on pointerdown.
  $('reaction-pad').addEventListener('click',e=>{if(e.detail===0)activate();});
  document.addEventListener('keydown',e=>{
    if(!['Space','Enter'].includes(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.target.closest('input,textarea,select,a,button')&&e.target!==$('reaction-pad'))return;
    if(e.code==='Enter'&&e.target!==$('reaction-pad'))return;
    e.preventDefault();if(!e.repeat)activate();
  });
  window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
  $('restart-reaction').addEventListener('click',reset);$('refresh-reaction').addEventListener('click',ranks);
  window.addEventListener('yk:language',()=>{render();renderRanks();});
  $('reaction-name').value=read(NAME)||'';render();ranks();
})();
