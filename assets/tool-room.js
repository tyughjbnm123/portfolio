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
    ,{id:'prd',short:'PRD 產生器',title:'PRD 產生器',category:'工作與簡報',purpose:'需求寫清楚，開發才不會重做。',description:'照欄位填寫背景、目標、使用者故事、功能需求與驗收條件，自動排成完整 PRD，附完整度檢查與流程圖，可匯出 Markdown 或 PDF。',path:'prd-builder.html',image:'assets/tool-preview-prd.webp?v=20261023',steps:['選範本或從空白開始','照欄位填寫','檢查缺漏並匯出'],alt:'PRD 產生器畫面：左側完整度檢查、中間欄位填寫、右側即時排版的 PRD 文件。'},
    {id:'music',short:'旋律創作',title:'旋律創作工具',category:'音樂創作',purpose:'把腦中的旋律，留下來。',description:'用虛擬鋼琴彈奏與錄製，保留音長、停頓和和弦。下載 WAV 與音符資料，再整理成可貼到 Suno 的風格描述。',path:'music/',image:'assets/tool-preview-music.webp?v=20261017',steps:['彈奏與錄製','下載旋律音檔','整理風格指令'],alt:'旋律創作工具實際畫面：兩個八度的鋼琴、錄製控制與音符時間軸。'}
  ];

  const categories=[
  {
    "id": "visual",
    "title": "影像與影片",
    "en": "Image & video",
    "description": "準備畫面，整理拍攝與創作素材。",
    "descriptionEn": "Plan scenes and prepare visual material."
  },
  {
    "id": "audio",
    "title": "音樂與聲音",
    "en": "Music & sound",
    "description": "從一段旋律開始，留下聲音的想法。",
    "descriptionEn": "Capture a musical idea, one note at a time."
  },
  {
    "id": "marketing",
    "title": "行銷與活動",
    "en": "Marketing & events",
    "description": "編排訊息、標記來源，準備互動活動。",
    "descriptionEn": "Prepare messages, campaign links and events."
  },
  {
    "id": "work",
    "title": "工作與簡報",
    "en": "Work & presentations",
    "description": "把資訊整理好，讓想法更容易傳達。",
    "descriptionEn": "Organize information and make ideas clearer."
  }
];
  const details={
  "storyboard": {
    "group": "visual",
    "tags": [
      "分鏡",
      "影片"
    ],
    "tagsEn": [
      "Storyboard",
      "Video"
    ],
    "en": {
      "short": "Storyboard",
      "title": "Ad storyboard studio",
      "purpose": "Turn scenes, dialogue and timing into an ad.",
      "description": "Arrange reference images, captions, voiceover and timing; preview and export a storyboard.",
      "steps": [
        "Arrange scenes",
        "Add dialogue and timing",
        "Preview and export"
      ],
      "alt": "Storyboard preview with reference images and a timeline."
    }
  },
  "video": {
    "group": "visual",
    "tags": [
      "動作",
      "參考素材"
    ],
    "tagsEn": [
      "Motion",
      "References"
    ],
    "en": {
      "short": "Action cards",
      "title": "Short-video action cards",
      "purpose": "Find a movement for your next scene.",
      "description": "Compare starting and finishing poses, then add the selected movement to your storyboard.",
      "steps": [
        "Choose a movement",
        "Compare poses",
        "Add to storyboard"
      ],
      "alt": "Starting and finishing poses for a waving action."
    }
  },
  "facs": {
    "group": "visual",
    "tags": [
      "表情",
      "AI 描述"
    ],
    "tagsEn": [
      "Expression",
      "AI prompts"
    ],
    "en": {
      "short": "Expressions",
      "title": "Expression controller",
      "purpose": "Make “a more natural smile” more specific.",
      "description": "Align facial features, adjust expression sliders and prepare an expression description.",
      "steps": [
        "Upload a portrait",
        "Align and adjust",
        "Get a description"
      ],
      "alt": "A portrait with facial landmarks and expression sliders."
    }
  },
  "line": {
    "group": "marketing",
    "tags": [
      "LINE",
      "訊息預覽"
    ],
    "tagsEn": [
      "LINE",
      "Message preview"
    ],
    "en": {
      "short": "LINE messages",
      "title": "LINE message composer",
      "purpose": "See your message before you send it.",
      "description": "Arrange images, copy and buttons; preview a carousel message and export Flex Message data.",
      "steps": [
        "Arrange content",
        "Preview the message",
        "Export"
      ],
      "alt": "Product cards in a LINE message preview."
    }
  },
  "utm": {
    "group": "marketing",
    "tags": [
      "追蹤連結",
      "流量分析"
    ],
    "tagsEn": [
      "Tracking links",
      "Analytics"
    ],
    "en": {
      "short": "UTM links",
      "title": "UTM link builder",
      "purpose": "Give every campaign link a clear source.",
      "description": "Add a destination, source, medium and campaign name to create a tracking link.",
      "steps": [
        "Enter a URL",
        "Add campaign details",
        "Copy the link"
      ],
      "alt": "A campaign URL with source, medium and campaign parameters."
    }
  },
  "raffle": {
    "group": "marketing",
    "tags": [
      "抽獎",
      "名單"
    ],
    "tagsEn": [
      "Raffle",
      "Participants"
    ],
    "en": {
      "short": "Raffle",
      "title": "Raffle machine",
      "purpose": "The list is ready. Who will be next?",
      "description": "Import participants, configure prizes and draw winners; copy the results when finished.",
      "steps": [
        "Import participants",
        "Set prizes",
        "Draw and copy results"
      ],
      "alt": "Raffle machine and a sample winners list."
    }
  },
  "prompt": {
    "group": "work",
    "tags": [
      "AI 指令",
      "素材收藏"
    ],
    "tagsEn": [
      "AI prompts",
      "Collections"
    ],
    "notice": "新增與管理需登入",
    "noticeEn": "Sign-in required to add or manage",
    "en": {
      "short": "Prompt library",
      "title": "AI prompt library",
      "purpose": "Keep a prompt and its visual result together.",
      "description": "Browse prompts and result images, search by keyword or tag, and copy a prompt. Adding and managing entries requires sign-in.",
      "steps": [
        "View results",
        "Find a prompt",
        "Copy and use"
      ],
      "alt": "An example prompt beside its visual result."
    }
  },
  "slides": {
    "group": "work",
    "tags": [
      "圖解",
      "簡報"
    ],
    "tagsEn": [
      "Diagrams",
      "Slides"
    ],
    "en": {
      "short": "Slide diagrams",
      "title": "Slide diagram helper",
      "purpose": "Turn what you want to say into a clear diagram.",
      "description": "Choose a communication goal, compare diagram layouts, edit text and colors, then download.",
      "steps": [
        "Define the message",
        "Compare layouts",
        "Edit and download"
      ],
      "alt": "A three-step process diagram in the slide helper."
    }
  },
  "prd": {
    "group": "work",
    "tags": [
      "PRD",
      "需求",
      "專案管理"
    ],
    "tagsEn": [
      "PRD",
      "Requirements",
      "Product"
    ],
    "en": {
      "short": "PRD builder",
      "title": "PRD builder",
      "purpose": "Write requirements clearly so nothing gets rebuilt.",
      "description": "Fill in background, goals, user stories, requirements and acceptance criteria; get a formatted PRD with a completeness check and flowchart, then export Markdown or PDF.",
      "steps": [
        "Start from a template",
        "Fill in the fields",
        "Check gaps and export"
      ],
      "alt": "The PRD builder with a completeness checklist, form fields and a live document preview."
    }
  },
  "music": {
    "group": "audio",
    "tags": [
      "鋼琴",
      "旋律",
      "Suno"
    ],
    "tagsEn": [
      "Piano",
      "Melody",
      "Suno"
    ],
    "en": {
      "short": "Melody studio",
      "title": "Melody studio",
      "purpose": "Keep the melody in your head.",
      "description": "Play an 88-key piano, record notes, rests and chords, download WAV and JSON, and prepare an English style and melody description.",
      "steps": [
        "Play and record",
        "Download the melody",
        "Prepare a prompt"
      ],
      "alt": "An 88-key piano with recording controls and a note timeline."
    }
  }
};
  tools.forEach(tool=>Object.assign(tool,details[tool.id],{category:categories.find(c=>c.id===details[tool.id].group).title}));
  tools.find(t=>t.id==='music').alt='旋律創作工具：88 鍵鋼琴、錄製控制與音符時間軸。';
  const language=()=>{try{return root.YKLanguage?.language||root.document?.documentElement.dataset.language||(root.localStorage?.getItem('yichi-language')==='en'?'en':'zh');}catch{return 'zh';}};
  const text=(tool,key,lang=language())=>lang==='en'?(tool.en?.[key]??tool[key]):tool[key];
  function mount(container){
    const picker=container.querySelector('.yk-tool-picker'),showcase=container.querySelector('.yk-tool-showcase'),image=showcase.querySelector('img');
    const featured=['storyboard','music','line','slides'].map(id=>tools.find(t=>t.id===id));
    const browse=container.querySelector('.yk-tool-browse');
    [picker,showcase,browse].filter(Boolean).forEach(el=>el.setAttribute('data-i18n-ignore',''));
    const buttons=[];let selected=featured[0];
    function select(tool){
      selected=tool;const en=language()==='en';
      buttons.forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.tool===tool.id));button.querySelector('strong').textContent=text(tools.find(t=>t.id===button.dataset.tool),'short');});
      if(browse){browse.querySelector('span').textContent=en?'A few tools to start with':'先挑一個工具開始';browse.querySelector('a').textContent=en?'Browse all tools ↗':'查看全部工具 ↗';}
      image.src=tool.image||`assets/tool-preview-${tool.id}.webp${tool.imageVersion?'?v='+tool.imageVersion:''}`;image.alt=text(tool,'alt');
      showcase.querySelector('figcaption').textContent=en?'Tool preview':'功能示意';
      const cat=categories.find(c=>c.id===tool.group);showcase.querySelector('.yk-tool-category').textContent=en?cat.en:cat.title;
      showcase.querySelector('h3').textContent=text(tool,'title');
      showcase.querySelector('.yk-tool-purpose').textContent=text(tool,'purpose');
      showcase.querySelector('.yk-tool-description').textContent=text(tool,'description');
      const steps=showcase.querySelector('.yk-tool-flow');steps.replaceChildren();
      text(tool,'steps').forEach(value=>{const li=document.createElement('li');li.textContent=value;steps.append(li);});
      const link=showcase.querySelector('.yk-tool-live');link.href=tool.path;link.textContent=(en?'Open ':'開啟')+text(tool,'short')+' ↗';
      showcase.dataset.tool=tool.id;
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)image.animate([{opacity:.55,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'ease-out'});
    }
    picker.replaceChildren();featured.forEach((tool,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.tool=tool.id;
      const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
      const label=document.createElement('strong');button.append(number,label);
      button.addEventListener('click',()=>select(tool));picker.append(button);buttons.push(button);
    });
    const refresh=()=>{if(!picker.isConnected){root.removeEventListener('yk:language',refresh);return;}select(selected);};
    root.addEventListener('yk:language',refresh);select(selected);
  }
  const api={tools,categories,text,language,mount};if(typeof module==='object'&&module.exports)module.exports=api;else root.ToolRoom=api;
})(typeof window==='undefined'?{}:window);
