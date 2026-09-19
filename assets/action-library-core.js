(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./storyboard-data.js'),require('./storyboard-core.js'));else root.ActionLibrary=factory(root.StoryboardData,root.Storyboard);})(globalThis,function(D,S){
  'use strict';
  const MAX=12,STORAGE='yichi-action-draft-v2',HANDOFF='yichi-action-handoff-v1';
  // Start/end captions describe two illustrated key poses, not generated video.
  const cues=[
    ['從全身開始','向上帶到臉部',3,'由下往上搖鏡'],['雙手靠近髮側','整理後露齒微笑',3],['微側面站立','回頭看向鏡頭',3],['往鏡頭走近','站定、看向鏡頭',4],
    ['雙手靠近臉側','托臉、閉眼歪頭',3],['自然直視鏡頭','歪頭、單眼眨眼',2],['手掌靠近下半臉','遮住下半臉、露出眼睛',2],['手抬到臉側','比耶、微微歪頭',2],
    ['雙手在胸前靠近','合成愛心、看向鏡頭',3],['嘴唇自然放鬆','輕輕嘟嘴',2],['手指靠近下巴','輕碰下巴、思考',2],['手抬到下巴附近','托住下巴、微笑',3],
    ['自然看向鏡頭','瞇眼、俏皮微笑',2,'瞇眼搞怪表情'],['側臉朝向一旁','慢慢轉回正面',3],['低頭、視線向下','抬頭看向鏡頭',3],['手靠近耳側','把側邊頭髮收好',3],
    ['雙手抬到眼前','手指比框、框住眼睛',3],['肩膀輕輕偏左','跟著節奏移向右側',2],['平視構圖','低角度帶到臉部',3,'低角度臉部構圖'],['閉眼、放鬆呼吸','緩緩睜眼',4],
    ['嘴角帶著微笑','回到平靜直視',3,'平靜直視鏡頭'],['從畫面側邊走入','在中央站定',4],['站在鏡頭前方','慢慢後退、留出空間',4],['正面站立','轉身背向鏡頭',3],
    ['手掌遮住臉部','放下手、露出表情',3],['臉部近景','推近嘴唇與微笑',3],['臉部近景','推近眼睛與視線',3],['雙手自然放下','攤開手、輕聳肩',2],
    ['自然直視','抿唇、視線輕輕上移',2,'抿唇向上看'],['正面站立','身體微側、臉朝鏡頭',3],['面向鏡頭站穩','小幅轉身、裙襬自然垂落',3],['雙腳站穩','輕跳、準備落地',2],
    ['雙手在胸前','雙手高舉、開心歡呼',2],['雙掌分開','合掌拍一下',2],['左腳踏步','換右腳踏步',3],['頭部轉向一側','回正、髮尾輕輕擺動',2],
    ['重心落在左腳','輕移到右腳、保持放鬆',3,'左右重心律動'],['產品放在腰前','舉到臉側、正面展示',3],['自然站立','手扶腰、擺好拍照姿勢',3],['手指靠近髮側','順著側邊髮絲整理',3],
    ['身體轉向後側','回眸看向鏡頭',3],['雙手自然垂放','雙手放入裙側口袋',3,'雙手插口袋'],['抬起手掌','小幅揮手、微笑',3],['雙手拿穩盒子','打開盒蓋、露出產品',4],
    ['展示瓶身側面','旋轉到正面、停住',4],['手背留出試用區','指腹推開少量乳霜',4],['手掌朝向留白區','指向資訊位置',3],['雙手平舉兩款產品','視線在兩款之間切換',4]
  ];
  const camera=new Set([1,19,26,27]),expression=new Set([6,10,13,14,15,20,21,29]),product=new Set([38,44,45,46,48]),gesture=new Set([2,5,7,8,9,11,12,16,17,25,28,33,34,40,43,47]);
  const ACTIONS=D.ACTIONS.map(a=>{const c=cues[a.id-1];return {...a,zh:c?.[3]||a.zh,cues:c?.slice(0,2)||[a.zh,a.zh],duration:c?.[2]||3,kind:camera.has(a.id)?'camera':product.has(a.id)?'product':expression.has(a.id)?'expression':gesture.has(a.id)?'gesture':'body',atlas:'assets/action-atlas-'+String(Math.ceil(a.id/4)).padStart(2,'0')+'.png',column:(a.id-1)%4};});
  const BY_ID=new Map(ACTIONS.map(a=>[a.id,a]));
  const KINDS={all:'全部',gesture:'手勢互動',body:'姿勢與移動',expression:'表情與視線',product:'產品展示',camera:'運鏡與取景'};
  function filterActions({search='',kind='all',stage='all',shot='all'}={}){const q=String(search).trim().toLowerCase();return ACTIONS.filter(a=>(kind==='all'||a.kind===kind)&&(stage==='all'||a.cat.includes(stage))&&(shot==='all'||a.shot===shot)&&(!q||`${a.id} ${a.zh} ${a.en} ${a.cues.join(' ')}`.toLowerCase().includes(q)));}
  function normalizeSelection(raw){if(!Array.isArray(raw))return [];return raw.slice(0,MAX).filter(v=>v&&BY_ID.has(v.id)).map(v=>({id:v.id,duration:Math.max(.5,Math.min(30,Math.round((Number(v.duration)||BY_ID.get(v.id).duration)*2)/2)),camera:Object.hasOwn(S.CAM_LABELS,v.camera)?v.camera:'front'}));}
  const total=sel=>Math.round(sel.reduce((n,s)=>n+s.duration,0)*10)/10;
  function recommend({style='sweet',tempo='slow',shot='balance'}={}){let ids=style==='cool'?[22,30,38,21]:style==='elegant'?[20,45,46,47]:style==='playful'?[43,8,44,33]:[43,38,45,47];if(shot==='close')ids=[20,6,38,45];return normalizeSelection(ids.map(id=>({id,duration:tempo==='fast'?2:BY_ID.get(id).duration,camera:'front'})));}
  function poseExpression(id){
    const smiling=new Set([2,3,4,5,6,8,9,12,13,16,18,25,26,28,30,31,32,33,34,35,36,37,38,39,40,41,43,44,45,47,48]);
    const expression=smiling.has(id)?'happy':'neutral',aus=S.aus(expression,.65);
    if(id===6)aus.AU46=2.5;
    if(id===10)aus.AU22=1.8;
    if(id===5)aus.AU41=3;
    return {expression:[5,6,10].includes(id)?'custom':expression,intensity:.65,aus};
  }
  function makeProject(selection,settings={},images={}){const clean=normalizeSelection(selection);if(!clean.length)throw Error('請先加入至少一個動作。');const duration=total(clean);return {schema:'yichi-storyboard/1',name:String(settings.name||'我的動作分鏡'),product:String(settings.product||''),audience:'',message:'',ratio:settings.ratio||'9:16',target:duration<=15?15:duration<=30?30:60,music:[settings.music,settings.song&&'參考曲目：'+settings.song].filter(Boolean).join('；'),shots:clean.map((v,i)=>{const a=BY_ID.get(v.id);return S.shot({name:a.zh,actionId:a.id,...poseExpression(a.id),stage:i===0?'hook':a.cat.includes('end')?'cta':a.kind==='product'?'introduce':'experience',duration:v.duration,frame:a.shot,camera:v.camera,description:[a.cues.join('，接著')+'。',settings.quality,settings.scene,settings.character,settings.props].filter(Boolean).join('\n'),image:images[a.id]||'assets/action-character.png',imageLabel:a.zh+'・姿勢參考',imageFit:'contain',zoom:1,focusX:50,focusY:50});})};}
  function prompt(selection,settings={},lang='zh'){
    const clean=normalizeSelection(selection);if(!clean.length)return '';
    let cursor=0;const english=lang==='en';
    const lines=clean.map((v,i)=>{const a=BY_ID.get(v.id),start=cursor;cursor+=v.duration;return `${String(i+1).padStart(2,'0')}｜${start.toFixed(1)}–${cursor.toFixed(1)}s｜${english?a.en:a.zh}\n${english?a.p:a.cues.join('，接著')+'。'}\n${english?'Camera':'運鏡'}: ${english?(D.CAM_PROMPT[v.camera]?.en||'static camera'):S.CAM_LABELS[v.camera]}`;});
    return [settings.name||'我的動作分鏡',`${english?'Total duration':'總長'}: ${total(clean)}s · ${settings.ratio||'9:16'}`,settings.quality&&`${english?'Visual style':'畫面質感'}: ${settings.quality}`,settings.scene&&`${english?'Scene':'場景'}: ${settings.scene}`,settings.character&&`${english?'Character':'角色'}: ${settings.character}`,settings.props&&`${english?'Props / constraints':'道具與限制'}: ${settings.props}`,settings.product&&`${english?'Product':'商品'}: ${settings.product}`,settings.music&&`${english?'Music direction':'音樂方向'}: ${settings.music}`,settings.song&&`${english?'Reference track':'參考曲目'}: ${settings.song}`,settings.bpm&&`${settings.bpm} BPM · ${settings.beats||2} ${english?'beats per cut (reference)':'拍切換參考；以分鏡秒數為準'}`,...lines,english?'Keep the same character, outfit, lighting and product across shots. Maintain natural anatomy. Add captions and logos in editing. The illustrated key poses are references; they do not guarantee the generated video result.':'全片延續同一角色、服裝、光線與產品。手部與肢體比例自然，字幕及品牌字樣於後製加入。兩格姿勢用於溝通動作方向，實際影片效果依生成工具而定。'].filter(Boolean).join('\n\n');
  }
  return {MAX,STORAGE,HANDOFF,ACTIONS,BY_ID,KINDS,filterActions,normalizeSelection,total,recommend,makeProject,prompt};
});
