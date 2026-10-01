(function(root){
  'use strict';
  const ROUNDS=5, MAX_MS=60000;
  function summary(rounds){
    if(!Array.isArray(rounds)||rounds.length!==ROUNDS||!rounds.every(n=>Number.isInteger(n)&&n>=1&&n<=MAX_MS)) return null;
    const totalMs=rounds.reduce((a,b)=>a+b,0);
    return {totalMs,averageMs:totalMs/ROUNDS,fastestMs:Math.min(...rounds)};
  }
  function normalizeName(value){
    const name=String(value).normalize('NFKC').trim().replace(/\s+/g,' ');
    if(!/^[\p{L}\p{N} _.-]{1,16}$/u.test(name)) throw new Error('invalid-name');
    return name;
  }
  class Session {
    constructor(){this.reset();}
    reset(){this.state='idle';this.rounds=[];this.falseStarts=0;this.cueAt=null;this.reason='';}
    wait(random=Math.random){
      if(!['idle','round','early','interrupted'].includes(this.state)) return null;
      this.state='waiting';this.reason='';this.cueAt=null;
      return 2000+Math.floor(Math.min(1,Math.max(0,random()))*3000);
    }
    cue(now){if(this.state!=='waiting')return false;this.cueAt=now;this.state='go';return true;}
    press(now){
      if(this.state==='waiting'){this.falseStarts++;this.state='early';return 'early';}
      if(this.state!=='go')return null;
      const elapsed=now-this.cueAt;
      if(!Number.isFinite(elapsed)||elapsed<0||elapsed>MAX_MS){this.interrupt('timeout');return 'interrupted';}
      this.rounds.push(Math.max(1,Math.round(elapsed)));
      this.state=this.rounds.length===ROUNDS?'complete':'round';
      return this.state;
    }
    interrupt(reason='hidden'){
      if(!['waiting','go'].includes(this.state))return false;
      this.state='interrupted';this.cueAt=null;this.reason=reason;return true;
    }
    get result(){return summary(this.rounds);}
  }
  const api={Session,summary,normalizeName,ROUNDS,MAX_MS};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReactionGame=api;
})(typeof window==='undefined'?{}:window);
