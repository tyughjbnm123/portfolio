/* Browser-local crop and manual landmark editor. No image leaves this page. */
(function(root){
  'use strict';
  const SIZE=480;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const RATIOS={'1:1':1,'4:5':4/5,'3:4':3/4};
  const POINTS=[
    {id:'eyeR',label:'右眼',hint:'畫面左側眼睛中心',x:194,y:198},
    {id:'eyeL',label:'左眼',hint:'畫面右側眼睛中心',x:285,y:196},
    {id:'browR',label:'右眉',hint:'畫面左側眉毛中央',x:193,y:169},
    {id:'browL',label:'左眉',hint:'畫面右側眉毛中央',x:286,y:168},
    {id:'nose',label:'鼻尖',hint:'鼻尖中央',x:239,y:255},
    {id:'mouthR',label:'右嘴角',hint:'畫面左側嘴角',x:208,y:295},
    {id:'mouthL',label:'左嘴角',hint:'畫面右側嘴角',x:270,y:295},
    {id:'chin',label:'下巴',hint:'下巴最下緣',x:239,y:344}
  ];
  const freshPoints=()=>POINTS.map(p=>({...p}));
  function frameSize(ratio){return {width:SIZE,height:Math.round(SIZE/(RATIOS[ratio]||1))};}
  function cropGeometry(width,height,settings){
    const frame=frameSize(settings.ratio),zoom=clamp(Number(settings.zoom)||1,1,5);
    const scale=Math.max(frame.width/width,frame.height/height)*zoom;
    const overflowX=(width*scale-frame.width)/2,overflowY=(height*scale-frame.height)/2;
    const x=-overflowX+overflowX*clamp(Number(settings.x)||0,-100,100)/100;
    const y=-overflowY+overflowY*clamp(Number(settings.y)||0,-100,100)/100;
    return {...frame,scale,x,y,overflowX,overflowY,sx:-x/scale,sy:-y/scale,sw:frame.width/scale,sh:frame.height/scale};
  }
  function pointFromClient(clientX,clientY,rect){
    return [clamp((clientX-rect.left)/rect.width*SIZE,4,SIZE-4),clamp((clientY-rect.top)/rect.height*SIZE,4,SIZE-4)];
  }
  function markerError(message,pointIds=[]){const error=new Error(message);error.pointIds=pointIds;return error;}
  function normalizePoints(points){
    if(!Array.isArray(points)||points.length!==POINTS.length)throw markerError('五官標記不完整，請按「重置標記」後重新對齊。');
    const byId=new Map(points.map(p=>[p.id,p]));
    const normalized=POINTS.map(base=>{
      const p=byId.get(base.id);
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>SIZE||p.y<0||p.y>SIZE)throw markerError(`請將「${base.label}」標記放在照片範圍內。`,[base.id]);
      return {...base,x:p.x,y:p.y};
    });
    const p=Object.fromEntries(normalized.map(v=>[v.id,v]));
    const corrected=[];
    for(const [right,left,label]of [['eyeR','eyeL','眼睛'],['browR','browL','眉毛'],['mouthR','mouthL','嘴角']]){
      if(p[right].x>p[left].x){const a={x:p[right].x,y:p[right].y};Object.assign(p[right],{x:p[left].x,y:p[left].y});Object.assign(p[left],a);corrected.push(label);}
    }
    return {points:normalized,corrected};
  }
  function landmarks(points){
    const p=Object.fromEntries(normalizePoints(points).points.map(v=>[v.id,[v.x,v.y]]));
    const eyeSpan=p.eyeL[0]-p.eyeR[0],mouthSpan=p.mouthL[0]-p.mouthR[0];
    if(eyeSpan<4) throw markerError('1、2 眼睛標記太靠近，請分別放在兩眼中心；臉太小時可返回裁切放大。',['eyeR','eyeL']);
    if(mouthSpan<2) throw markerError('6、7 嘴角標記重疊，請分別放在嘴巴兩端。',['mouthR','mouthL']);
    const mx=(p.mouthR[0]+p.mouthL[0])/2,my=(p.mouthR[1]+p.mouthL[1])/2;
    const margin=Math.max(1,eyeSpan*.08);
    if(my<(p.eyeR[1]+p.eyeL[1])/2+margin) throw markerError('6、7 嘴角應放在眼睛下方，請確認這兩個標記的位置。',['mouthR','mouthL']);
    if(p.chin[1]<my+margin) throw markerError('8 下巴應放在嘴巴下方的臉部最下緣。',['chin']);
    return {eyes:[p.eyeR,p.eyeL],brows:[p.browR,p.browL],nose:p.nose,mouth:[mx,my,mouthSpan/2],chin:p.chin[1],scale:clamp(eyeSpan/92,.04,2.2)};
  }

  class UploadEditor {
    constructor({onApply,onRemove,onSelect}){
      this.onApply=onApply;this.onRemove=onRemove;this.onSelect=onSelect;
      this.saved=null;this.revision=0;this.loadId=0;this.selected=0;this.mode='crop';
      this.settings={ratio:'1:1',zoom:1,x:0,y:0};this.points=freshPoints();
      this.input=document.getElementById('faceUploadInput');this.status=document.getElementById('faceUploadStatus');
      this.dialog=document.createElement('dialog');this.dialog.className='face-crop-dialog';this.dialog.id='faceCropDialog';
      this.dialog.setAttribute('aria-labelledby','faceCropTitle');
      this.dialog.innerHTML=`
        <div class="face-crop-header"><div><span class="face-eyebrow">YOUR PORTRAIT</span><h2 id="faceCropTitle">裁切與對齊照片</h2></div><button type="button" class="face-upload-button" data-close aria-label="取消編輯照片">關閉 ×</button></div>
        <div class="face-crop-steps" aria-label="照片設定步驟"><span data-step="crop">01 裁切照片</span><span data-step="align">02 對齊五官</span></div>
        <div class="face-crop-layout">
          <div class="face-crop-image-column"><div class="face-crop-stage" id="faceCropStage" tabindex="0" aria-label="照片裁切區，可拖曳圖片或使用方向鍵移動">
            <canvas id="faceCropCanvas" width="480" height="480" aria-hidden="true"></canvas>
            <div class="face-crop-grid" aria-hidden="true"></div><div class="face-crop-points" id="faceCropPoints" hidden></div>
          </div><p class="face-crop-tip" id="faceCropTip">拖曳照片調整位置，將整張臉與下巴保留在框內。</p></div>
          <div class="face-crop-controls">
            <section id="faceCropSettings"><h3>調整取景</h3><label for="faceCropRatio">裁切比例</label><select id="faceCropRatio"><option value="1:1">1:1 正方形</option><option value="4:5">4:5 直式</option><option value="3:4">3:4 直式</option></select>
              <label for="faceCropZoom">照片縮放 <output id="faceCropZoomValue">100%</output></label><input id="faceCropZoom" type="range" min="1" max="5" step="0.01" value="1">
              <label for="faceCropX">水平位置</label><input id="faceCropX" type="range" min="-100" max="100" step="1" value="0">
              <label for="faceCropY">垂直位置</label><input id="faceCropY" type="range" min="-100" max="100" step="1" value="0">
              <button type="button" class="face-upload-button" id="faceCropReset">重置取景</button>
              <p class="face-crop-help">建議使用單人、正面、光線均勻的照片，眼睛和嘴巴不要被遮住。</p>
            </section>
            <section id="faceAlignSettings" hidden><h3>把標記放到五官上</h3><p class="face-crop-help">先選下方部位，再點照片定位；也可直接拖曳圓點。左右以照片中的人物為準。</p><div class="face-point-list" id="facePointList"></div><p class="face-point-current" id="facePointHint" aria-live="polite"></p><button type="button" class="face-upload-button" id="facePointsReset">重置標記</button></section>
          </div>
        </div>
        <div class="face-crop-footer"><p class="face-crop-error" id="faceCropError" role="alert" tabindex="-1"></p><div class="face-crop-footer-actions"><p>照片只在本機處理。套用後從中性表情開始。</p><div><button type="button" class="face-upload-button" id="faceCropBack" hidden>返回裁切</button><button type="button" class="face-upload-button face-upload-primary" id="faceCropNext">下一步：對齊五官</button><button type="button" class="face-upload-button face-upload-primary" id="faceCropApply" hidden>套用照片</button></div></div></div>`;
      document.body.appendChild(this.dialog);
      this.$=id=>this.dialog.querySelector('#'+id);
      this.stage=this.$('faceCropStage');this.canvas=this.$('faceCropCanvas');this.ctx=this.canvas.getContext('2d');
      this.pointLayer=this.$('faceCropPoints');this.pointList=this.$('facePointList');
      POINTS.forEach((p,i)=>{
        const dot=document.createElement('button');dot.type='button';dot.className='face-point';dot.dataset.point=String(i);dot.textContent=i+1;
        dot.setAttribute('aria-label',p.hint+'，可使用方向鍵微調');this.pointLayer.appendChild(dot);
        const item=document.createElement('button');item.type='button';item.textContent=(i+1)+' '+p.label;
        item.addEventListener('click',()=>this.selectPoint(i));this.pointList.appendChild(item);
        dot.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();this.selectPoint(i);this.nudgePoint(e.key,e.shiftKey?5:1);});
        dot.addEventListener('focus',()=>this.selectPoint(i));
      });
      document.getElementById('faceUploadBtn').addEventListener('click',()=>this.input.click());
      this.input.addEventListener('change',()=>{const file=this.input.files[0];this.input.value='';if(file)this.load(file);});
      document.getElementById('faceRecropBtn').addEventListener('click',()=>this.editSaved());
      document.getElementById('faceCustomBtn').addEventListener('click',()=>{if(this.saved)this.onSelect(this.saved.face);});
      document.getElementById('faceRemoveBtn').addEventListener('click',()=>{
        this.saved=null;this.image=null;this.loadId++;document.getElementById('faceCustomRow').hidden=true;this.status.textContent='已移除上傳照片。';this.onRemove();
      });
      this.dialog.querySelector('[data-close]').addEventListener('click',()=>this.dialog.close());
      this.dialog.addEventListener('close',()=>{this.loadId++;this.image=null;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);});
      this.$('faceCropRatio').addEventListener('change',e=>{this.settings.ratio=e.target.value;this.points=freshPoints();this.render();});
      for(const [id,key] of [['faceCropZoom','zoom'],['faceCropX','x'],['faceCropY','y']])this.$(id).addEventListener('input',e=>{this.settings[key]=Number(e.target.value);this.render();});
      this.$('faceCropReset').addEventListener('click',()=>{this.settings={...this.settings,zoom:1,x:0,y:0};this.render();});
      this.$('facePointsReset').addEventListener('click',()=>{this.clearError();this.points=freshPoints();this.render();});
      this.$('faceCropNext').addEventListener('click',()=>{this.setMode('align');this.pointList.children[0].focus({preventScroll:true});this.dialog.scrollTop=0;});
      this.$('faceCropBack').addEventListener('click',()=>this.setMode('crop'));
      this.$('faceCropApply').addEventListener('click',()=>this.apply());
      this.stage.addEventListener('pointerdown',e=>this.pointerDown(e));
      this.stage.addEventListener('pointermove',e=>this.pointerMove(e));
      const finishDrag=()=>{this.drag=null;};
      this.stage.addEventListener('pointerup',finishDrag);this.stage.addEventListener('pointercancel',finishDrag);this.stage.addEventListener('lostpointercapture',finishDrag);
      this.stage.addEventListener('keydown',e=>{
        if(e.target!==this.stage||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
        if(this.mode==='align')this.nudgePoint(e.key,e.shiftKey?5:1);
        else{const amount=e.shiftKey?10:2,key=e.key==='ArrowLeft'||e.key==='ArrowRight'?'x':'y';this.settings[key]=clamp(this.settings[key]+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-amount:amount),-100,100);this.render();}
      });
    }
    async load(file){
      const id=++this.loadId;
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)){this.status.textContent='請選擇 JPG、PNG 或 WebP 圖片。';return;}
      if(file.size>12*1024*1024){this.status.textContent='圖片超過 12 MB，請先縮小檔案後再上傳。';return;}
      this.status.textContent='正在讀取照片…';const url=URL.createObjectURL(file);
      try{
        const img=new Image();img.src=url;await img.decode();if(id!==this.loadId)return;
        if(img.naturalWidth<120||img.naturalHeight<120)throw new Error('圖片太小，請選擇寬、高至少 120 px 的照片。');
        if(img.naturalWidth*img.naturalHeight>48000000)throw new Error('圖片尺寸太大，請先縮小至 4,800 萬像素以內。');
        const scale=Math.min(1,2048/Math.max(img.naturalWidth,img.naturalHeight));
        const image=document.createElement('canvas');image.width=Math.round(img.naturalWidth*scale);image.height=Math.round(img.naturalHeight*scale);
        image.getContext('2d').drawImage(img,0,0,image.width,image.height);
        this.image=image;this.settings={ratio:'1:1',zoom:1,x:0,y:0};this.points=freshPoints();this.name=file.name;
        this.setMode('crop');this.dialog.showModal();this.stage.focus({preventScroll:true});this.dialog.scrollTop=0;this.status.textContent='';
      }catch(error){if(id===this.loadId)this.status.textContent=error.message?.startsWith('圖片')?error.message:'無法讀取這張照片，請改用有效的 JPG、PNG 或 WebP。';}
      finally{URL.revokeObjectURL(url);}
    }
    editSaved(){
      if(!this.saved)return;
      this.image=this.saved.image;this.settings={...this.saved.settings};this.points=this.saved.points.map(p=>({...p}));this.name=this.saved.name;
      this.setMode('crop');this.dialog.showModal();this.stage.focus({preventScroll:true});this.dialog.scrollTop=0;
    }
    setMode(mode){
      this.mode=mode;this.drag=null;this.clearError();
      const aligning=mode==='align';
      this.$('faceCropSettings').hidden=aligning;this.$('faceAlignSettings').hidden=!aligning;
      this.$('faceCropNext').hidden=aligning;this.$('faceCropBack').hidden=!aligning;this.$('faceCropApply').hidden=!aligning;
      this.pointLayer.hidden=!aligning;this.stage.dataset.mode=mode;
      this.stage.setAttribute('aria-label',aligning?'五官標記區，選擇部位後點擊照片定位':'照片裁切區，可拖曳圖片或使用方向鍵移動');
      this.$('faceCropTip').textContent=aligning?'拖曳圓點對齊五官；用 Tab 選取圓點後，也能按方向鍵微調。':'拖曳照片調整位置，將整張臉與下巴保留在框內。';
      this.dialog.querySelectorAll('[data-step]').forEach(el=>{if(el.dataset.step===mode)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
      this.selectPoint(0);this.render();
    }
    selectPoint(index){
      this.selected=index;this.$('facePointHint').textContent=(index+1)+' · '+POINTS[index].hint;
      [...this.pointLayer.children].forEach((el,i)=>el.setAttribute('aria-pressed',String(i===index)));
      [...this.pointList.children].forEach((el,i)=>el.setAttribute('aria-pressed',String(i===index)));
    }
    nudgePoint(key,amount){
      this.clearError();
      const p=this.points[this.selected],axis=key==='ArrowLeft'||key==='ArrowRight'?'x':'y';
      p[axis]=clamp(p[axis]+(key==='ArrowLeft'||key==='ArrowUp'?-amount:amount),4,SIZE-4);this.render();
    }
    pointerDown(e){
      if(!this.image||e.button!==0)return;e.preventDefault();
      this.clearError();
      const rect=this.stage.getBoundingClientRect();
      if(this.mode==='align'){
        const dot=e.target.closest('[data-point]');if(dot)this.selectPoint(Number(dot.dataset.point));
        else{const [x,y]=pointFromClient(e.clientX,e.clientY,rect);Object.assign(this.points[this.selected],{x,y});}
      }
      this.drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,start:{...this.settings},point:{...this.points[this.selected]},rect};
      this.stage.setPointerCapture(e.pointerId);this.render();
    }
    pointerMove(e){
      const d=this.drag;if(!d||d.pointer!==e.pointerId)return;
      if(this.mode==='align'){
        Object.assign(this.points[this.selected],{x:clamp(d.point.x+(e.clientX-d.x)/d.rect.width*SIZE,4,SIZE-4),y:clamp(d.point.y+(e.clientY-d.y)/d.rect.height*SIZE,4,SIZE-4)});
      }else{
        const g=cropGeometry(this.image.width,this.image.height,d.start);
        this.settings.x=g.overflowX?clamp(d.start.x+(e.clientX-d.x)/d.rect.width*g.width/g.overflowX*100,-100,100):0;
        this.settings.y=g.overflowY?clamp(d.start.y+(e.clientY-d.y)/d.rect.height*g.height/g.overflowY*100,-100,100):0;
      }
      this.render();
    }
    render(){
      if(!this.image)return;
      const g=cropGeometry(this.image.width,this.image.height,this.settings);
      this.canvas.width=g.width;this.canvas.height=g.height;this.stage.style.aspectRatio=String(g.width/g.height);
      this.stage.style.maxWidth=g.width/g.height<1?'360px':'420px';
      this.ctx.fillStyle='#f4f3ed';this.ctx.fillRect(0,0,g.width,g.height);
      this.ctx.drawImage(this.image,g.sx,g.sy,g.sw,g.sh,0,0,g.width,g.height);
      this.$('faceCropRatio').value=this.settings.ratio;
      for(const [id,key] of [['faceCropZoom','zoom'],['faceCropX','x'],['faceCropY','y']])this.$(id).value=this.settings[key];
      this.$('faceCropZoomValue').textContent=Math.round(this.settings.zoom*100)+'%';
      this.$('faceCropX').disabled=g.overflowX<.01;this.$('faceCropY').disabled=g.overflowY<.01;
      this.points.forEach((p,i)=>{const el=this.pointLayer.children[i];el.style.left=(p.x/SIZE*100)+'%';el.style.top=(p.y/SIZE*100)+'%';});
    }
    clearError(){
      this.$('faceCropError').textContent='';
      for(const dot of this.pointLayer.children)dot.removeAttribute('aria-invalid');
    }
    apply(){
      this.clearError();
      try{
        if(!this.image)throw Error('照片尚未讀取完成，請關閉視窗並重新選取圖片。');
        const normalized=normalizePoints(this.points),anchors=landmarks(normalized.points);
        this.points=normalized.points;this.render();
        const face={id:'user_photo',label:'我的照片',thumb:this.canvas.toDataURL('image/jpeg',.94),revision:++this.revision,anchors,width:this.canvas.width,height:this.canvas.height,cropRatio:this.settings.ratio};
        this.onApply(face);
        this.saved={face,image:this.image,settings:{...this.settings},points:this.points.map(p=>({...p})),name:this.name};
        document.getElementById('faceCustomRow').hidden=false;
        document.getElementById('faceCustomThumb').src=face.thumb;
        this.status.textContent='已套用照片。'+(normalized.corrected.length?`已依畫面左右校正${normalized.corrected.join('、')}標記。`:'')+(anchors.eyes[1][0]-anchors.eyes[0][0]<35?'臉部偏小，可重新裁切放大，讓表情變化更清楚。':'可選擇表情，或使用滑桿微調。');this.dialog.close();
        document.getElementById('faceCustomBtn').focus({preventScroll:true});
      }catch(error){
        const target=POINTS.findIndex(p=>error.pointIds?.includes(p.id));
        if(target>=0)this.selectPoint(target);
        [...this.pointLayer.children].forEach((dot,i)=>{if(error.pointIds?.includes(POINTS[i].id))dot.setAttribute('aria-invalid','true');});
        const message=this.$('faceCropError');message.textContent='尚未套用：'+(error.message||'請檢查標記位置，或重新選取照片。');message.focus({preventScroll:true});message.scrollIntoView({block:'nearest'});
      }
    }
  }
  const api={SIZE,RATIOS,POINTS,frameSize,cropGeometry,pointFromClient,normalizePoints,landmarks,freshPoints,UploadEditor};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FacsUpload=api;
})(typeof window==='undefined'?{}:window);
