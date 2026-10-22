(() => {
  'use strict';
  const KEY = 'yk-prd-builder.v1';
  const $ = s => document.querySelector(s);
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lines = t => String(t || '').split('\n').map(s => s.trim()).filter(Boolean);
  const PRIORITY = ['Must', 'Should', 'Could', "Won't"];
  const PRIORITY_LABEL = { Must: 'Must 必須', Should: 'Should 應該', Could: 'Could 可以', "Won't": "Won't 這次不做" };

  /* ---------- schema ---------- */
  const SECTIONS = [
    { id: 'meta', title: '文件資訊', hint: '讓讀的人知道這份文件在講什麼、誰負責、現在到哪個階段。', fields: [
      { k: 'name', label: '產品／功能名稱', ph: '例：會員點數兌換', wide: true },
      { k: 'version', label: '版本', ph: 'v0.1' },
      { k: 'owner', label: '負責 PM', ph: '你的名字' },
      { k: 'status', label: '狀態', type: 'select', options: ['草稿', '審核中', '已核准', '開發中', '已上線'] },
      { k: 'date', label: '更新日期', type: 'date' },
      { k: 'stakeholders', label: '利害關係人', ph: '例：行銷部（需求方）、工程（後端／前端）、客服、法務', type: 'textarea', wide: true },
      { k: 'links', label: '相關連結', ph: '設計稿、系統文件、會議紀錄（一行一個）', type: 'textarea', wide: true }
    ] },
    { id: 'background', title: '背景與問題', hint: '先講清楚問題，再談解法。寫得出數據或案例，討論會順很多。', fields: [
      { k: 'problem', label: '要解決的問題', ph: '誰、在什麼情況下、遇到什麼困難？', type: 'textarea', wide: true },
      { k: 'why', label: '為什麼是現在', ph: '例：旺季將至、客訴增加、合約到期', type: 'textarea', wide: true },
      { k: 'evidence', label: '依據', ph: '數據、客訴、訪談或競品觀察', type: 'textarea', wide: true }
    ] },
    { id: 'goals', title: '目標與成功指標', hint: '每個目標都要能被量測，上線後才知道有沒有成功。', list: 'goals', add: '新增目標', item: [
      { k: 'goal', label: '目標', ph: '例：提高點數使用率', wide: true },
      { k: 'metric', label: '衡量指標', ph: '例：月點數兌換率' },
      { k: 'baseline', label: '目前', ph: '例：8%' },
      { k: 'target', label: '目標值', ph: '例：上線 3 個月達 15%' }
    ] },
    { id: 'users', title: '目標使用者', hint: '這個功能是做給誰的？不同角色的需求要分開寫。', list: 'users', add: '新增使用者', item: [
      { k: 'persona', label: '使用者', ph: '例：一般會員' },
      { k: 'need', label: '需要什麼', ph: '例：知道點數能換什麼' },
      { k: 'pain', label: '目前的困擾', ph: '例：點數快過期才發現', wide: true }
    ] },
    { id: 'scope', title: '範圍', hint: '寫清楚「這次不做」，是避免範圍一直長大的最好方法。', fields: [
      { k: 'in', label: '這次要做（一行一項）', type: 'textarea', wide: true, rows: 4 },
      { k: 'out', label: '這次不做（一行一項）', type: 'textarea', wide: true, rows: 3 }
    ] },
    { id: 'stories', title: '使用者故事', hint: '用使用者的角度描述需求，每則都附上驗收條件。', list: 'stories', add: '新增使用者故事', item: [
      { k: 'role', label: '身為', ph: '一般會員' },
      { k: 'want', label: '我想要', ph: '用點數兌換商品', wide: true },
      { k: 'benefit', label: '以便', ph: '把累積的點數用掉', wide: true },
      { k: 'priority', label: '優先級', type: 'select', options: PRIORITY },
      { k: 'ac', label: '驗收條件（一行一條，可用 Given／When／Then）', type: 'textarea', wide: true, rows: 3 }
    ] },
    { id: 'reqs', title: '功能需求', hint: '工程估時看的就是這裡。一項一個可驗收的行為，編號會自動產生。', list: 'reqs', add: '新增功能需求', item: [
      { k: 'desc', label: '需求描述', type: 'textarea', wide: true, rows: 2 },
      { k: 'priority', label: '優先級', type: 'select', options: PRIORITY },
      { k: 'note', label: '備註', ph: '例：沿用既有會員 API' }
    ] },
    { id: 'nfr', title: '非功能需求', hint: '效能、權限、相容性這些沒寫，通常會在上線前一週才爆出來。', list: 'nfr', add: '新增非功能需求', item: [
      { k: 'type', label: '類型', type: 'select', options: ['效能', '安全與權限', '相容性', '可用性', '資料與隱私', '維運與監控', '法規'] },
      { k: 'desc', label: '要求', wide: true, ph: '例：兌換頁 3 秒內載入完成' }
    ] },
    { id: 'flow', title: '使用流程', hint: '一行一個步驟，會自動畫成流程圖。以「?」開頭是判斷；用「｜否：」寫出否的處理。', fields: [
      { k: 'steps', label: '流程步驟', type: 'textarea', wide: true, rows: 6, ph: '進入會員中心\n選擇兌換商品\n? 點數足夠｜否：顯示還差多少點\n確認兌換\n寄送兌換通知' },
      { k: 'mermaid', label: '進階：自訂 Mermaid（填了會取代上面的步驟）', type: 'textarea', wide: true, rows: 3, ph: 'flowchart TD\n  A[開始] --> B[結束]', mono: true }
    ] },
    { id: 'milestones', title: '時程與里程碑', hint: '寫到「誰在什麼時候交付什麼」。', list: 'milestones', add: '新增里程碑', item: [
      { k: 'name', label: '里程碑', ph: '例：UAT 驗收', wide: true },
      { k: 'date', label: '日期', type: 'date' },
      { k: 'owner', label: '負責人', ph: '例：PM／QA' }
    ] },
    { id: 'risks', title: '風險與相依', hint: '先寫下來的風險才有機會被處理。', list: 'risks', add: '新增風險或相依', item: [
      { k: 'risk', label: '風險／相依', wide: true },
      { k: 'impact', label: '影響', type: 'select', options: ['高', '中', '低'] },
      { k: 'mitigation', label: '對策', wide: true }
    ] },
    { id: 'questions', title: '待釐清問題', hint: '還不知道答案的事情，指定一個人負責回覆。', list: 'questions', add: '新增問題', item: [
      { k: 'q', label: '問題', wide: true },
      { k: 'owner', label: '請誰回答', ph: '例：工程主管' },
      { k: 'status', label: '狀態', type: 'select', options: ['待回覆', '已釐清'] }
    ] }
  ];

  /* ---------- templates ---------- */
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const blank = () => ({ meta: { name: '', version: 'v0.1', owner: '', status: '草稿', date: today(), stakeholders: '', links: '' }, background: { problem: '', why: '', evidence: '' }, goals: [{}], users: [{}], scope: { in: '', out: '' }, stories: [{ priority: 'Must' }], reqs: [{ priority: 'Must' }], nfr: [{ type: '效能' }], flow: { steps: '', mermaid: '' }, milestones: [{}], risks: [{ impact: '中' }], questions: [] });
  const TEMPLATES = {
    blank,
    feature: () => ({
      meta: { name: '【範例】會員點數兌換', version: 'v0.3', owner: '產品經理', status: '審核中', date: today(), stakeholders: '行銷部（需求方）\n工程：後端、前端\n客服：兌換問題處理\n財務：點數成本認列', links: '設計稿：Figma／點數兌換\n會員系統 API 文件' },
      background: { problem: '會員累積了點數，卻不知道能拿來做什麼。點數到期前沒有提醒，過期後常有客訴，點數也沒有帶動回購。', why: '年底點數大量到期，客服預估 12 月相關客訴會增加；行銷也希望用點數帶動年末檔期。', evidence: '近 6 個月過期點數占發出點數 41%；點數相關客訴每月約 30 件。' },
      goals: [{ goal: '提高點數使用率', metric: '月點數兌換率', baseline: '8%', target: '上線 3 個月達 15%' }, { goal: '降低點數過期客訴', metric: '每月點數客訴數', baseline: '30 件', target: '少於 10 件' }],
      users: [{ persona: '一般會員', need: '知道點數能換什麼、還有多久到期', pain: '點數快過期才發現，能換的東西也不清楚' }, { persona: '客服人員', need: '查詢會員的兌換紀錄', pain: '要請工程撈資料才能回覆' }],
      scope: { in: '點數兌換商品頁\n兌換確認與點數扣抵\n兌換成功通知（Email／LINE）\n點數到期前 30 天提醒\n客服後台兌換紀錄查詢', out: '點數轉贈給其他會員\n點數加價購\nApp 版本（先做網頁）' },
      stories: [
        { role: '一般會員', want: '在會員中心看到可以兌換的商品', benefit: '知道點數能拿來做什麼', priority: 'Must', ac: 'Given 已登入的會員\nWhen 進入會員中心的點數頁\nThen 顯示目前點數、到期日與可兌換商品' },
        { role: '一般會員', want: '用點數兌換商品', benefit: '把累積的點數用掉', priority: 'Must', ac: '點數足夠時可以完成兌換並即時扣點\n點數不足時顯示還差多少點，不能送出\n兌換成功後 5 分鐘內收到通知' },
        { role: '客服人員', want: '查詢會員的兌換紀錄', benefit: '不用再請工程撈資料', priority: 'Should', ac: '可以用手機或會員編號查詢\n顯示兌換時間、商品、扣點數與狀態' }
      ],
      reqs: [
        { desc: '點數頁顯示目前點數、最近到期點數與到期日', priority: 'Must', note: '沿用既有會員 API' },
        { desc: '兌換商品清單可由行銷在後台上下架、設定所需點數與庫存', priority: 'Must', note: '' },
        { desc: '兌換時檢查點數與庫存，成功後同步扣點並產生兌換單', priority: 'Must', note: '需處理重複點擊' },
        { desc: '點數到期前 30 天發送提醒通知', priority: 'Should', note: '排程每日 09:00' },
        { desc: '客服後台可查詢與匯出兌換紀錄', priority: 'Should', note: '' }
      ],
      nfr: [{ type: '效能', desc: '兌換頁在 4G 網路下 3 秒內載入完成' }, { type: '安全與權限', desc: '只有客服角色可以查詢其他會員的兌換紀錄' }, { type: '維運與監控', desc: '兌換失敗與扣點異常要通知工程與 PM' }],
      flow: { steps: '進入會員中心點數頁\n選擇兌換商品\n? 點數足夠｜否：顯示還差多少點\n? 庫存足夠｜否：顯示已兌換完畢\n確認兌換並扣點\n寄送兌換成功通知', mermaid: '' },
      milestones: [{ name: '需求凍結', date: '', owner: 'PM' }, { name: '設計定稿', date: '', owner: '設計' }, { name: 'UAT 驗收', date: '', owner: 'PM／QA' }, { name: '正式上線', date: '', owner: '工程' }],
      risks: [{ risk: '高峰時段重複點擊造成重複扣點', impact: '高', mitigation: '兌換 API 加冪等鍵，前端送出後鎖定按鈕' }, { risk: '依賴會員系統 API 的穩定性', impact: '中', mitigation: '上線前做壓力測試，失敗時顯示稍後再試' }],
      questions: [{ q: '兌換後可以取消並退回點數嗎？', owner: '行銷主管', status: '待回覆' }, { q: '點數成本由哪個部門認列？', owner: '財務', status: '已釐清' }]
    }),
    integration: () => ({
      meta: { name: '【範例】訂單自動通知供應商', version: 'v0.2', owner: '產品經理', status: '草稿', date: today(), stakeholders: '營運（需求方）\n供應商窗口\n工程／自動化負責人', links: '電商平台 Webhook 文件\n供應商對照表（Google Sheets）' },
      background: { problem: '營運每天要手動比對新訂單、依供應商分組再寄信通知出貨，訂單一多就會漏寄或寄錯，取消與退款也常沒有同步給供應商。', why: '檔期活動期間訂單量是平常的 3 倍，人工作業撐不住。', evidence: '上一檔期共發生 14 筆漏通知、3 筆取消未同步而誤出貨。' },
      goals: [{ goal: '訂單通知自動化', metric: '人工通知時數', baseline: '每天約 2 小時', target: '每天 15 分鐘以內' }, { goal: '降低漏通知與誤出貨', metric: '每月異常件數', baseline: '17 件', target: '0 件' }],
      users: [{ persona: '營運人員', need: '確認每筆訂單都有通知到', pain: '要在多個系統之間來回比對' }, { persona: '供應商', need: '準時收到正確的出貨資訊', pain: '取消訂單常常沒被告知' }],
      scope: { in: '接收電商平台的付款、取消、退款事件\n依商品對應供應商並寄送通知\n供應商在表單回填物流資訊後自動回寫出貨\n每日健康檢查報告\n異常通知', out: '供應商入口網站\n自動對帳與請款\n更換電商平台' },
      stories: [
        { role: '營運人員', want: '訂單付款後系統自動通知對應供應商', benefit: '不用再手動分組寄信', priority: 'Must', ac: '付款事件發生後 5 分鐘內寄出通知\n同一筆訂單有多個供應商時分別通知\n每次通知都留下執行紀錄' },
        { role: '供應商', want: '訂單取消或退款時立刻收到通知', benefit: '避免誤出貨', priority: 'Must', ac: '取消／退款事件同步通知該訂單的所有供應商\n通知內容包含訂單編號與商品明細' },
        { role: '營運人員', want: '每天收到一份異常報告', benefit: '快速處理沒對應到供應商的商品', priority: 'Should', ac: '每天 09:00 寄出前一日的異常清單' }
      ],
      reqs: [
        { desc: '接收電商平台 Webhook：paid、cancelled、refunded，依事件分流處理', priority: 'Must', note: '需驗證來源簽章' },
        { desc: '依商品編號查詢供應商對照表，組成通知內容並寄送', priority: 'Must', note: '' },
        { desc: '所有事件與通知寫入執行紀錄，可依訂單查詢', priority: 'Must', note: '' },
        { desc: '供應商回填物流單號後，自動呼叫平台出貨 API 並回寫狀態', priority: 'Should', note: '' },
        { desc: '找不到供應商、API 失敗時寄出異常通知', priority: 'Must', note: '' }
      ],
      nfr: [{ type: '可用性', desc: 'Webhook 漏接時，排程每小時補抓一次訂單' }, { type: '資料與隱私', desc: '通知供應商時只帶出貨必要的個資欄位' }, { type: '維運與監控', desc: '流程失敗時通知負責人，並保留可重送的紀錄' }],
      flow: { steps: '電商平台送出訂單事件\n? 事件類型為付款｜否：通知供應商取消或退款\n依商品對應供應商\n? 找到供應商｜否：寄出異常通知\n寄送出貨通知\n寫入執行紀錄', mermaid: '' },
      milestones: [{ name: '供應商對照表整理完成', date: '', owner: '營運' }, { name: '測試環境串接完成', date: '', owner: '工程' }, { name: '檔期前上線', date: '', owner: 'PM' }],
      risks: [{ risk: '供應商對照表資料不完整', impact: '高', mitigation: '上線前全量檢查，缺漏進入異常報告' }, { risk: '電商平台 API 呼叫上限', impact: '中', mitigation: '批次處理並設定重試間隔' }],
      questions: [{ q: '部分退款要怎麼通知供應商？', owner: '營運主管', status: '待回覆' }]
    }),
    website: () => ({
      meta: { name: '【範例】品牌官網改版與內容移轉', version: 'v0.1', owner: '產品經理', status: '草稿', date: today(), stakeholders: '品牌行銷（需求方）\n設計\n前後端工程\nSEO 顧問', links: '現行網站 Sitemap\n新版設計稿' },
      background: { problem: '現行官網內容分散、後台難以更新，行動版體驗差，舊網址也缺乏規劃，改版容易造成搜尋流量流失。', why: '品牌重塑，需要在新品發表前完成改版。', evidence: '行動版跳出率 68%；行銷每次更新內容都需要工程協助。' },
      goals: [{ goal: '改善行動版體驗', metric: '行動版跳出率', baseline: '68%', target: '低於 50%' }, { goal: '改版後維持搜尋流量', metric: '自然搜尋工作階段', baseline: '上線前 4 週平均', target: '上線後 8 週內回到 95% 以上' }],
      users: [{ persona: '潛在顧客', need: '快速找到產品資訊', pain: '手機上很難閱讀' }, { persona: '行銷人員', need: '自己更新文章與產品', pain: '每次都要排工程時間' }],
      scope: { in: '新版資訊架構與 Sitemap\n文章與產品內容移轉\nCMS 後台與權限\n表單與信件通知\nGA4 與 SEO 設定\n舊網址 301 轉址', out: '會員系統\n線上購物\n多語系（第二階段）' },
      stories: [
        { role: '行銷人員', want: '在後台新增與編輯文章', benefit: '不用等工程排程', priority: 'Must', ac: '可以新增、編輯、預覽、排程發布文章\n只有編輯以上權限可以發布' },
        { role: '潛在顧客', want: '用舊連結進來時看到對應的新頁面', benefit: '不會遇到找不到頁面', priority: 'Must', ac: '所有舊網址都有 301 轉址到對應新頁\n轉址清單上線前完成驗證' }
      ],
      reqs: [
        { desc: '依新版資訊架構建立頁面範本：首頁、產品列表、產品頁、文章列表、文章頁、聯絡我們', priority: 'Must', note: '' },
        { desc: '移轉既有文章與產品內容，保留發布日期與圖片', priority: 'Must', note: '' },
        { desc: '建立舊網址對新網址的 301 轉址表', priority: 'Must', note: 'SEO 顧問確認' },
        { desc: '聯絡表單送出後寄信通知品牌窗口與填寫者', priority: 'Should', note: '' }
      ],
      nfr: [{ type: '效能', desc: '行動版 Lighthouse 效能分數 80 以上' }, { type: '相容性', desc: '支援最新兩版 Chrome、Safari、Edge 與 iOS／Android 瀏覽器' }],
      flow: { steps: '盤點現行網站內容與網址\n確認新版資訊架構\n建立頁面範本與 CMS\n移轉內容\n? UAT 驗收通過｜否：修正後重新驗收\n設定 301 轉址與 GA4\n正式切換網域', mermaid: '' },
      milestones: [{ name: '資訊架構定稿', date: '', owner: 'PM' }, { name: '內容移轉完成', date: '', owner: '行銷／工程' }, { name: 'UAT', date: '', owner: 'PM' }, { name: '正式切換', date: '', owner: '工程' }],
      risks: [{ risk: '轉址遺漏造成搜尋流量下降', impact: '高', mitigation: '用爬蟲比對舊網址清單，上線後每週檢查 404' }, { risk: '內容移轉量大，時程延誤', impact: '中', mitigation: '先移轉流量前 20% 的頁面，其餘分批' }],
      questions: [{ q: '舊網站要保留多久？', owner: '品牌主管', status: '待回覆' }]
    })
  };

  /* ---------- state ---------- */
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || !S.meta) S = TEMPLATES.feature();
  const get = path => path.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
  function set(path, val) { const ks = path.split('.'); let o = S; ks.slice(0, -1).forEach(k => { o = o[k] ??= {}; }); o[ks[ks.length - 1]] = val; }

  /* ---------- form ---------- */
  const form = $('#prd-form');
  function field(f, path, val) {
    const id = 'f-' + path.replace(/\./g, '-');
    let ctl;
    if (f.type === 'select') ctl = `<select id="${id}" data-path="${path}">${f.options.map(o => `<option value="${esc(o)}"${o === val ? ' selected' : ''}>${esc(PRIORITY_LABEL[o] || o)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') ctl = `<textarea id="${id}" data-path="${path}" rows="${f.rows || 2}" placeholder="${esc(f.ph || '')}"${f.mono ? ' class="mono"' : ''}>${esc(val || '')}</textarea>`;
    else ctl = `<input id="${id}" data-path="${path}" type="${f.type === 'date' ? 'date' : 'text'}" value="${esc(val || '')}" placeholder="${esc(f.ph || '')}">`;
    return `<div class="prd-field${f.wide ? ' wide' : ''}"><label for="${id}">${esc(f.label)}</label>${ctl}</div>`;
  }
  function sectionHTML(sec, i) {
    let body = '';
    if (sec.fields) body = `<div class="prd-grid">${sec.fields.map(f => field(f, `${sec.id}.${f.k}`, get(`${sec.id}.${f.k}`))).join('')}</div>`;
    else {
      const arr = S[sec.list] ||= [];
      body = arr.map((it, j) => `<div class="prd-item"><div class="prd-item-head"><b>${sec.list === 'reqs' ? 'FR-' + String(j + 1).padStart(2, '0') : '#' + (j + 1)}</b><button type="button" class="prd-x" data-del="${sec.list}.${j}" aria-label="刪除這一項">刪除</button></div><div class="prd-grid">${sec.item.map(f => field(f, `${sec.list}.${j}.${f.k}`, it[f.k] ?? (f.type === 'select' ? f.options[0] : ''))).join('')}</div></div>`).join('')
        + `<button type="button" class="prd-add" data-add="${sec.list}">＋ ${esc(sec.add)}</button>`;
    }
    return `<fieldset class="prd-sec" id="sec-${sec.id}"><legend><span>${String(i + 1).padStart(2, '0')}</span>${esc(sec.title)}</legend><p class="prd-hint">${esc(sec.hint)}</p>${body}</fieldset>`;
  }
  function renderForm(onlyId) {
    if (onlyId) { const i = SECTIONS.findIndex(s => s.id === onlyId || s.list === onlyId); const el = $('#sec-' + SECTIONS[i].id); el.outerHTML = sectionHTML(SECTIONS[i], i); return; }
    form.innerHTML = SECTIONS.map(sectionHTML).join('');
  }
  form.addEventListener('input', e => {
    const p = e.target.dataset.path; if (!p) return;
    set(p, e.target.value); changed();
  });
  form.addEventListener('change', e => { if (e.target.tagName === 'SELECT' && e.target.dataset.path) { set(e.target.dataset.path, e.target.value); changed(); } });
  form.addEventListener('click', e => {
    const add = e.target.closest('[data-add]'), del = e.target.closest('[data-del]');
    if (add) { const k = add.dataset.add; const sec = SECTIONS.find(s => s.list === k); const it = {}; sec.item.forEach(f => { if (f.type === 'select') it[f.k] = f.options[0]; }); S[k].push(it); renderForm(k); changed(); const items = $('#sec-' + sec.id).querySelectorAll('.prd-item'); items[items.length - 1]?.querySelector('input,textarea')?.focus(); }
    if (del) { const [k, j] = del.dataset.del.split('.'); S[k].splice(+j, 1); renderForm(k); changed(); }
  });

  /* ---------- checks ---------- */
  function checks() {
    const filled = a => (a || []).filter(x => Object.entries(x).some(([k, v]) => !['priority', 'type', 'impact', 'status'].includes(k) && String(v || '').trim()));
    const st = filled(S.stories), rk = filled(S.risks), qs = filled(S.questions);
    return [
      ['meta', '填寫產品／功能名稱', !!S.meta.name?.trim()],
      ['meta', '寫上負責 PM', !!S.meta.owner?.trim()],
      ['background', '描述要解決的問題（至少一兩句話）', (S.background.problem || '').trim().length >= 10],
      ['goals', '至少一個目標附上衡量指標與目標值', (S.goals || []).some(g => g.goal && g.metric && g.target)],
      ['users', '說明目標使用者', (S.users || []).some(u => u.persona)],
      ['scope', '列出這次要做的範圍', lines(S.scope.in).length > 0],
      ['scope', '列出這次「不做」的範圍', lines(S.scope.out).length > 0],
      ['stories', '至少一則完整的使用者故事', st.some(s => s.role && s.want)],
      ['stories', '每則使用者故事都有驗收條件', st.length > 0 && st.every(s => lines(s.ac).length)],
      ['reqs', '功能需求至少一項標為 Must', (S.reqs || []).some(r => r.desc && r.priority === 'Must')],
      ['nfr', '補上非功能需求', (S.nfr || []).some(n => n.desc)],
      ['flow', '畫出主要流程（至少 3 步）', lines(S.flow.steps).length >= 3 || !!S.flow.mermaid?.trim()],
      ['milestones', '里程碑都有日期', filled(S.milestones).length > 0 && filled(S.milestones).every(m => m.date)],
      ['risks', '每個風險都有對策', rk.length > 0 && rk.every(r => r.mitigation)],
      ['questions', '待釐清問題都有人負責回答', qs.every(q => q.owner)]
    ];
  }
  function renderChecks() {
    const c = checks(), ok = c.filter(x => x[2]).length, pct = Math.round(ok / c.length * 100);
    $('#score').textContent = pct + '%'; $('#score-bar').style.width = pct + '%';
    $('#toc').innerHTML = SECTIONS.map((s, i) => {
      const mine = c.filter(x => x[0] === s.id); const state = !mine.length ? 'na' : mine.every(x => x[2]) ? 'ok' : mine.some(x => x[2]) ? 'part' : 'todo';
      return `<li><a href="#sec-${s.id}" data-state="${state}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</a></li>`;
    }).join('');
    const open = c.filter(x => !x[2]);
    $('#issues').innerHTML = open.length ? open.map(x => `<li><a href="#sec-${x[0]}">${esc(x[1])}</a></li>`).join('') : '<li class="done">都齊了，可以拿去討論了。</li>';
    const pending = (S.questions || []).filter(q => q.q && q.status !== '已釐清').length;
    if (pending) $('#issues').insertAdjacentHTML('beforeend', `<li class="info">還有 ${pending} 個問題待回覆</li>`);
  }

  /* ---------- flowchart ---------- */
  function flowCode() {
    if (S.flow.mermaid?.trim()) return S.flow.mermaid.trim();
    const st = lines(S.flow.steps); if (st.length < 2) return '';
    const q = t => '"' + t.replace(/"/g, "'") + '"';
    let out = ['flowchart TD'], prev = null, prevDecision = false, n = 0;
    st.forEach(line => {
      const id = 'S' + (++n);
      const dec = /^[?？]/.test(line);
      let text = line.replace(/^[?？]\s*/, ''), no = '';
      const m = text.split(/[｜|]\s*否[：:]\s*/); if (m.length > 1) { text = m[0].trim(); no = m[1].trim(); }
      out.push(dec ? `  ${id}{${q(text)}}` : `  ${id}[${q(text)}]`);
      if (prev) out.push(`  ${prev} -->${prevDecision ? '|是|' : ''} ${id}`);
      if (dec && no) { out.push(`  ${id}N[${q(no)}]`, `  ${id} -->|否| ${id}N`); }
      prev = id; prevDecision = dec;
    });
    return out.join('\n');
  }
  let mermaidReady = false, mCount = 0;
  function isDark() { return document.documentElement.dataset.ykTheme === 'dark'; }
  async function drawFlow() {
    const box = document.getElementById('flow-box'); if (!box) return;
    const code = flowCode(); if (!code) { box.innerHTML = '<p class="prd-muted">填寫流程步驟後，這裡會出現流程圖。</p>'; return; }
    if (!window.mermaid) { box.innerHTML = `<pre class="mono">${esc(code)}</pre>`; return; }
    if (!mermaidReady) { window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark() ? 'dark' : 'neutral', fontFamily: getComputedStyle(document.body).fontFamily, flowchart: { htmlLabels: false, wrappingWidth: 220, padding: 12 } }); mermaidReady = true; }
    try { const { svg } = await window.mermaid.render('prdflow' + (++mCount), code); box.innerHTML = svg; }
    catch { box.innerHTML = '<p class="prd-warn">流程圖語法有誤，請檢查自訂的 Mermaid 內容。</p>'; document.querySelectorAll('[id^="dprdflow"]').forEach(n => n.remove()); }
  }
  addEventListener('yk:theme', () => { mermaidReady = false; drawFlow(); });

  /* ---------- preview ---------- */
  const paras = t => lines(t).map(l => `<p>${esc(l)}</p>`).join('') || '<p class="prd-muted">（未填寫）</p>';
  const ul = t => { const l = lines(t); return l.length ? `<ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="prd-muted">（未填寫）</p>'; };
  const has = a => (a || []).filter(x => Object.entries(x).some(([k, v]) => !['priority', 'type', 'impact', 'status'].includes(k) && String(v || '').trim()));
  const table = (head, rows) => rows.length ? `<div class="prd-tablewrap"><table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="prd-muted">（未填寫）</p>';
  const pill = p => `<span class="prd-pill" data-p="${esc(p)}">${esc(p)}</span>`;
  function renderPreview() {
    const m = S.meta; let h = '';
    h += `<header class="prd-doc-head"><p>PRODUCT REQUIREMENTS DOCUMENT</p><h1>${esc(m.name || '未命名的 PRD')}</h1><dl>
      <div><dt>版本</dt><dd>${esc(m.version || '—')}</dd></div><div><dt>負責 PM</dt><dd>${esc(m.owner || '—')}</dd></div>
      <div><dt>狀態</dt><dd>${esc(m.status || '—')}</dd></div><div><dt>更新日期</dt><dd>${esc(m.date || '—')}</dd></div></dl>
      ${lines(m.stakeholders).length ? `<div class="prd-doc-meta"><b>利害關係人</b>${ul(m.stakeholders)}</div>` : ''}${lines(m.links).length ? `<div class="prd-doc-meta"><b>相關連結</b>${ul(m.links)}</div>` : ''}</header>`;
    let n = 0; const H = t => `<h2><span>${++n}.</span>${esc(t)}</h2>`;
    h += H('背景與問題') + `<h3>要解決的問題</h3>${paras(S.background.problem)}${S.background.why ? `<h3>為什麼是現在</h3>${paras(S.background.why)}` : ''}${S.background.evidence ? `<h3>依據</h3>${paras(S.background.evidence)}` : ''}`;
    h += H('目標與成功指標') + table(['目標', '衡量指標', '目前', '目標值'], has(S.goals).map(g => [esc(g.goal), esc(g.metric), esc(g.baseline), esc(g.target)]));
    h += H('目標使用者') + table(['使用者', '需要什麼', '目前的困擾'], has(S.users).map(u => [esc(u.persona), esc(u.need), esc(u.pain)]));
    h += H('範圍') + `<div class="prd-scope"><div><h3>這次要做</h3>${ul(S.scope.in)}</div><div><h3>這次不做</h3>${ul(S.scope.out)}</div></div>`;
    h += H('使用者故事') + (has(S.stories).map((s, i) => `<div class="prd-story"><p><b>US-${String(i + 1).padStart(2, '0')}</b> ${pill(s.priority || 'Must')}</p><p>身為<b>${esc(s.role || '…')}</b>，我想要<b>${esc(s.want || '…')}</b>${s.benefit ? `，以便${esc(s.benefit)}` : ''}。</p>${lines(s.ac).length ? `<p class="prd-ac">驗收條件</p>${ul(s.ac)}` : '<p class="prd-warn">尚未填寫驗收條件</p>'}</div>`).join('') || '<p class="prd-muted">（未填寫）</p>');
    h += H('功能需求') + table(['編號', '需求描述', '優先級', '備註'], (S.reqs || []).map((r, i) => r.desc ? [`FR-${String(i + 1).padStart(2, '0')}`, esc(r.desc), pill(r.priority || 'Must'), esc(r.note)] : null).filter(Boolean));
    h += H('非功能需求') + table(['類型', '要求'], has(S.nfr).map(x => [esc(x.type), esc(x.desc)]));
    h += H('使用流程') + `<div class="prd-flow" id="flow-box"></div>`;
    h += H('時程與里程碑') + table(['里程碑', '日期', '負責人'], has(S.milestones).map(x => [esc(x.name), esc(x.date || '待定'), esc(x.owner)]));
    h += H('風險與相依') + table(['風險／相依', '影響', '對策'], has(S.risks).map(x => [esc(x.risk), esc(x.impact), x.mitigation ? esc(x.mitigation) : '<span class="prd-warn">待補對策</span>']));
    h += H('待釐清問題') + table(['問題', '請誰回答', '狀態'], has(S.questions).map(x => [esc(x.q), esc(x.owner), esc(x.status || '待回覆')]));
    $('#paper').innerHTML = h; drawFlow();
  }

  /* ---------- markdown ---------- */
  function md() {
    const m = S.meta, o = [];
    const mdl = t => lines(t).map(x => `- ${x}`).join('\n') || '（未填寫）';
    const cell = t => String(t || '').replace(/\|/g, '／').replace(/\n/g, '<br>');
    const tbl = (head, rows) => rows.length ? [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n') : '（未填寫）';
    o.push(`# ${m.name || '未命名的 PRD'}`, '', tbl(['項目', '內容'], [['版本', m.version], ['負責 PM', m.owner], ['狀態', m.status], ['更新日期', m.date]]));
    if (lines(m.stakeholders).length) o.push('', '**利害關係人**', '', mdl(m.stakeholders));
    if (lines(m.links).length) o.push('', '**相關連結**', '', mdl(m.links));
    let n = 0; const H = t => { o.push('', `## ${++n}. ${t}`, ''); };
    H('背景與問題'); o.push('### 要解決的問題', '', S.background.problem || '（未填寫）'); if (S.background.why) o.push('', '### 為什麼是現在', '', S.background.why); if (S.background.evidence) o.push('', '### 依據', '', S.background.evidence);
    H('目標與成功指標'); o.push(tbl(['目標', '衡量指標', '目前', '目標值'], has(S.goals).map(g => [g.goal, g.metric, g.baseline, g.target])));
    H('目標使用者'); o.push(tbl(['使用者', '需要什麼', '目前的困擾'], has(S.users).map(u => [u.persona, u.need, u.pain])));
    H('範圍'); o.push('### 這次要做', '', mdl(S.scope.in), '', '### 這次不做', '', mdl(S.scope.out));
    H('使用者故事'); has(S.stories).forEach((s, i) => { o.push(`### US-${String(i + 1).padStart(2, '0')}（${s.priority || 'Must'}）`, '', `身為**${s.role || '…'}**，我想要**${s.want || '…'}**${s.benefit ? `，以便${s.benefit}` : ''}。`, '', '驗收條件：', '', mdl(s.ac), ''); });
    H('功能需求'); o.push(tbl(['編號', '需求描述', '優先級', '備註'], (S.reqs || []).map((r, i) => r.desc ? [`FR-${String(i + 1).padStart(2, '0')}`, r.desc, r.priority, r.note] : null).filter(Boolean)));
    H('非功能需求'); o.push(tbl(['類型', '要求'], has(S.nfr).map(x => [x.type, x.desc])));
    H('使用流程'); const fc = flowCode(); o.push(fc ? '```mermaid\n' + fc + '\n```' : '（未填寫）');
    H('時程與里程碑'); o.push(tbl(['里程碑', '日期', '負責人'], has(S.milestones).map(x => [x.name, x.date || '待定', x.owner])));
    H('風險與相依'); o.push(tbl(['風險／相依', '影響', '對策'], has(S.risks).map(x => [x.risk, x.impact, x.mitigation || '待補對策'])));
    H('待釐清問題'); o.push(tbl(['問題', '請誰回答', '狀態'], has(S.questions).map(x => [x.q, x.owner, x.status || '待回覆'])));
    return o.join('\n') + '\n';
  }

  /* ---------- save / io ---------- */
  let t = 0;
  function changed() { renderChecks(); clearTimeout(t); t = setTimeout(() => { renderPreview(); save(); }, 250); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); const d = new Date(); $('#saved').textContent = `已自動儲存 · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch { $('#saved').textContent = '這個瀏覽器無法自動儲存，請記得匯出'; } }
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2200); }
  const fname = ext => (S.meta.name || 'PRD').replace(/[\\/:*?"<>|【】\s]+/g, '-').replace(/^-|-$/g, '') + (S.meta.version ? '-' + S.meta.version : '') + ext;
  function download(text, name, type) { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  $('#btn-copy').addEventListener('click', async () => {
    const text = md();
    try { await navigator.clipboard.writeText(text); toast('已複製 Markdown，可以貼到 Notion、Confluence 或 GitHub'); }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select(); const ok = document.execCommand && document.execCommand('copy'); ta.remove(); toast(ok ? '已複製 Markdown' : '無法存取剪貼簿，請改用「下載 .md」'); }
  });
  $('#btn-md-dl').addEventListener('click', () => { download(md(), fname('.md'), 'text/markdown;charset=utf-8'); toast('已下載 Markdown 檔'); });
  $('#btn-json').addEventListener('click', () => { download(JSON.stringify(S, null, 2), fname('.json'), 'application/json'); toast('已匯出 JSON，之後可以再匯入繼續編輯'); });
  $('#btn-import').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (!j.meta) throw 0; S = { ...blank(), ...j }; renderAll(); save(); toast('已匯入 ' + f.name); }
    catch { toast('這個檔案不是 PRD 產生器匯出的 JSON'); }
    e.target.value = '';
  });
  $('#btn-print').addEventListener('click', () => { renderPreview(); setTimeout(() => window.print(), 300); });
  // templates with an in-page confirm
  let pendingTpl = '';
  $('#tpl').addEventListener('change', e => { pendingTpl = e.target.value; if (!pendingTpl) return; $('#confirm-text').textContent = `套用「${e.target.selectedOptions[0].text}」會取代目前的內容。要繼續嗎？`; $('#confirm').hidden = false; $('#confirm-yes').focus(); });
  $('#confirm-no').addEventListener('click', () => { $('#confirm').hidden = true; $('#tpl').value = ''; });
  $('#confirm-yes').addEventListener('click', () => { S = TEMPLATES[pendingTpl](); renderAll(); save(); $('#confirm').hidden = true; $('#tpl').value = ''; toast('已套用範本'); scrollTo({ top: 0, behavior: 'smooth' }); });
  // mobile tabs
  const setView = v => { $('#layout').dataset.view = v; $('#tab-edit').setAttribute('aria-selected', String(v === 'edit')); $('#tab-view').setAttribute('aria-selected', String(v === 'view')); if (v === 'view') drawFlow(); };
  $('#tab-edit').addEventListener('click', () => setView('edit'));
  $('#tab-view').addEventListener('click', () => setView('view'));
  document.addEventListener('click', e => { const a = e.target.closest('.prd-check a[href^="#sec-"]'); if (!a) return; e.preventDefault(); setView('edit'); const el = document.querySelector(a.getAttribute('href')); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); el?.querySelector('input,textarea,select')?.focus({ preventScroll: true }); });

  function renderAll() { renderForm(); renderChecks(); renderPreview(); }
  renderAll();
  // mermaid loads deferred; redraw once it is there
  addEventListener('load', () => drawFlow());
})();
