/* Visual lottery drum. Selection is owned by raffle.html, never by this simulation. */
(function(root){
  'use strict';
  const W=480,H=440,CX=240,CY=184,R=154;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const ease=t=>t*t*(3-2*t);
  const palette=[['#eaf5d5','#bdd69c','#708f53'],['#fbf8e9','#e6ddbb','#a69870'],['#cce9df','#87bdab','#417564'],['#f6db9e','#d9b264','#987036']];

  function makeBalls(count,random=Math.random){
    const n=count>0?Math.min(26,count):18;
    return Array.from({length:n},(_,i)=>{
      const row=Math.floor(i/6),col=i%6,r=18+(i%3)*1.2;
      return {x:CX+(col-2.5)*40+(row%2)*10,y:CY+70-row*39,r,
        vx:(random()-.5)*1.4,vy:(random()-.5)*1.2,rotation:random()*Math.PI*2,color:i%palette.length};
    });
  }
  function stepBalls(balls,dt,mixing,time){
    for(const [i,b] of balls.entries()){
      if(mixing){
        b.vx+=((CY-b.y)*.0025+Math.sin(time*4+i*2)*.18)*dt;
        b.vy+=((b.x-CX)*.0025+Math.cos(time*3+i)*.18-.04)*dt;
      }else b.vy+=.16*dt;
      b.vx*=Math.pow(mixing ? .998 : .984,dt);b.vy*=Math.pow(mixing ? .998 : .984,dt);
      const speed=Math.hypot(b.vx,b.vy);
      if(speed>9){b.vx*=9/speed;b.vy*=9/speed;}
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.rotation+=b.vx*.012*dt;
    }
    for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
      const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001;
      if(d>=a.r+b.r)continue;
      const nx=dx/d,ny=dy/d,overlap=(a.r+b.r-d)*.5;
      a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
      const speed=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(speed<0){const impulse=-speed*.87;a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse;}
    }
    for(const b of balls){
      const dx=b.x-CX,dy=b.y-CY,d=Math.hypot(dx,dy),limit=R-b.r-5;
      if(d>limit){
        const nx=dx/d,ny=dy/d;
        b.x=CX+nx*limit;b.y=CY+ny*limit;
        const speed=b.vx*nx+b.vy*ny;
        if(speed>0){b.vx-=1.82*speed*nx;b.vy-=1.82*speed*ny;}
      }
    }
  }

  class Drum {
    constructor(canvas,onPhase=()=>{}){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onPhase=onPhase;
      this.balls=makeBalls(0);this.count=0;this.phase='idle';this.frame=0;this.visible=true;
      this.motion=window.matchMedia('(prefers-reduced-motion: reduce)');
      this.resize=()=>{
        if(!this.ctx)return;
        const dpr=Math.min(window.devicePixelRatio||1,2);
        const width=Math.max(240,this.canvas.clientWidth||400);
        this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(width*dpr*H/W);
        const style=getComputedStyle(this.canvas);
        this.ink=style.getPropertyValue('--yk-ink').trim()||'#edf1e5';
        this.muted=style.getPropertyValue('--yk-muted').trim()||'#aeb9a8';
        this.render(performance.now());
      };
      this.resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(this.resize):null;
      this.resizeObserver?.observe(canvas);
      this.observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
        this.visible=entries[0].isIntersecting;
        if(this.visible)this.schedule();
      }):null;
      this.observer?.observe(canvas);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.last=0;this.schedule();}});
      this.motion.addEventListener('change',()=>{if(this.motion.matches&&this.resolve)this.finish();this.render(performance.now());this.schedule();});
      this.resize();this.schedule();
    }
    setCount(count){
      const changed=this.count!==count;
      this.count=count;
      if(changed&&this.phase==='idle')this.balls=makeBalls(count);
      this.render(performance.now());this.schedule();
    }
    reset(){
      if(this.resolve)this.finish();
      this.balls=makeBalls(this.count);this.phase='idle';this.extracted=null;
      this.onPhase('idle');this.render(performance.now());this.schedule();
    }
    draw({ordinal=1,duration=2500}={}){
      if(this.resolve)this.finish();
      this.ordinal=ordinal;this.phase='mixing';this.extracted=null;
      this.balls=makeBalls(Math.max(this.count,1));
      this.balls.forEach((b,i)=>{const angle=i*2.399;b.vx=Math.cos(angle)*5.8;b.vy=Math.sin(angle)*5.8-2;});
      this.start=performance.now();this.duration=Math.max(300,duration);this.last=0;
      this.onPhase('mixing');
      return new Promise(resolve=>{
        this.resolve=resolve;
        if(!this.ctx||this.motion.matches){this.finish();return;}
        // Completion never depends on RAF: hidden tabs still commit the selected result.
        this.timer=setTimeout(()=>this.finish(),this.duration);
        this.schedule();
      });
    }
    reveal(ordinal){this.ordinal=ordinal;this.finish();}
    finish(){
      clearTimeout(this.timer);
      this.phase='revealed';this.revealedAt=performance.now();
      this.onPhase('revealed');this.render(this.revealedAt);this.schedule();
      const resolve=this.resolve;this.resolve=null;resolve?.();
    }
    schedule(){
      if(!this.ctx||this.frame||document.hidden||!this.visible)return;
      if(this.motion.matches){this.render(performance.now());return;}
      this.frame=requestAnimationFrame(t=>this.tick(t));
    }
    tick(now){
      this.frame=0;
      if(document.hidden||!this.visible){this.last=0;return;}
      const dt=this.last?clamp((now-this.last)/16.667,0,2):1;this.last=now;
      if(this.phase==='mixing'&&(now-this.start)>this.duration*.64){
        this.phase='extracting';
        this.extracted=this.balls.pop();
        this.onPhase('extracting');
      }
      stepBalls(this.balls,dt/2,this.phase==='mixing',now/1000);
      stepBalls(this.balls,dt/2,this.phase==='mixing',now/1000);
      this.render(now);this.schedule();
    }
    ball(x,y,r,color,rotation=0,label=''){
      const c=this.ctx,p=palette[color%palette.length];
      c.save();c.translate(x,y);
      c.shadowColor='rgba(0,0,0,.22)';c.shadowBlur=r*.22;c.shadowOffsetY=r*.15;
      const g=c.createRadialGradient(-r*.35,-r*.45,r*.04,0,0,r*1.1);
      g.addColorStop(0,p[0]);g.addColorStop(.55,p[1]);g.addColorStop(1,p[2]);
      c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
      c.shadowColor='transparent';c.rotate(rotation);
      c.fillStyle='rgba(255,255,247,.75)';c.beginPath();c.arc(0,0,r*.48,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(49,68,42,.2)';c.lineWidth=Math.max(.6,r*.012);c.stroke();
      c.fillStyle='#31472b';c.textAlign='center';c.textBaseline='middle';
      if(label){c.font=`500 ${r*.52}px ui-monospace, monospace`;c.fillText(label,0,r*.025);}
      else{c.beginPath();c.arc(0,0,r*.09,0,Math.PI*2);c.fill();}
      c.restore();
      c.save();c.strokeStyle='rgba(255,255,255,.52)';c.lineWidth=Math.max(1,r*.055);
      c.beginPath();c.arc(x,y,r*.79,3.55,4.8);c.stroke();c.restore();
    }
    render(now){
      if(!this.ctx)return;
      const c=this.ctx;c.setTransform(this.canvas.width/W,0,0,this.canvas.height/H,0,0);
      c.clearRect(0,0,W,H);
      // Soft light behind the transparent chamber.
      const aura=c.createRadialGradient(CX,CY,30,CX,CY,205);
      aura.addColorStop(0,'rgba(199,224,155,.09)');aura.addColorStop(1,'rgba(199,224,155,0)');
      c.fillStyle=aura;c.fillRect(0,0,W,H);
      // Exit channel and stand are behind the chamber.
      c.fillStyle='rgba(135,168,126,.09)';c.strokeStyle='rgba(190,211,170,.35)';c.lineWidth=1.2;
      c.beginPath();c.roundRect(CX-25,CY+R-13,50,77,18);c.fill();c.stroke();
      c.beginPath();c.roundRect(CX-108,389,216,27,13);c.fill();c.stroke();
      c.strokeStyle='rgba(190,211,170,.12)';c.beginPath();c.ellipse(CX,428,118,5,0,0,Math.PI*2);c.stroke();
      // Glass chamber, back-to-front.
      c.save();c.beginPath();c.arc(CX,CY,R,0,Math.PI*2);c.clip();
      const glass=c.createLinearGradient(70,40,400,330);
      glass.addColorStop(0,'rgba(207,225,203,.09)');glass.addColorStop(.55,'rgba(180,214,170,.015)');glass.addColorStop(1,'rgba(165,205,143,.14)');
      c.fillStyle=glass;c.fillRect(60,20,360,340);
      c.strokeStyle='rgba(191,216,176,.10)';c.lineWidth=1;
      c.beginPath();c.ellipse(CX,CY,R-7,34,0,0,Math.PI*2);c.stroke();
      c.save();c.translate(CX,CY);c.rotate(this.motion.matches?0:now/(this.phase==='mixing'?210:18000));
      for(let i=0;i<3;i++){c.rotate(Math.PI*2/3);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(35,-55,120,-32);c.stroke();}
      c.restore();
      c.globalAlpha=this.count===0&&this.phase==='idle'?.34:this.phase==='revealed'?.42:1;
      this.balls.forEach(b=>this.ball(b.x,b.y,b.r,b.color,b.rotation));
      c.restore();
      const rim=c.createLinearGradient(90,20,360,340);
      rim.addColorStop(0,'rgba(239,248,222,.56)');rim.addColorStop(.4,'rgba(203,225,188,.12)');rim.addColorStop(1,'rgba(192,221,168,.42)');
      c.strokeStyle=rim;c.lineWidth=2;c.beginPath();c.arc(CX,CY,R,0,Math.PI*2);c.stroke();
      c.lineWidth=.8;c.beginPath();c.arc(CX,CY,R+6,0,Math.PI*2);c.stroke();
      c.strokeStyle='rgba(250,255,239,.26)';c.lineWidth=5;c.lineCap='round';
      c.beginPath();c.arc(CX,CY,R-12,3.45,4.4);c.stroke();
      c.strokeStyle='rgba(250,255,239,.08)';c.lineWidth=11;c.beginPath();c.arc(CX,CY,R-24,3.48,3.95);c.stroke();
      c.fillStyle='rgba(168,196,146,.65)';c.beginPath();c.arc(CX,CY+R+37,3,0,Math.PI*2);c.fill();
      if(this.phase==='extracting'&&this.extracted){
        const t=clamp((now-this.start-this.duration*.64)/(this.duration*.36),0,1),b=this.extracted;
        let x,y,r;
        if(t<.48){const p=ease(t/.48);x=b.x+(CX-b.x)*p;y=b.y+(CY+R+27-b.y)*p;r=b.r;}
        else{const p=ease((t-.48)/.52);x=CX;y=CY+R+27-(R+27)*p;r=b.r+(74-b.r)*p;}
        this.ball(x,y,r,0,0,t>.8?String(this.ordinal).padStart(2,'0'):'');
      }
      if(this.phase==='revealed'){
        const age=(now-this.revealedAt)/1000;
        const bounce=this.motion.matches?0:Math.sin(Math.min(age,1)*Math.PI*2)*Math.exp(-age*5)*4;
        const shadow=c.createRadialGradient(CX,CY+94,1,CX,CY+94,91);
        shadow.addColorStop(0,'rgba(0,0,0,.22)');shadow.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=shadow;c.beginPath();c.ellipse(CX,CY+94,91,17,0,0,Math.PI*2);c.fill();
        if(age<1&&!this.motion.matches){
          c.save();c.globalAlpha=Math.max(0,1-age);
          for(let i=0;i<16;i++){
            const a=i*Math.PI/8,reach=90+age*77;
            c.fillStyle=palette[i%4][1];c.save();c.translate(CX+Math.cos(a)*reach,CY+Math.sin(a)*reach+age*age*24);c.rotate(a+age*2);
            c.fillRect(-2,-3,4,6);c.restore();
          }c.restore();
        }
        this.ball(CX,CY+bounce,74,0,0,String(this.ordinal||1).padStart(2,'0'));
      }
      c.font='12px ui-monospace, monospace';c.fillStyle=this.muted;c.textAlign='center';
      c.fillText('L U C K Y   D R A W',CX,406);
    }
  }
  const api={Drum,makeBalls,stepBalls,bounds:{cx:CX,cy:CY,r:R}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RaffleBalls=api;
})(typeof window==='undefined'?{}:window);
