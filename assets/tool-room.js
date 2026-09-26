(function(root){
  'use strict';
  const tools=[
    {id:'storyboard',short:'廣告分鏡',title:'廣告分鏡工作台',category:'影片創作',purpose:'把畫面、台詞與秒數排成廣告。',description:'上傳參考照片，安排開場、產品展示與收尾，補上字幕、旁白和秒數，預演後匯出分鏡稿。',path:'ad-storyboard.html',imageVersion:'20260919-clear-purpose',steps:['安排畫面','加入台詞與秒數','預演與匯出'],alt:'保養品廣告的開場人物、產品特寫與收尾照片，每鏡附字幕，並排列在十五秒時間軸上。'},
    {id:'video',short:'動作卡片',title:'短影片動作卡片庫',category:'影片創作',purpose:'挑一個動作，加入你的分鏡。',description:'從 48 張動漫角色動作卡挑選姿勢，對照起始與完成畫面，再把選好的動作帶進廣告分鏡工作台。',path:'ai-tools.html',imageVersion:'20260919-clear-purpose',steps:['挑選動作','比較起始與完成','加入分鏡'],alt:'同一個揮手動作的兩格姿勢對照：起始時抬手準備，完成時揮手微笑，搭配加入分鏡示意按鈕。'},
    {id:'facs',short:'表情控制',title:'表情控制器',category:'影片創作',purpose:'把「笑自然一點」，說得更具體。',description:'上傳照片、對齊五官並調整滑桿，查看局部表情變化，整理成可用的表情描述。',path:'facs-tool.html',steps:['上傳並裁切','對齊與調整五官','取得表情描述'],alt:'人像上的五官定位點搭配嘴角與眼睛控制滑桿，示意局部表情調整。'},
    {id:'line',short:'LINE 訊息',title:'LINE 訊息編排器',category:'行銷與活動',purpose:'訊息送出前，先看它長什麼樣。',description:'把圖片、文案與按鈕編成商品卡片，預覽手機裡的輪播訊息，再匯出 Flex Message。',path:'line-message.html',steps:['編排圖文','預覽手機訊息','匯出訊息'],alt:'商品圖片與文字編排在手機輪播訊息中，包含商品按鈕與多張卡片。'},
    {id:'utm',short:'UTM 連結',title:'UTM 連結產生器',category:'行銷與活動',purpose:'讓每個活動連結，都有清楚的來源。',description:'填入目的網址、來源、媒介與活動名稱，產生可用於流量分析的追蹤連結。',path:'utm-builder.html',steps:['填入網址','標記來源與活動','複製追蹤連結'],alt:'網址搭配來源 instagram、媒介 social 與活動 summer，合成帶有 UTM 參數的連結。'},
    {id:'raffle',short:'抽獎機',title:'抽獎機',category:'行銷與活動',purpose:'名單準備好，下一位幸運兒是誰？',description:'匯入名單、自訂獎項與名額，用抽獎球動畫揭曉得獎者，最後帶走得獎名單。',path:'raffle.html',imageVersion:'20260919-machine',steps:['匯入名單','設定獎項與人數','抽獎與複製結果'],alt:'抽獎工具實際的透明球槽、繽紛抽獎球與機台底座，右側為三位示範得獎者名單。'},
    {id:'prompt',short:'AI 指令庫',title:'AI 指令庫',category:'工作整理',purpose:'把指令與圖片效果一起收藏。',description:'保存指令內容與成果圖，透過關鍵字、平台和標籤找到需要的指令，再複製取用；新增與管理需登入。',path:'prompt-library.html',imageVersion:'20260920-prompt-image',steps:['查看成果圖','找到對應指令','複製取用'],alt:'左側是零食品牌聚會視覺的示範指令，右側是三位好友在暖紅餐桌分享零食的既有作品，示意指令與圖片一起收藏。'},
    {id:'slides',short:'簡報圖解',title:'簡報圖解助手',category:'簡報與溝通',purpose:'把想說的，變成看得懂的圖。',description:'貼上內容、選擇表達目的，比較三種圖解方式。調整文字與配色，再下載圖片放進簡報。',path:'slide-visualizer.html',image:'assets/tool-preview-slides.svg?v=20260926-mvp',steps:['整理表達重點','比較三種圖解','修改與下載'],alt:'簡報圖解助手示範：建立任務、在本機執行、回報結果，整理為三步流程圖。'}
  ];
  function mount(container){
    const picker=container.querySelector('.yk-tool-picker'),showcase=container.querySelector('.yk-tool-showcase'),image=showcase.querySelector('img');
    const buttons=[];
    function select(tool){
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tool===tool.id)));
      image.src=tool.image||`assets/tool-preview-${tool.id}.webp${tool.imageVersion?'?v='+tool.imageVersion:''}`;image.alt=tool.alt;
      showcase.querySelector('.yk-tool-category').textContent=tool.category;
      showcase.querySelector('h3').textContent=tool.title;
      showcase.querySelector('.yk-tool-purpose').textContent=tool.purpose;
      showcase.querySelector('.yk-tool-description').textContent=tool.description;
      const steps=showcase.querySelector('.yk-tool-flow');steps.replaceChildren();
      tool.steps.forEach(text=>{const li=document.createElement('li');li.textContent=text;steps.append(li);});
      const link=showcase.querySelector('.yk-tool-live');link.href=tool.path;link.textContent='開啟'+tool.short+' ↗';
      showcase.dataset.tool=tool.id;
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)image.animate([{opacity:.55,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'ease-out'});
    }
    tools.forEach((tool,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.tool=tool.id;
      const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
      const label=document.createElement('strong');label.textContent=tool.short;button.append(number,label);
      button.addEventListener('click',()=>select(tool));picker.append(button);buttons.push(button);
    });
    select(tools[0]);
  }
  const api={tools,mount};if(typeof module==='object'&&module.exports)module.exports=api;else root.ToolRoom=api;
})(typeof window==='undefined'?{}:window);
