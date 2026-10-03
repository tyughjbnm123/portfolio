(function(root){
  'use strict';
  const LIMIT=70, DISTANCE=3200, SPEED=64, PENALTY=4;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  function clock(seconds){
    const minutes=170+Math.min(10,Math.floor(clamp(seconds,0,LIMIT)/LIMIT*10));
    return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  }
  class Session {
    constructor(random=Math.random){this.random=random;this.reset();}
    reset(){
      Object.assign(this,{phase:'ready',paused:false,lane:1,x:1,elapsed:0,distance:0,hits:0,
        invincible:0,slow:0,spawnIn:1.6,traffic:[],arrival:0,cookStage:0,cookTime:0,quality:[],garnishes:[],lastAction:''});
    }
    start(){if(this.phase!=='ready')return false;this.phase='drive';return true;}
    move(direction){
      if(this.phase!=='drive'||this.paused||![-1,1].includes(direction))return false;
      this.lane=clamp(this.lane+direction,0,2);return true;
    }
    pause(){if(!['drive','cook'].includes(this.phase))return false;this.paused=true;return true;}
    resume(){if(!this.paused)return false;this.paused=false;return true;}
    spawn(){
      // Every row leaves at least one lane open, with over two seconds of warning.
      const pick=()=>clamp(this.random(),0,.999999);
      const safe=Math.floor(pick()*3), double=this.distance>850&&pick()>.52;
      let occupied=[0,1,2].filter(l=>l!==safe);
      if(!double)occupied=[occupied[Math.floor(pick()*2)]];
      for(const lane of occupied)this.traffic.push({lane,y:-.13,kind:pick()>.35?'car':'cone',color:Math.floor(pick()*3)});
      this.spawnIn=2.1+pick()*.65;
    }
    hit(){
      if(this.phase!=='drive'||this.paused||this.invincible>0)return false;
      this.hits++;this.elapsed=Math.min(LIMIT,this.elapsed+PENALTY);this.invincible=1.8;this.slow=1.2;
      this.lastAction='hit';if(this.elapsed>=LIMIT)this.phase='late';return true;
    }
    tick(dt){
      if(this.paused||!Number.isFinite(dt)||dt<=0)return;
      // Fixed small steps keep collision/deadline behavior the same at different refresh rates.
      let left=Math.min(dt,1);
      while(left>1e-8){const step=Math.min(left,1/120);this.step(step);left-=step;}
    }
    step(dt){
      if(this.phase==='cook'){this.cookTime+=dt;return;}
      if(this.phase!=='drive')return;
      this.elapsed+=dt;
      if(this.elapsed>=LIMIT){this.elapsed=LIMIT;this.phase='late';return;}
      this.invincible=Math.max(0,this.invincible-dt);this.slow=Math.max(0,this.slow-dt);
      this.x+=(this.lane-this.x)*Math.min(1,dt*15);
      const pace=this.slow>0?.28:1;
      this.distance=Math.min(DISTANCE,this.distance+SPEED*pace*dt);
      this.spawnIn-=dt;
      if(this.spawnIn<=0&&this.distance<DISTANCE-220)this.spawn();
      for(const car of this.traffic){
        car.y+=dt*(.32+.025*this.distance/DISTANCE)*pace;
        if(!car.passed&&car.y>.735&&car.y<.945&&Math.abs(car.lane-this.x)<.46){car.passed=true;this.hit();}
      }
      this.traffic=this.traffic.filter(car=>car.y<1.18);
      if(this.phase==='drive'&&this.distance>=DISTANCE){this.phase='arrived';this.arrival=this.elapsed;this.traffic=[];}
    }
    beginCooking(){if(this.phase!=='arrived')return false;this.phase='cook';this.cookTime=0;return true;}
    get meter(){return (1-Math.cos(this.cookTime*1.8))*50;}
    cook(){
      if(this.phase!=='cook'||this.paused||this.cookStage>1)return null;
      const quality=Math.abs(this.meter-62)<=14?100:Math.abs(this.meter-62)<=30?65:30;
      this.quality.push(quality);this.cookStage++;this.cookTime=0;return quality;
    }
    garnish(item){
      if(this.phase!=='cook'||this.paused||this.cookStage!==2||!['beef','greens'].includes(item)||this.garnishes.includes(item))return false;
      this.garnishes.push(item);return true;
    }
    serve(){
      if(this.phase!=='cook'||this.paused||this.cookStage!==2||this.garnishes.length!==2)return false;
      this.phase='served';return true;
    }
    get result(){
      if(this.phase!=='served')return null;
      const cooking=this.quality.reduce((a,b)=>a+b,0)+100;
      const score=Math.max(0,Math.round((LIMIT-this.arrival)*10))+Math.max(0,200-this.hits*40)+cooking;
      return {score,hits:this.hits,arrival:this.arrival,cooking,stars:cooking>=280?3:cooking>=200?2:1};
    }
  }
  const api={Session,LIMIT,DISTANCE,SPEED,PENALTY,clock};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NoodleGame=api;
})(typeof window==='undefined'?{}:window);
