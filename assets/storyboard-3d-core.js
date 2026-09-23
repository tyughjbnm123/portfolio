(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Storyboard3D=factory();})(globalThis,function(){
  'use strict';
  const SCHEMA='yichi-shot-composer/1',CHANNEL='yichi-storyboard-3d/1',MAX_OBJECTS=24;
  const SIZES={wide:'遠景',full:'全景',medium:'中景',mcu:'中近景',closeup:'近景'};
  const ANGLES={front:'正面',threeQuarterLeft:'左前方 45°',threeQuarterRight:'右前方 45°',profile:'側面',back:'背面',ots:'過肩鏡頭'};
  const ELEVATIONS={eye:'平視',low:'仰拍',high:'俯拍'};
  const COMPOSITIONS={center:['置中',.5,.5],leftThird:['左三分線',1/3,.5],rightThird:['右三分線',2/3,.5],upperThird:['上三分線',.5,2/3],lowerThird:['下三分線',.5,1/3],negativeSpace:['保留留白',.22,.5]};
  const TYPES=['male','female','child','cube','plane','cylinder','sphere','capsule','cone','torus'];
  const POSTURE_LENGTHS=[3,3,3,3,3,1,3,3,1,3,3,1,3,7,7,7,7,7,3,1,3,7,7,7,7,7];
  const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  const error=()=>{throw Error('3D 場景格式不正確，請重新建立構圖。');};
  function tuple(v,min=-10000,max=10000){if(!Array.isArray(v)||v.length!==3||!v.every(n=>finite(n,min,max)))error();return v.slice();}
  function posture(v){
    if(v==null)return undefined;
    if(v.version!==7||!Array.isArray(v.data)||v.data.length!==26)error();
    const data=v.data.map((row,i)=>{if(!Array.isArray(row)||row.length!==POSTURE_LENGTHS[i]||!row.every(n=>finite(n,-36000,36000)))error();return row.slice();});
    const result={version:7,data};
    if(v.extra){result.extra={};for(const key of ['l_elbow','r_elbow','l_knee','r_knee'])if(v.extra[key])result.extra[key]=tuple(v.extra[key],-36000,36000);}
    return result;
  }
  function params(v){
    if(!v||!Object.hasOwn(SIZES,v.shotSize)||!Object.hasOwn(ANGLES,v.angle)||!Object.hasOwn(ELEVATIONS,v.elevation)||!Object.hasOwn(COMPOSITIONS,v.composition?.id))error();
    const [label,screenX,screenY]=COMPOSITIONS[v.composition.id];
    return {shotSize:v.shotSize,angle:v.angle,elevation:v.elevation,composition:{id:v.composition.id,label,screenX,screenY}};
  }
  function normalize(v){
    if(!v||v.schema!==SCHEMA||JSON.stringify(v).length>1000000||!Array.isArray(v.objects)||v.objects.length>MAX_OBJECTS||!['9:16','16:9','1:1'].includes(v.ratio))error();
    const ids=new Set();
    const objects=v.objects.map(o=>{
      if(!o||typeof o.id!=='string'||!o.id.length||o.id.length>120||ids.has(o.id)||!TYPES.includes(o.type)||typeof o.name!=='string'||o.name.length>120||typeof o.visible!=='boolean'||typeof o.locked!=='boolean'||!o.transform)error();
      ids.add(o.id);
      const result={id:o.id,name:o.name,type:o.type,visible:o.visible,locked:o.locked,transform:{position:tuple(o.transform.position,-1000,1000),rotation:tuple(o.transform.rotation,-1000,1000),scale:tuple(o.transform.scale,.001,100)},keyframes:[],liveEditTime:0};
      if(o.posture)result.posture=posture(o.posture);
      if(o.defaultPosture)result.defaultPosture=posture(o.defaultPosture);
      return result;
    });
    const c=v.camera;
    if(!c||!finite(c.fov,1,150)||!finite(c.near,.0001,10)||!finite(c.far,1,100000)||c.far<=c.near)error();
    const camera={position:tuple(c.position,-1000,1000),target:tuple(c.target,-1000,1000),fov:c.fov,near:c.near,far:c.far};
    if(Math.hypot(...camera.position.map((n,i)=>n-camera.target[i]))<.00001)error();
    return {schema:SCHEMA,ratio:v.ratio,objects,selectedId:ids.has(v.selectedId)?v.selectedId:null,shotParams:params(v.shotParams),camera};
  }
  function describe(scene){const p=scene.shotParams;return `${SIZES[p.shotSize]}・${ANGLES[p.angle]}・${ELEVATIONS[p.elevation]}・${COMPOSITIONS[p.composition.id][0]}`;}
  function mapping(scene){const p=scene.shotParams;return {frame:{wide:'wide',full:'wide',medium:'medium',mcu:'close',closeup:'close'}[p.shotSize],camera:p.elevation==='low'?'lowAngle':p.elevation==='high'?'highAngle':p.angle==='profile'?'side':p.angle};}
  function envelope(data,token){return !!data&&data.channel===CHANNEL&&data.token===token&&typeof token==='string'&&token.length>=20;}
  return {SCHEMA,CHANNEL,MAX_OBJECTS,SIZES,ANGLES,ELEVATIONS,COMPOSITIONS,normalize,params,describe,mapping,envelope};
});
