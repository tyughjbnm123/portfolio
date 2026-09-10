(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./storyboard-data.js'));else root.Storyboard=factory(root.StoryboardData);})(globalThis,function(D){
  'use strict';
  const MAX_SHOTS=12,round=n=>Math.round(n*10)/10;
  const CAM_LABELS={front:'正面平視',lowAngle:'低角度仰拍',highAngle:'高角度俯拍',side:'側面構圖',orbit:'緩慢環繞',pushPull:'緩慢推近',none:'固定鏡頭'};
  const FRAME_LABELS={wide:'全景',medium:'中景',close:'近景',detail:'產品特寫'};
  const STAGES={hook:'吸引目光',introduce:'帶出商品',experience:'使用情境',benefit:'留下印象',cta:'行動呼籲'};
  const BODY_ACTIONS={2:'雙手整理頭髮',5:'雙手托臉，頭部微傾',6:'頭部微傾',7:'單手遮住下半臉',10:'保持正面姿態',11:'用手指輕碰下巴',12:'用手托住下巴',13:'保持面向鏡頭',20:'緩慢深呼吸',21:'維持姿態，直視鏡頭',26:'以唇部為構圖中心',28:'雙手攤開',29:'視線輕輕上移',38:'把產品舉到臉側，朝鏡頭展示'};
  let serial=0;
  const uid=()=>`shot-${Date.now().toString(36)}-${++serial}`;
  function aus(expression='neutral',intensity=1){return Object.fromEntries(D.AU_ORDER.map(k=>[k,round(Math.min(4,(D.PRESETS_NATURAL[expression]?.[k]||0)*intensity))]));}
  function shot(values={}){return {id:uid(),name:'新分鏡',stage:'experience',duration:3,frame:'medium',camera:'front',actionId:0,expression:'neutral',intensity:1,aus:aus(),description:'',caption:'',narration:'',image:'assets/lora-cream-sample.jpg',imageLabel:'保養品廣告參考圖',imageFit:'cover',focusX:50,focusY:38,zoom:1,...values};}
  function demo(){return {schema:'yichi-storyboard/1',name:'把日常，留給自己',product:'日常保濕乳霜',audience:'想把保養融入生活的人',message:'為自己留一段簡單的保養時光',ratio:'9:16',target:15,music:'溫暖、輕盈的木吉他節奏，保留旁白空間',shots:[
    shot({name:'讓日常慢下來',stage:'hook',duration:3,frame:'close',camera:'pushPull',actionId:20,expression:'neutral',description:'暖光落在臉上，角色停下手邊的事，緩慢深呼吸。',caption:'今天，也留一點時間給自己。',narration:'忙碌的日常裡，',focusX:46,focusY:21,zoom:1.18}),
    shot({name:'主角，輕輕入鏡',stage:'introduce',duration:3,frame:'medium',camera:'front',actionId:38,expression:'happy',intensity:.55,aus:aus('happy',.55),description:'角色拿起乳霜，將瓶身標籤轉向鏡頭。手部動作簡單，產品保持清楚。',caption:'一瓶，剛剛好的日常。',narration:'從一個簡單的保養步驟開始。',focusX:64,focusY:43,zoom:1}),
    shot({name:'看見細節',stage:'experience',duration:4,frame:'detail',camera:'pushPull',actionId:0,expression:'neutral',description:'切到瓶身與按壓頭細節；乾淨背景，讓產品標籤與輪廓成為畫面重點。',caption:'簡單一點，從容一點。',narration:'把片刻，留給自己。',focusX:74,focusY:40,zoom:1.65}),
    shot({name:'把心情放鬆',stage:'benefit',duration:3,frame:'close',camera:'front',actionId:16,expression:'happy',aus:aus('happy'),description:'角色把頭髮輕撥到耳後，嘴角緩緩上揚，視線回到鏡頭。',caption:'喜歡此刻的自己。',narration:'也喜歡，這樣的自己。',focusX:45,focusY:21,zoom:1.18}),
    shot({name:'給一個清楚的入口',stage:'cta',duration:2,frame:'medium',camera:'none',actionId:38,expression:'happy',intensity:.55,aus:aus('happy',.55),description:'角色持產品定格，瓶身正面清楚可見，畫面留白放上品牌名稱與行動文字。',caption:'探索你的日常保養 ↗',narration:'現在，探索你的日常保養。',focusX:60,focusY:43,zoom:1})
  ]};}
  function timeline(project){let cursor=0;return project.shots.map(s=>{const start=cursor;cursor=round(cursor+Number(s.duration));return {id:s.id,start,end:cursor,duration:Number(s.duration)};});}
  function total(project){return timeline(project).at(-1)?.end||0;}
  function atTime(project,time){const rows=timeline(project);if(time>=rows.at(-1)?.end)return Math.max(0,rows.length-1);return Math.max(0,rows.findIndex(r=>time>=r.start&&time<r.end));}
  function activeAUs(s){return D.AU_ORDER.filter(k=>s.aus[k]>.05).map(k=>({id:k,label:D.AU_INFO[k].name,value:s.aus[k]}));}
  function expressionText(s){if(s.frame==='detail')return '此鏡以產品為主，無需角色表情。';const active=activeAUs(s);if(!active.length)return '五官自然放鬆，維持中性表情。';return active.map(v=>`${v.label} ${v.value.toFixed(1)}`).join('、')+'。';}
  function actionText(s){if(!s.actionId)return '保持穩定姿態，以畫面描述為準。';const a=D.ACTIONS.find(a=>a.id===s.actionId);return BODY_ACTIONS[s.actionId]||a?.zh||'未指定';}
  function prompt(project,s,index=project.shots.indexOf(s)){
    const row=timeline(project)[index];
    return [`鏡頭 ${String(index+1).padStart(2,'0')}｜${s.name}｜${row.start.toFixed(1)}–${row.end.toFixed(1)} 秒`,
      `目的：${STAGES[s.stage]}。`, `畫面：${s.description.trim()||'請補充畫面內容。'}`,`構圖：${project.ratio}，${FRAME_LABELS[s.frame]}；${CAM_LABELS[s.camera]}。`,
      `動作：${actionText(s)}`,`表情：${expressionText(s)}`,s.caption.trim()?`後製字幕：${s.caption.trim()}`:'',s.narration.trim()?`旁白：${s.narration.trim()}`:'',
      '一致性：延續同一角色、服裝、場景光線與產品外觀。字幕與品牌字樣於後製加入。'].filter(Boolean).join('\n');
  }
  function script(project){return [`# ${project.name||'未命名廣告'}`,`商品：${project.product}\n受眾：${project.audience}\n核心訊息：${project.message}\n版型：${project.ratio}｜總長 ${total(project).toFixed(1)} 秒｜目標 ${project.target} 秒\n音樂方向：${project.music}`,
    '以下為分鏡與生成指令。參考圖只用於構圖溝通；表情數值是本工具的 0–4 示意強度，不代表照片已完成變形。',...project.shots.map((s,i)=>prompt(project,s,i))].join('\n\n');}
  function warnings(project){const list=[];const diff=round(total(project)-project.target);if(diff!==0)list.push(`總長${diff>0?'超出':'少於'}目標 ${Math.abs(diff).toFixed(1)} 秒。`);project.shots.forEach((s,i)=>{if(!s.description.trim())list.push(`第 ${i+1} 鏡還沒有畫面描述。`);if(s.duration<1)list.push(`第 ${i+1} 鏡少於 1 秒，請確認動作來得及呈現。`);});return list;}
  function move(project,id,delta){const i=project.shots.findIndex(s=>s.id===id),j=i+delta;if(i<0||j<0||j>=project.shots.length)return false;[project.shots[i],project.shots[j]]=[project.shots[j],project.shots[i]];return true;}
  function validImage(value){return /^assets\/[a-zA-Z0-9_.-]+\.(jpg|png|webp)$/.test(value)||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);}
  function parseProject(raw){
    if(typeof raw!=='string'||raw.length>30000000)throw Error('專案檔過大，請使用 30 MB 以內的 JSON。');
    let p;try{p=JSON.parse(raw);}catch{throw Error('這不是有效的 JSON 專案檔。');}
    if(p?.schema!=='yichi-storyboard/1'||!Array.isArray(p.shots)||!p.shots.length||p.shots.length>MAX_SHOTS)throw Error('請選擇由此工作台匯出的分鏡專案（1–12 鏡）。');
    if(!['16:9','9:16','1:1'].includes(p.ratio)||![15,30,60].includes(p.target))throw Error('專案版型或目標秒數不正確。');
    for(const k of ['name','product','audience','message','music'])if(typeof p[k]!=='string'||p[k].length>2000)throw Error('專案文字格式不正確。');
    const shots=p.shots.map(s=>{
      for(const k of ['name','description','caption','narration','imageLabel'])if(typeof s[k]!=='string'||s[k].length>4000)throw Error('分鏡文字格式不正確。');
      if(!Number.isFinite(s.duration)||s.duration<.5||s.duration>30||!Number.isInteger(s.duration*2)||!Object.hasOwn(STAGES,s.stage)||!Object.hasOwn(FRAME_LABELS,s.frame)||!Object.hasOwn(CAM_LABELS,s.camera)||!(s.actionId===0||D.ACTIONS.some(a=>a.id===s.actionId)))throw Error('分鏡設定不正確。');
      if(!['custom',...Object.keys(D.EXPR_LABEL_ZH)].includes(s.expression)||!Number.isFinite(s.intensity)||s.intensity<.25||s.intensity>1.55||!s.aus||!D.AU_ORDER.every(k=>Number.isFinite(s.aus[k])&&s.aus[k]>=0&&s.aus[k]<=4))throw Error('表情設定不正確。');
      if(typeof s.image!=='string'||!validImage(s.image)||s.image.length>7500000||!Number.isFinite(s.focusX)||s.focusX<0||s.focusX>100||!Number.isFinite(s.focusY)||s.focusY<0||s.focusY>100||!Number.isFinite(s.zoom)||s.zoom<1||s.zoom>2)throw Error('參考圖或構圖參數不正確。');
      if(s.imageFit!==undefined&&!['cover','contain'].includes(s.imageFit))throw Error('圖片呈現設定不正確。');
      const clean=shot();for(const k of Object.keys(clean))if(k!=='id')clean[k]=k==='aus'?Object.fromEntries(D.AU_ORDER.map(au=>[au,s.aus[au]])):k==='imageFit'?(s.imageFit??'cover'):s[k];return clean;
    });
    return {schema:p.schema,...Object.fromEntries(['name','product','audience','message','ratio','target','music'].map(k=>[k,p[k]])),shots};
  }
  return {D,MAX_SHOTS,CAM_LABELS,FRAME_LABELS,STAGES,aus,shot,demo,timeline,total,atTime,activeAUs,expressionText,actionText,prompt,script,warnings,move,validImage,parseProject};
});
