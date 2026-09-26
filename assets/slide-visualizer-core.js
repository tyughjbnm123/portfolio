(function(root){
  'use strict';
  const palettes={
    sage:{bg:'#f5f3ed',paper:'#ffffff',ink:'#29372b',muted:'#62705e',accent:'#607b49',soft:'#e4ecd9',line:'#cbd7c1'},
    blue:{bg:'#f1f5fa',paper:'#ffffff',ink:'#23344e',muted:'#617089',accent:'#3a64a5',soft:'#e0e9f7',line:'#c5d4e9'},
    sand:{bg:'#faf4ed',paper:'#ffffff',ink:'#4d3529',muted:'#856b59',accent:'#a26243',soft:'#f2e2d3',line:'#dfcabb'}
  };
  const purposes={
    process:{label:'解釋流程',title:'讓每一步，都接得起來',layouts:['flow','steps','timeline'],names:['順序流程圖','步驟說明卡','階段路徑圖'],reasons:['先看順序，快速理解從哪裡開始、到哪裡結束。','每個步驟各有空間，適合補充操作與工作內容。','沿著路徑逐步說明，適合一次介紹一個階段。'],tip:'箭頭表示先後順序。若有分支或回頭流程，建議拆成另一頁。'},
    compare:{label:'比較差異',title:'把選項攤開，讓差異更清楚',layouts:['columns','rows','cards'],names:['並排比較','逐項對照','選項卡片'],reasons:['讓選項同時出現，方便觀眾左右比較。','一行看一個選項，適合較長的差異說明。','各自整理特色，適合先介紹選項再做選擇。'],tip:'每點代表一個選項。用相同維度描述，例如成本、時間與適用情境，才容易比較。'},
    change:{label:'說明改善',title:'從現況出發，看見改善方向',layouts:['columns','steps','cards'],names:['前後對照','改變的路徑','改善重點卡'],reasons:['將現況與改善方式並排，讓改變一眼可見。','依現況、行動與結果排列，說明改變怎麼發生。','分別強調改善重點，適合有多項調整的方案。'],tip:'請在重點中標明「原本／改善後」或「問題／作法／結果」。尚未驗證的成果，請標示為預期。'},
    system:{label:'介紹架構與分工',title:'看懂分工，理解如何一起運作',layouts:['layers','hub','cards'],names:['分層架構','核心與分工','元件角色卡'],reasons:['由上而下整理層次，適合有上下游關係的架構。','把共同目標放在中心，呈現各元件負責的事。','先認識元件與用途，適合向非技術觀眾介紹。'],tip:'連線只表達概念關係，不代表 API、資料流或權限。請依實際架構確認元件順序。'},
    plan:{label:'規劃時程與階段',title:'把方向拆成可以推進的階段',layouts:['timeline','steps','flow'],names:['階段時間軸','里程碑卡片','執行路線圖'],reasons:['沿著軸線看推進順序，適合介紹時程與階段。','每個里程碑各自說明，方便討論交付內容。','讓下一步清楚可見，適合交代執行安排。'],tip:'軸線表示階段順序，距離不代表工期。需要日期或負責人時，請直接寫在重點中。'},
    results:{label:'呈現成果',title:'讓成果，有清楚的重點',layouts:['metrics','cards','rows'],names:['成果指標卡','成果亮點卡','成果摘要列'],reasons:['放大原文中的數字，幫觀眾快速抓住成果。','一張卡說一項成果，適合搭配口頭解釋。','把成果逐項排列，適合短時間做完整回顧。'],tip:'指標直接取自你提供的文字，未填入數字時以文字呈現。請補上期間、單位與比較基準。'}
  };
  const examples={
    process:{content:'在 Web 建立任務、管理社群帳號\nRunner 取得任務，在本機執行操作\n執行進度與結果回報到管理端',takeaway:'把分散的社群工作集中管理'},
    compare:{content:'方案 A：人工整理，適合少量、臨時的任務\n方案 B：半自動化，保留人工確認並減少重複操作\n方案 C：流程自動化，適合固定規則與重複性高的任務',takeaway:'依任務量與變動程度，選擇合適的方式'},
    change:{content:'原本：各帳號分開處理，執行進度不易掌握\n改善後：任務集中安排，執行結果統一回報',takeaway:'讓每一個任務都有清楚的狀態'},
    system:{content:'管理端：建立任務、管理帳號、查看結果\n執行端：取得任務，協調本機工具並回報狀態\n工具與資料：提供執行環境、操作能力與紀錄保存',takeaway:'管理、執行與資料各有分工'},
    plan:{content:'第一階段：整理需求與使用情境\n第二階段：製作原型並確認操作流程\n第三階段：實作功能與測試\n第四階段：上線觀察，收集回饋並調整',takeaway:'每個階段都有可以確認的交付成果'},
    results:{content:'10 個月：完成初期成本回收\n200+ 粉絲：累積社群受眾\n服務流程：建立預約、交付與回收的作業方式',takeaway:'從服務設計，走到持續經營'}
  };
  function clean(value){return String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();}
  function extract(content){
    const source=clean(content);
    let parts=source.split(/\r?\n/).map(clean).filter(Boolean);
    if(parts.length<2) parts=source.split(/[。！？!?；;]|\s+[→➜]\s*|(?:接著|然後|最後)[，,]?/).map(clean).filter(Boolean);
    if(parts.length<2&&source.includes('，'))parts=source.split('，').map(clean).filter(Boolean);
    parts=parts.map(s=>s.replace(/^\s*(?:[-*•●]\s+|\d+(?:[.．]\s+|[、)）]\s*))/,'').trim()).filter(Boolean);
    if(parts.length<2)throw new Error('請提供至少 2 個重點。可以按 Enter，將內容拆成不同步驟或選項。');
    if(parts.length>6)throw new Error(`目前整理出 ${parts.length} 個重點。請合併成 2–6 點，讓這一頁有清楚的焦點。`);
    if(parts.some(s=>Array.from(s).length>96))throw new Error('有一個重點超過 96 字，請精簡或換行拆開，再產生圖解。');
    return parts;
  }
  function numberIn(text){return clean(text).match(/[-+]?\d[\d,]*(?:\.\d+)?\s*(?:%|％|\+|倍|個月|天|小時|分鐘|萬|億|元)?/)?.[0].trim()||'';}
  function make(content,purpose,takeaway){
    const key=Object.hasOwn(purposes,purpose)?purpose:'process',points=extract(content),message=clean(takeaway).slice(0,90);
    return {purpose:key,title:message&&message.length<=64?message:purposes[key].title,caption:message.length>64?message:'',points,palette:'sage',selected:0};
  }
  function restore(raw){
    if(!raw||raw.version!==1||typeof raw.source!=='string'||raw.source.length>2000||!Object.hasOwn(purposes,raw.purpose))return null;
    const m=raw.model;
    if(!m||!Object.hasOwn(purposes,m.purpose)||!Object.hasOwn(palettes,m.palette)||typeof m.title!=='string'||m.title.length>64||typeof m.caption!=='string'||m.caption.length>90||!Array.isArray(m.points)||m.points.length<2||m.points.length>6||m.points.some(p=>typeof p!=='string'||p.length>192)||!Number.isInteger(m.selected)||m.selected<0||m.selected>2)return null;
    return {version:1,source:clean(raw.source),purpose:raw.purpose,takeaway:clean(raw.takeaway).slice(0,90),dirty:!!raw.dirty,model:{purpose:m.purpose,palette:m.palette,title:clean(m.title),caption:clean(m.caption),points:m.points.map(p=>Array.from(clean(p)).slice(0,96).join('')),selected:m.selected}};
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function units(s){return Array.from(s).reduce((sum,c)=>sum+(/[\x20-\x7e]/.test(c)?.56:1),0);}
  function wrap(text,width,size){
    const lines=[];let line='';
    for(const char of Array.from(clean(text))){if(char==='\n'){lines.push(line);line='';continue;}if(line&&units(line+char)*size>width){lines.push(line);line=char;}else line+=char;}
    if(line||!lines.length)lines.push(line);return lines;
  }
  function textBox(text,x,y,w,h,size,color,weight=400,align='left'){
    let font=size,lines=wrap(text,w,font);
    while(lines.length*font*1.38>h&&font>10){font-=1;lines=wrap(text,w,font);}
    const base=y+(h-lines.length*font*1.38)/2+font;
    return `<text fill="${color}" font-size="${font}" font-weight="${weight}" text-anchor="${align==='center'?'middle':'start'}">${lines.map((l,i)=>`<tspan x="${x+(align==='center'?w/2:0)}" y="${base+i*font*1.38}">${esc(l)}</tspan>`).join('')}</text>`;
  }
  function render(model,index=model.selected){
    const purpose=purposes[model.purpose]||purposes.process,p=palettes[model.palette]||palettes.sage;
    const n=model.points.length,layout=purpose.layouts[index]||purpose.layouts[0],title=clean(model.title)||purpose.title;
    const points=model.points.map(clean),out=[];
    const rect=(x,y,w,h,fill=p.paper,stroke=p.line,r=14)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
    const txt=(text,x,y,w,h,size=24,color=p.ink,weight=400,align='left')=>textBox(text,x,y,w,h,size,color,weight,align);
    const line=(x1,y1,x2,y2,arrow=false)=>`<path d="M${x1},${y1} L${x2},${y2}" fill="none" stroke="${p.accent}" stroke-width="2"${arrow?' marker-end="url(#sv-arrow)"':''}/>`;
    const badge=(i,x,y)=>`<circle cx="${x}" cy="${y}" r="16" fill="${p.accent}"/>${txt(String(i+1).padStart(2,'0'),x-16,y-14,32,28,12,'#fff',600,'center')}`;
    const card=(i,x,y,w,h,number=true)=>rect(x,y,w,h)+ (number?badge(i,x+30,y+30):'')+txt(points[i],x+22,y+(number?54:16),w-44,h-(number?66:32),24);
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>${esc(points.join('；'))}</desc><defs><marker id="sv-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="${p.accent}" stroke-width="1.4"/></marker></defs><g font-family="Microsoft JhengHei, Segoe UI, Arial, sans-serif">`);
    out.push(rect(0,0,1200,675,p.bg,p.bg,0),txt(purpose.label+' / '+purpose.names[index],56,28,1000,28,13,p.accent,600),txt(title,56,70,1088,112,38,p.ink,600));
    if(layout==='flow'){
      const cols=n<=3?n:3,rows=Math.ceil(n/cols),gap=38,w=(1088-gap*(cols-1))/cols,h=rows===1?226:138,top=rows===1?244:218;
      const positions=points.map((_,i)=>{const row=Math.floor(i/cols),col=row%2?cols-1-i%cols:i%cols;return{x:56+col*(w+gap),y:top+row*(h+38)};});
      positions.forEach((pos,i)=>{if(i<n-1){const next=positions[i+1];out.push(pos.y===next.y?line(pos.x+(next.x>pos.x?w:0),pos.y+h/2,next.x+(next.x>pos.x?0:w),next.y+h/2,true):line(pos.x+w/2,pos.y+h,next.x+w/2,next.y,true));}});
      positions.forEach((pos,i)=>out.push(card(i,pos.x,pos.y,w,h)));
    }else if(layout==='steps'||layout==='cards'||layout==='metrics'){
      const cols=n<=3?n:3,rows=Math.ceil(n/cols),gap=18,w=(1088-gap*(cols-1))/cols,h=rows===1?280:155,top=rows===1?220:210;
      points.forEach((point,i)=>{
        const x=56+(i%cols)*(w+gap),y=top+Math.floor(i/cols)*(h+18);
        if(layout==='metrics'&&numberIn(point))out.push(rect(x,y,w,h),txt(numberIn(point),x+22,y+16,w-44,h*.4,48,p.accent,600),txt(point,x+22,y+h*.45,w-44,h*.47,22));
        else if(layout==='cards')out.push(rect(x,y,w,h),`<rect x="${x+22}" y="${y+22}" width="32" height="4" rx="2" fill="${p.accent}"/>`,txt(point,x+22,y+43,w-44,h-59,25));
        else out.push(card(i,x,y,w,h));
      });
    }else if(layout==='columns'){
      const cols=n<=3?n:Math.ceil(n/2),rows=Math.ceil(n/cols),gap=20,w=(1088-gap*(cols-1))/cols,h=rows===1?284:155,top=rows===1?219:210;
      points.forEach((point,i)=>{const x=56+(i%cols)*(w+gap),y=top+Math.floor(i/cols)*(h+18);out.push(rect(x,y,w,h,i===0?p.soft:p.paper),txt(point,x+26,y+22,w-52,h-44,26,p.ink,i===0?550:400));});
    }else if(layout==='rows'||layout==='layers'){
      const h=Math.min(112,(330-(n-1)*12)/n),top=211+(330-(h*n+12*(n-1)))/2;
      points.forEach((point,i)=>{const inset=layout==='layers'?Math.min(i*23,110):0,x=56+inset,w=1088-inset*2,y=top+i*(h+12);out.push(rect(x,y,w,h,i%2?p.paper:p.soft),badge(i,x+29,y+h/2),txt(point,x+60,y+6,w-82,h-12,24));});
    }else if(layout==='timeline'){
      const h=330/n,top=208;
      out.push(line(86,top+h/2,86,top+h*(n-.5)));
      points.forEach((point,i)=>{const y=top+i*h;out.push(badge(i,86,y+h/2),rect(127,y+4,1017,h-8),txt(point,150,y+11,967,h-22,25));});
    }else if(layout==='hub'){
      const rows=Math.ceil(n/2),h=Math.min(134,(330-(rows-1)*15)/rows),top=210+(330-(h*rows+15*(rows-1)))/2;
      const positions=points.map((_,i)=>({x:i%2?798:56,y:top+Math.floor(i/2)*(h+15)}));
      positions.forEach(pos=>out.push(line(pos.x===56?398:798,pos.y+h/2,pos.x===56?454:746,375)));
      out.push(rect(454,307,292,136,p.soft),txt('共同目標',477,316,246,26,14,p.accent,600,'center'),txt(model.caption||model.title||'協同運作',477,349,246,77,25,p.ink,550,'center'));
      positions.forEach((pos,i)=>out.push(rect(pos.x,pos.y,346,h),txt(points[i],pos.x+20,pos.y+14,306,h-28,22)));
    }
    if(model.caption)out.push(rect(56,581,1088,62,p.soft,p.soft,10),txt(model.caption,77,589,1046,46,21,p.ink,500));
    else out.push(`<path d="M56 606 H1144" stroke="${p.line}"/>`);
    out.push('</g></svg>');return out.join('');
  }
  function copyText(model){const p=purposes[model.purpose];return `${model.title||p.title}\n\n${model.points.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n${model.caption?`重點：${model.caption}\n\n`:''}圖解方式：${p.names[model.selected]}`;}
  const api={palettes,purposes,examples,extract,numberIn,make,restore,render,copyText,wrap};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.SlideVisualizer=api;
})(typeof window==='undefined'?{}:window);
