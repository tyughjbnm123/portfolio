/* Local photo deformation. The six bundled portraits use calibrated 2D anchors;
   this illustrates AU directions, not a clinical FACS rig or generated imagery. */
(function (root) {
  'use strict';
  const SIZE = 480, GRID = 61;
  const AU = ['AU1','AU2','AU4','AU5','AU6','AU7','AU41','AU46','AU9','AU10','AU12','AU13','AU22','AU15','AU16','AU17','AU26','AU27'];
  const ANCHORS = {
    young_f: {eyes:[[194,198],[285,196]],brows:[[193,169],[286,168]],mouth:[239,295,31],nose:[239,255],chin:344},
    young_m: {eyes:[[195,212],[286,212]],brows:[[192,190],[286,190]],mouth:[238,313,37],nose:[237,269],chin:377},
    cool_f: {eyes:[[198,190],[287,190]],brows:[[195,164],[286,163]],mouth:[241,282,28],nose:[242,249],chin:333},
    mature_m: {eyes:[[196,199],[291,198]],brows:[[194,173],[291,173]],mouth:[239,314,38],nose:[240,261],chin:367},
    cute: {eyes:[[199,207],[291,207]],brows:[[193,178],[297,178]],mouth:[244,302,29],nose:[244,263],chin:351},
    anime: {eyes:[[185,207],[300,207]],brows:[[189,174],[302,174]],mouth:[241,299,20],nose:[241,267],chin:345,anime:true}
  };
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  function strength(n) { return Math.tanh(clamp(Number(n)||0,0,4)*.45)/Math.tanh(1.8); }

  function controls(faceId, au) {
    const f = ANCHORS[faceId] || ANCHORS.young_f, points=[];
    const add=(x,y,dx,dy,rx,ry)=>points.push({x,y,dx,dy,rx,ry});
    f.brows.forEach(([x,y],i)=>{
      const side=i===0?-1:1;
      if(au==='AU1') add(x-side*16,y,0,-10,22,15);
      if(au==='AU2') add(x+side*18,y,0,-9,23,16);
      if(au==='AU4') {
        add(x-side*14,y,-side*4,9,24,13);
        add(x+side*18,y,0,2,20,13);
      }
    });
    f.eyes.forEach(([x,y],i)=>{
      const half=f.anime?13:7, width=f.anime?31:25;
      if(au==='AU5') add(x,y-half,0,-5,width,10);
      if(au==='AU6') {
        add(x,y+32,0,-6,36,25);
        add(x,y+half,0,-2,width,8);
      }
      if(au==='AU7') {add(x,y-half,0,3,width,8);add(x,y+half,0,-2,width,8);}
      if(au==='AU41') add(x,y-half,0,5,width,10);
      if(au==='AU46' && i===1) {add(x,y-half,0,8,width,10);add(x,y+half,0,-2,width,7);}
    });
    const [mx,my,mw]=f.mouth, [nx,ny]=f.nose;
    if(au==='AU9') {add(nx-15,ny,-1,-4,17,17);add(nx+15,ny,1,-4,17,17);}
    if(au==='AU10') add(mx,my-6,0,-5,mw*.75,12);
    [-1,1].forEach(side=>{
      if(au==='AU12') add(mx+side*mw,my,side*6,-10,22,21);
      if(au==='AU13') add(mx+side*mw,my,side*4,-2,20,18);
      if(au==='AU15') add(mx+side*mw,my,-side,7,21,21);
      if(au==='AU22') add(mx+side*mw,my,-side*2,0,17,15);
    });
    if(au==='AU22') {add(mx,my-6,0,-2,mw*.8,9);add(mx,my+8,0,3,mw*.8,10);}
    if(au==='AU16') add(mx,my+9,0,5,mw*.85,12);
    if(au==='AU17') {add(mx,f.chin-12,0,-6,38,22);add(mx,my+9,0,-2,mw,12);}
    // A single closed-mouth photo has no hidden teeth/interior. Keep jaw
    // motion restrained instead of painting a synthetic hole over the face.
    if(au==='AU26') {add(mx,f.chin-6,0,5,50,25);add(mx,my+11,0,3,mw,14);}
    if(au==='AU27') {add(mx,f.chin-6,0,7,50,25);add(mx,my+11,0,5,mw,14);add(mx,my-6,0,-2,mw*.8,9);}
    return points;
  }

  // Smooth compact-support kernels leave the hair/background exactly intact.
  function displacement(points,x,y) {
    let dx=0,dy=0;
    for(const p of points) {
      const r=Math.hypot((x-p.x)/p.rx,(y-p.y)/p.ry)/2;
      if(r>=1) continue;
      const w=(1-r)**4*(4*r+1);
      dx+=p.dx*w;dy+=p.dy*w;
    }
    return [dx,dy];
  }
  function buildFields(faceId) {
    return AU.map(au=>{
      const p=controls(faceId,au), field=new Float32Array(GRID*GRID*2);
      for(let y=0;y<GRID;y++) for(let x=0;x<GRID;x++) {
        const d=displacement(p,x*SIZE/(GRID-1),y*SIZE/(GRID-1)), k=(y*GRID+x)*2;
        field[k]=d[0];field[k+1]=d[1];
      }
      return field;
    });
  }
  function combine(fields,values,out=new Float32Array(GRID*GRID*2)) {
    out.fill(0);
    values.forEach((v,j)=>{
      if(v<.00001) return;
      const field=fields[j];
      for(let i=0;i<out.length;i++) out[i]+=field[i]*v;
    });
    // Bound extreme, overlapping AU combinations without changing exported AU values.
    for(let i=0;i<out.length;i+=2) {
      const length=Math.hypot(out[i],out[i+1]);
      if(length>16) {out[i]*=16/length;out[i+1]*=16/length;}
    }
    // Bound local stretch too: combined eyelid/jaw settings must not fold
    // the photo over itself. This affects the illustration, never the data.
    let slope=0;
    const step=SIZE/(GRID-1);
    for(let y=0;y<GRID-1;y++) for(let x=0;x<GRID-1;x++) {
      const k=(y*GRID+x)*2;
      for(let c=0;c<2;c++) {
        const dx=Math.max(Math.abs(out[k+2+c]-out[k+c]),Math.abs(out[k+GRID*2+2+c]-out[k+GRID*2+c]));
        const dy=Math.max(Math.abs(out[k+GRID*2+c]-out[k+c]),Math.abs(out[k+GRID*2+2+c]-out[k+2+c]));
        slope=Math.max(slope,(dx+dy)/step);
      }
    }
    if(slope>.72) for(let i=0;i<out.length;i++) out[i]*=.72/slope;
    return out;
  }

  function warp(source,output,map,width=SIZE,height=SIZE) {
    const gxScale=(GRID-1)/width,gyScale=(GRID-1)/height;
    for(let y=0;y<height;y++) {
      const gy=y*gyScale, iy=Math.floor(gy),ty=gy-iy;
      for(let x=0;x<width;x++) {
        const gx=x*gxScale,ix=Math.floor(gx),tx=gx-ix,k=(iy*GRID+ix)*2;
        const a=(1-tx)*(1-ty),b=tx*(1-ty),c=(1-tx)*ty,d=tx*ty;
        const dx=map[k]*a+map[k+2]*b+map[k+GRID*2]*c+map[k+GRID*2+2]*d;
        const dy=map[k+1]*a+map[k+3]*b+map[k+GRID*2+1]*c+map[k+GRID*2+3]*d;
        const sx=clamp(x-dx*width/SIZE,0,width-1), sy=clamp(y-dy*height/SIZE,0,height-1);
        const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(x0+1,width-1),y1=Math.min(y0+1,height-1);
        const fx=sx-x0,fy=sy-y0, p=(y0*width+x0)*4,q=(y0*width+x1)*4,r=(y1*width+x0)*4,s=(y1*width+x1)*4, dest=(y*width+x)*4;
        for(let channel=0;channel<3;channel++) output[dest+channel]=
          (source[p+channel]*(1-fx)+source[q+channel]*fx)*(1-fy)+(source[r+channel]*(1-fx)+source[s+channel]*fx)*fy;
        output[dest+3]=255;
      }
    }
    return output;
  }

  class PhotoPreview {
    constructor(canvas,photo,status) {
      this.canvas=canvas;this.photo=photo;this.status=status;
      this.ctx=canvas.getContext('2d');
      this.values=AU.map(()=>0);this.target=AU.map(()=>0);
      this.map=new Float32Array(GRID*GRID*2);
      this.cache=new Map();this.original=false;this.frame=0;this.request=0;
      this.motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    }
    async setFace(face) {
      if(this.faceId===face.id) return;
      this.faceId=face.id;
      const request=++this.request;
      cancelAnimationFrame(this.frame);this.frame=0;this.source=null;
      this.canvas.hidden=true;this.photo.hidden=true;
      this.canvas.parentElement.setAttribute('aria-busy','true');
      this.status.textContent='正在載入角色…';
      try {
        let data=this.cache.get(face.id);
        if(!data) {
          const img=new Image();img.src=face.thumb;await img.decode();
          const buffer=document.createElement('canvas');buffer.width=SIZE;buffer.height=SIZE;
          const ctx=buffer.getContext('2d',{willReadFrequently:true});
          ctx.drawImage(img,0,0,SIZE,SIZE);
          data={source:ctx.getImageData(0,0,SIZE,SIZE),fields:buildFields(face.id)};
          this.cache.set(face.id,data);
        }
        if(request!==this.request) return;
        this.source=data.source;this.fields=data.fields;
        this.canvas.width=SIZE;this.canvas.height=SIZE;
        this.output=this.ctx.createImageData(SIZE,SIZE);
        this.photo.src=face.thumb;this.photo.alt=face.label+'原始參考照片';
        this.canvas.setAttribute('aria-label',face.label+'的表情變化預覽');
        this.values=this.target.slice();
        this.draw();this.setOriginal(this.original);
        this.status.textContent='';
      } catch(error) {
        if(request!==this.request) return;
        this.faceId=null;
        this.status.textContent='角色照片無法載入，請重新選擇角色。';
      } finally {
        if(request===this.request) this.canvas.parentElement.setAttribute('aria-busy','false');
      }
    }
    setState(state) {
      this.target=AU.map(au=>strength(state[au]));
      if(this.source && !this.frame) this.frame=requestAnimationFrame(()=>this.animate());
    }
    setOriginal(original) {
      this.original=original;
      this.photo.hidden=!this.source || !original;
      this.canvas.hidden=!this.source || original;
      if(!original && this.source) this.draw();
    }
    animate() {
      this.frame=0;
      if(!this.source) return;
      let moving=false;
      this.values=this.values.map((v,i)=>{
        if(this.motion.matches || Math.abs(v-this.target[i])<.004) return this.target[i];
        moving=true;return v+(this.target[i]-v)*.36;
      });
      if(!this.original) this.draw();
      if(moving) this.frame=requestAnimationFrame(()=>this.animate());
    }
    draw() {
      if(!this.source) return;
      if(this.values.every(v=>v<.00001)) this.ctx.putImageData(this.source,0,0);
      else {
        combine(this.fields,this.values,this.map);
        warp(this.source.data,this.output.data,this.map);
        this.ctx.putImageData(this.output,0,0);
      }
    }
  }
  const api={AU,ANCHORS,SIZE,GRID,strength,controls,displacement,buildFields,combine,warp,PhotoPreview};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.FacsPreview=api;
})(typeof window==='undefined'?{}:window);
