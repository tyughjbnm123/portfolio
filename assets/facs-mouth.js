/* Local mouth-reference prototype. Photo pixels stay on this device.
 * Four calibrated references, inverse-mapped to one shared lip geometry.
 * Each bundled face owns its calibrated references; uploads keep the source warp.
 */
(function(root){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
  // Pixel coordinates in the original 480-square portrait. Profiles are
  // outer upper lip, inner upper lip, inner lower lip and outer lower lip.
  const PROFILES=[
    {half:31,corner:295,lip:[282,293.5,295.5,311]},
    {half:36,corner:289,lip:[280,288,300,310]},
    {half:30,corner:295,lip:[280,287,307,317]},
    {half:37,corner:288,lip:[280,287,310,318]}
  ];
  function profile(half,corner,...lip){return {half,corner,lip};}
  function config(file,cx,cy,rx,ry,top,bottom,profiles){
    return {cx,cy,rx,ry,top,bottom,profiles,files:[`facs-${file}.jpg`,...['smile','open','open-smile'].map(v=>`facs-mouth-${file}-${v}.webp`)]};
  }
  const CONFIGS={
    young_f:{cx:239,cy:309,rx:77,ry:47,top:261,bottom:358,profiles:PROFILES,files:['facs-young-f.jpg','facs-mouth-smile.webp','facs-mouth-open.webp','facs-mouth-open-smile.webp']},
    young_m:config('young-m',238,326,84,50,276,379,[profile(37,313,302,312,314,330),profile(41,307,297,307,315,329),profile(35,313,298,306,319,335),profile(43,302,294,303,318,334)]),
    cool_f:config('cool-f',241,297,70,43,250,342,[profile(28,282,270,281,283,298),profile(32,276,268,277,285,298),profile(28,281,267,276,289,301),profile(35,272,265,274,289,300)]),
    mature_m:config('mature-m',239,328,84,50,278,382,[profile(38,313,301,312,314,329),profile(40,308,299,307,315,329),profile(38,313,299,307,320,334),profile(43,303,296,305,320,334)]),
    cute:config('cute',244,312,74,45,267,360,[profile(29,302,289,300,302,317),profile(34,296,287,296,303,318),profile(28,300,285,295,306,320),profile(36,293,286,295,308,322)]),
    anime:config('anime',241,306,61,39,267,350,[profile(20,298,292,297,299,309),profile(28,293,289,293,299,309),profile(21,298,290,294,302,311),profile(29,290,286,289,305,315)])
  };
  const ASSET_URLS={}; // Filled only in the downloadable offline HTML.
  const faceKey=key=>String(key||'').endsWith(':0')?String(key).slice(0,-2):null;
  const hasReference=key=>Object.hasOwn(CONFIGS,faceKey(key));
  const MOUTH_AUS=new Set(['AU10','AU12','AU20','AU22','AU15','AU16','AU17','AU26','AU27']);
  function parameters(values){
    return {smile:clamp(values.AU12/1.8),open:clamp((values.AU26+values.AU27*.6)/1.2)};
  }
  function weights(smile,open){return [(1-smile)*(1-open),smile*(1-open),(1-smile)*open,smile*open];}
  function geometry(w,c=CONFIGS.young_f){const ps=c.profiles;return {half:ps.reduce((n,p,i)=>n+p.half*w[i],0),corner:ps.reduce((n,p,i)=>n+p.corner*w[i],0),lip:ps[0].lip.map((_,k)=>ps.reduce((n,p,i)=>n+p.lip[k]*w[i],0))};}
  function horizontal(p,c){
    return [c.cx-c.rx-6,c.cx-p.half,c.cx,c.cx+p.half,c.cx+c.rx+6];
  }
  function vertical(x,p,c=CONFIGS.young_f){
    const u=clamp(Math.abs(x-c.cx)/p.half), arch=1-u*u;
    return [c.top,...p.lip.map((y,i)=>p.corner+(y-p.corner)*arch+(i-1.5)*.8*(1-arch)),c.bottom];
  }
  function remap(v,from,to){
    let i=0;while(i<from.length-2&&v>from[i+1])i++;
    return to[i]+clamp((v-from[i])/(from[i+1]-from[i]))*(to[i+1]-to[i]);
  }
  function sample(data,x,y,c){
    x=clamp(x,0,479);y=clamp(y,0,479);
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const a=(iy*480+ix)*4+c,b=(iy*480+Math.min(ix+1,479))*4+c;
    const d=(Math.min(iy+1,479)*480+ix)*4+c,e=(Math.min(iy+1,479)*480+Math.min(ix+1,479))*4+c;
    return (data[a]*(1-fx)+data[b]*fx)*(1-fy)+(data[d]*(1-fx)+data[e]*fx)*fy;
  }
  function paint(destination,sources,smile,open,config=CONFIGS.young_f){
    if(smile<.00001&&open<.00001)return destination;
    const w=weights(smile,open),p=geometry(w,config),xs=horizontal(p,config);
    for(let x=Math.ceil(config.cx-config.rx);x<config.cx+config.rx;x++){
      const ys=vertical(x,p,config);
      const maps=config.profiles.map(q=>{const sx=remap(x,xs,horizontal(q,config));return {x:sx,y:vertical(sx,q,config)};});
      for(let y=Math.ceil(config.cy-config.ry);y<config.cy+config.ry;y++){
        const radius=Math.hypot((x-config.cx)/config.rx,(y-config.cy)/config.ry);
        if(radius>=1)continue;
        // Soft local mask, full strength around the mouth, zero near nose/hair.
        const edge=clamp((1-radius)/.28),alpha=edge*edge*(3-2*edge);
        const pixel=(y*480+x)*4, rgb=[0,0,0];
        // The neutral lip seam must not be blended into newly open lips,
        // including the lip edges; otherwise a second dark line survives.
        const interior=Math.abs(x-config.cx)<p.half&&y>=ys[1]&&y<=ys[4];
        const textureWeights=interior&&w[0]<.99999?[0,...w.slice(1).map(v=>v/(1-w[0]))]:w;
        for(let i=0;i<4;i++){
          if(textureWeights[i]<.00001)continue;
          const sy=remap(y,ys,maps[i].y);
          for(let c=0;c<3;c++)rgb[c]+=textureWeights[i]*sample(sources[i],maps[i].x,sy,c);
        }
        for(let c=0;c<3;c++)destination[pixel+c]=destination[pixel+c]*(1-alpha)+rgb[c]*alpha;
      }
    }
    return destination;
  }
  class MouthPreview {
    constructor(onReady){this.cache=new Map();this.jobs=new Map();this.errors=new Set();this.key=null;this.onReady=onReady;}
    get sources(){return this.cache.get(this.key)||null;}
    get failed(){return this.errors.has(this.key);}
    load(faceId){
      const key=faceKey(faceId);this.key=key;
      if(!hasReference(faceId))return Promise.resolve();
      if(this.jobs.has(key))return this.jobs.get(key);
      const job=Promise.all(CONFIGS[key].files.map(async file=>{
        const img=new Image();img.src=ASSET_URLS[file]||'assets/'+file;await img.decode();
        const canvas=document.createElement('canvas');canvas.width=canvas.height=480;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,480,480);
        return ctx.getImageData(0,0,480,480).data;
      })).then(sources=>{this.cache.set(key,sources);if(this.key===key)this.onReady();}).catch(()=>{this.errors.add(key);if(this.key===key)this.onReady();});
      this.jobs.set(key,job);return job;
    }
    supported(faceId){return hasReference(faceId)&&this.key===faceKey(faceId)&&!!this.sources;}
    render(data,values){const p=parameters(values);return paint(data,this.sources,p.smile,p.open,CONFIGS[this.key]);}
  }
  const api={parameters,weights,geometry,vertical,remap,paint,PROFILES,CONFIGS,hasReference,MOUTH_AUS,MouthPreview};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FacsMouth=api;
})(typeof window==='undefined'?{}:window);
