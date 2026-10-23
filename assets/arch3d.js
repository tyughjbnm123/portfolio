// 互動 3D 系統架構圖：節點可點選、資料沿著連線流動、可依步驟播放流程。
// 用法：<div class="arch3d-host" data-arch="mirror-shop"></div>，再呼叫 mountAll(root)。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const KIND = {
  source: { label: '觸發／入口', color: 0x4d73a0 },
  n8n: { label: 'n8n 自動化', color: 0xe0762b },
  data: { label: '資料', color: 0x3f8f86 },
  notify: { label: '通知／回覆', color: 0x9a6bc4 }
};

export const SPECS = {
  'mirror-shop': {
    title: '鏡好買電商自動化｜系統架構',
    lanes: [{ x: -17, label: '觸發來源／外部角色' }, { x: 0, label: '自動化｜n8n' }, { x: 17, label: '營運資料／通知' }],
    nodes: [
      { id: 'cyberbiz', lane: 0, z: -7, kind: 'source', t: 'Cyberbiz', d: 'Webhook：paid／cancelled／refunded；API：orders／products／shipping。' },
      { id: 'schedule', lane: 0, z: -1.5, kind: 'source', t: 'Schedule Trigger', d: '每小時與每日固定時段觸發排程。' },
      { id: 'supplier', lane: 0, z: 4, kind: 'source', t: '供應商操作端', d: '供應商在訂單列表填寫物流資料，並勾選「確認出貨」。' },
      { id: 'gas', lane: 0, z: 9.5, kind: 'source', t: 'Google Apps Script', d: '定時掃描確認出貨的訂單，POST 至 n8n Webhook。' },
      { id: 'order', lane: 1, z: -7, kind: 'n8n', t: '訂單事件整合', d: '依 paid／cancelled／refunded 三種事件即時分流，觸發對應供應商 Email 通知，並寫入執行紀錄與訂單列表。' },
      { id: 'health', lane: 1, z: -1.5, kind: 'n8n', t: '排程更新與健康檢查', d: '定時取得訂單、更新狀態、比對供應商主檔，整理缺漏與異常寄出健康檢查報告。' },
      { id: 'tags', lane: 1, z: 4, kind: 'n8n', t: '供應商主檔與商品標籤', d: '同步營運總表與 Data Table 的供應商對照，回填 Cyberbiz 商品 ID，標籤異常另寄報告。' },
      { id: 'ship', lane: 1, z: 9.5, kind: 'n8n', t: '物流接收與出貨回寫', d: '接收物流資料後呼叫 Cyberbiz 出貨 API，將結果回寫 Google Sheet 並發送內部通知。' },
      { id: 'dt', lane: 2, z: -8.5, kind: 'data', t: 'n8n Data Tables', d: '供應商對照、Webhook 紀錄與流程狀態。' },
      { id: 'ops', lane: 2, z: -4, kind: 'data', t: '營運總表', d: 'Google Sheet：供應商與商品主檔。' },
      { id: 'orders', lane: 2, z: .5, kind: 'data', t: '訂單列表', d: 'Google Sheet：各供應商訂單、物流資料與出貨狀態。' },
      { id: 'products', lane: 2, z: 5, kind: 'data', t: '產品資訊列表', d: 'Google Sheet：產品價位與 Cyberbiz 商品 ID。' },
      { id: 'email', lane: 2, z: 10, kind: 'notify', t: 'Email 通知', d: '供應商訂單通知、取消與退款通知、異常與健康檢查報告。' }
    ],
    edges: [
      ['cyberbiz', 'order', 'Webhook'], ['order', 'dt', '寫入紀錄'], ['order', 'orders', '寫入訂單'], ['order', 'email', '通知供應商'],
      ['schedule', 'health', '排程'], ['cyberbiz', 'health', 'API 讀取訂單'], ['health', 'ops', '比對主檔'], ['health', 'email', '健康報告'],
      ['tags', 'ops', '同步'], ['tags', 'dt', '供應商對照'], ['tags', 'products', '回填商品 ID'],
      ['supplier', 'orders', '填寫物流'], ['orders', 'gas', '定時掃描'], ['gas', 'ship', 'Webhook'], ['ship', 'cyberbiz', '出貨 API'], ['ship', 'orders', '回寫結果'], ['ship', 'email', '內部通知']
    ],
    steps: [
      { t: '訂單成立', d: '顧客付款後，Cyberbiz 送出 Webhook。n8n 依事件分流，寫入紀錄與訂單列表，並依商品寄信通知對應供應商。', e: [0, 1, 2, 3] },
      { t: '排程健康檢查', d: '排程定時讀取所有訂單、更新狀態並比對供應商主檔，把缺漏與異常整理成健康檢查報告寄出。', e: [4, 5, 6, 7] },
      { t: '商品標籤管理', d: '同步營運總表與 Data Table 的供應商對照，每天檢查商品的供應商標籤並回填 Cyberbiz 商品 ID。', e: [8, 9, 10] },
      { t: '供應商出貨回寫', d: '供應商填寫物流資料並確認出貨，Apps Script 定時掃描後觸發 n8n，呼叫 Cyberbiz 出貨 API 並回寫結果。', e: [11, 12, 13, 14, 15, 16] }
    ]
  },
  'n8n-attendance': {
    title: 'n8n 打卡系統 v2｜系統架構',
    lanes: [{ x: -17, label: '互動入口｜LINE' }, { x: 0, label: '自動化｜n8n' }, { x: 17, label: '資料與外部服務' }],
    nodes: [
      { id: 'user', lane: 0, z: -5, kind: 'source', t: 'LINE 使用者', d: '傳送打卡、打卡紀錄等指令。補打卡入口存在，但申請與主管審核尚未實作。' },
      { id: 'lineapi', lane: 0, z: 3, kind: 'source', t: 'LINE Messaging API', d: '把使用者訊息轉成 Webhook 事件送給 n8n，並顯示回覆。' },
      { id: 'main', lane: 1, z: -9, kind: 'n8n', t: '主工作流：打卡系統 v2', d: 'Webhook → init → 員工查詢 → 打卡與回覆。' },
      { id: 'auth', lane: 1, z: -3.5, kind: 'n8n', t: '授權與指令路由', d: '以 LINE User ID 驗證身分，依指令分派到打卡或紀錄查詢。' },
      { id: 'files', lane: 1, z: 1.5, kind: 'n8n', t: '打卡檔案與版本管理', d: '建立年份資料夾、複製打卡範本，比對範本版本。' },
      { id: 'clock', lane: 1, z: 6.5, kind: 'n8n', t: '上下班打卡與紀錄查詢', d: '新增上班時間、更新下班時間與工時；查詢本月打卡紀錄。' },
      { id: 'log', lane: 1, z: 11.5, kind: 'n8n', t: '系統日誌與錯誤處理', d: '記錄每次執行狀況，發生錯誤時送出 Error Alert。' },
      { id: 'reply', lane: 2, z: -9.5, kind: 'notify', t: 'LINE Reply API', d: '回覆打卡成功、打卡紀錄、未綁定與錯誤訊息。' },
      { id: 'emp', lane: 2, z: -5, kind: 'data', t: '員工主檔', d: 'Google Sheet：員工編號、英文名、LINE User ID。' },
      { id: 'drive', lane: 2, z: -.5, kind: 'data', t: '年份資料夾', d: 'Google Drive：依年份保存每位員工的打卡檔案。' },
      { id: 'att', lane: 2, z: 4, kind: 'data', t: '員工打卡檔案', d: 'Google Sheet：每月一個分頁，欄位為日期、上班、下班、工時。' },
      { id: 'tpl', lane: 2, z: 8.5, kind: 'data', t: '打卡範本', d: 'Google Sheet：建立新員工打卡檔時複製的範本。' },
      { id: 'syslog', lane: 2, z: 13, kind: 'data', t: 'System Log', d: 'Google Sheet：一般執行紀錄與警告／錯誤紀錄。' }
    ],
    edges: [
      ['user', 'lineapi', '傳送訊息'], ['lineapi', 'main', 'Webhook'],
      ['main', 'auth', '開始處理'], ['auth', 'emp', '查詢員工'],
      ['auth', 'files', '準備檔案'], ['files', 'drive', '建立資料夾'], ['files', 'tpl', '複製範本'], ['files', 'att', '開啟打卡檔'],
      ['auth', 'clock', '打卡／查詢'], ['clock', 'att', '寫入打卡'], ['main', 'reply', '回覆'], ['reply', 'user', '顯示結果'],
      ['main', 'log', '執行紀錄'], ['clock', 'log', '錯誤處理'], ['log', 'syslog', '寫入日誌']
    ],
    steps: [
      { t: '傳送打卡指令', d: '員工在 LINE 傳送打卡指令，LINE Messaging API 把訊息轉成 Webhook 送進 n8n。', e: [0, 1] },
      { t: '確認身分', d: '用 LINE User ID 對照員工主檔，確認是誰在打卡；找不到時回覆尚未綁定。', e: [2, 3] },
      { t: '準備打卡檔案', d: '依年份找到或建立資料夾，新員工從範本複製一份打卡檔。', e: [4, 5, 6, 7] },
      { t: '寫入並回覆', d: '依當日紀錄判斷上班或下班，寫入打卡檔，再用 LINE 回覆結果。', e: [8, 9, 10, 11] },
      { t: '紀錄與錯誤通知', d: '每次執行都寫入 System Log，發生錯誤時送出通知。', e: [12, 13, 14] }
    ]
  }
};

const STYLE = `
.arch3d{position:relative;border:1px solid var(--yk-line,#d5dccb);border-radius:16px;overflow:hidden;background:var(--yk-surface,#fdfcf8);font-family:inherit}
.arch3d-stage{position:relative;height:clamp(380px,46vw,540px);touch-action:pan-y}
.arch3d-stage canvas{display:block;width:100%;height:100%;cursor:grab}
.arch3d-labels{position:absolute;inset:0;pointer-events:none}
.arch3d-node{pointer-events:auto;cursor:pointer;padding:5px 10px;border-radius:9px;background:var(--yk-surface,#fff);border:1px solid var(--yk-line,#d5dccb);box-shadow:0 4px 12px rgba(0,0,0,.12);font-size:12px;font-weight:600;color:var(--yk-ink,#30382f);white-space:nowrap;transition:opacity .25s,transform .2s;display:flex;align-items:center;gap:6px}
.arch3d-node i{width:8px;height:8px;border-radius:50%;flex:none}
.arch3d-node:hover{transform:translateY(-2px)}
.arch3d-node.dim{opacity:.28}
.arch3d-node.sel{outline:2px solid var(--yk-accent,#536f35);outline-offset:1px}
.arch3d-lane{font-size:11px;letter-spacing:.12em;color:var(--yk-muted,#646f5d);font-weight:600;white-space:nowrap;text-transform:uppercase}
.arch3d-edge{font-size:10.5px;color:var(--yk-ink,#30382f);background:color-mix(in srgb,var(--yk-surface,#fff) 88%,transparent);padding:1px 6px;border-radius:6px;white-space:nowrap;opacity:0;transition:opacity .25s}
.arch3d-edge.on{opacity:1}
.arch3d-info{position:absolute;left:12px;top:12px;max-width:min(300px,calc(100% - 24px));padding:12px 14px;border-radius:12px;background:var(--yk-surface,#fff);border:1px solid var(--yk-line,#d5dccb);box-shadow:0 10px 30px rgba(0,0,0,.15);font-size:13px;line-height:1.7;color:var(--yk-ink,#30382f)}
.arch3d-info b{display:block;font-size:14px;margin-bottom:2px}
.arch3d-info small{display:inline-block;font-size:11px;padding:1px 8px;border-radius:999px;color:#fff;margin-bottom:6px}
.arch3d-info button{position:absolute;top:6px;right:6px;border:0;background:none;font-size:16px;cursor:pointer;color:var(--yk-muted,#646f5d);width:28px;height:28px}
.arch3d-hint{position:absolute;right:12px;top:12px;font-size:11px;color:var(--yk-muted,#646f5d);background:color-mix(in srgb,var(--yk-surface,#fff) 80%,transparent);padding:4px 10px;border-radius:999px}
.arch3d-zoom{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;gap:4px}
.arch3d-zoom button{width:34px;height:34px;border-radius:10px;border:1px solid var(--yk-line,#d5dccb);background:var(--yk-surface,#fff);color:var(--yk-ink,#30382f);font-size:16px;cursor:pointer}
.arch3d-bar{display:grid;gap:10px;padding:14px 16px;border-top:1px solid var(--yk-line,#d5dccb)}
.arch3d-steps{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.arch3d-steps button{height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--yk-line,#d5dccb);background:var(--yk-bg,#f5f3ed);color:var(--yk-ink,#30382f);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}
.arch3d-steps button[aria-pressed="true"]{background:var(--yk-ink,#30382f);color:var(--yk-bg,#f5f3ed);border-color:var(--yk-ink,#30382f)}
.arch3d-steps .arch3d-play{background:var(--yk-accent,#536f35);color:var(--yk-on-accent,#fff);border-color:var(--yk-accent,#536f35);font-weight:600}
.arch3d-caption{margin:0;font-size:13.5px;line-height:1.75;color:var(--yk-muted,#646f5d);min-height:3.4em}
.arch3d-caption b{color:var(--yk-ink,#30382f)}
.arch3d-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:11.5px;color:var(--yk-muted,#646f5d)}
.arch3d-legend span{display:inline-flex;align-items:center;gap:5px}
.arch3d-legend i{width:9px;height:9px;border-radius:50%}
.arch3d-node.dim{pointer-events:none}
@media (max-width:640px){.arch3d-stage{height:400px}.arch3d-node{font-size:9.5px;padding:2px 6px;gap:4px}.arch3d-node i{width:6px;height:6px}.arch3d-node.dim{visibility:hidden}.arch3d-lane{font-size:9px;letter-spacing:.04em}.arch3d-hint{display:none}}
`;
let styled = false;
const hex = n => '#' + n.toString(16).padStart(6, '0');
const isDark = () => document.documentElement.dataset.ykTheme === 'dark' || (!document.documentElement.dataset.ykTheme && matchMedia('(prefers-color-scheme: dark)').matches);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const live = new Set();
export function mountAll(root = document) {
  root.querySelectorAll('.arch3d-host:not([data-mounted])').forEach(el => { const spec = SPECS[el.dataset.arch]; if (spec) { el.dataset.mounted = '1'; live.add(mount(el, spec)); } });
}
export function disposeAll() { live.forEach(d => d()); live.clear(); }

export function mount(host, spec) {
  if (!styled) { const st = document.createElement('style'); st.textContent = STYLE; document.head.append(st); styled = true; }
  host.innerHTML = `<div class="arch3d"><div class="arch3d-stage"><div class="arch3d-labels"></div><span class="arch3d-hint">拖曳旋轉 · 點節點看說明</span><div class="arch3d-zoom"><button type="button" data-z="-1" aria-label="放大">＋</button><button type="button" data-z="1" aria-label="縮小">－</button></div><div class="arch3d-info" hidden><button type="button" aria-label="關閉說明">×</button><small></small><b></b><span></span></div></div>
    <div class="arch3d-bar"><div class="arch3d-steps" role="group" aria-label="流程步驟"><button type="button" class="arch3d-play">▶ 播放流程</button><button type="button" data-step="-1" aria-pressed="true">全部</button>${spec.steps.map((s, i) => `<button type="button" data-step="${i}" aria-pressed="false">${i + 1}. ${s.t}</button>`).join('')}</div>
    <p class="arch3d-caption" aria-live="polite"></p>
    <div class="arch3d-legend">${Object.values(KIND).map(k => `<span><i style="background:${hex(k.color)}"></i>${k.label}</span>`).join('')}</div></div></div>`;
  const stage = host.querySelector('.arch3d-stage'), labels = host.querySelector('.arch3d-labels'), info = host.querySelector('.arch3d-info'), caption = host.querySelector('.arch3d-caption');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { stage.innerHTML = '<p style="padding:24px;color:var(--yk-muted)">這台裝置無法顯示 3D 架構圖，請參考下方的流程圖。</p>'; return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); stage.prepend(renderer.domElement);
  const lr = new CSS2DRenderer({ element: labels });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .5, 400);
  const home = { pos: new THREE.Vector3(0, 34, 40), target: new THREE.Vector3(0, 0, 0) };
  camera.position.copy(home.pos);
  const controls = new OrbitControls(camera, renderer.domElement); controls.target.copy(home.target);
  controls.addEventListener('start', () => { goal.pos = goal.target = null; });
  controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false; controls.minPolarAngle = .25; controls.maxPolarAngle = 1.25; controls.minAzimuthAngle = -1.1; controls.maxAzimuthAngle = 1.1;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a80, 1.4)); const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-20, 40, 25); scene.add(sun);

  const laneMat = new THREE.MeshStandardMaterial({ color: 0xe7ebdf, roughness: 1, transparent: true, opacity: .75 });
  const zs = spec.nodes.map(n => n.z), zMin = Math.min(...zs) - 3.5, zMax = Math.max(...zs) + 3;
  home.target.set(0, 0, (zMin + zMax) / 2 + .5); controls.target.copy(home.target);
  for (const l of spec.lanes) {
    const plane = new THREE.Mesh(new THREE.BoxGeometry(12.5, .2, zMax - zMin), laneMat); plane.position.set(l.x, -.1, (zMin + zMax) / 2); scene.add(plane);
    const el = document.createElement('div'); el.className = 'arch3d-lane'; el.textContent = l.label; const o = new CSS2DObject(el); o.position.set(l.x, 0, zMin - .8); scene.add(o);
  }
  const nodes = new Map();
  for (const n of spec.nodes) {
    const x = spec.lanes[n.lane].x, k = KIND[n.kind];
    const g = new THREE.Group(); g.position.set(x, 0, n.z); scene.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(9.5, .9, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, transparent: true }));
    body.position.y = .45; g.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(9.5, .12, 3), new THREE.MeshStandardMaterial({ color: k.color, emissive: k.color, emissiveIntensity: .15, transparent: true })); top.position.y = .96; g.add(top);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'arch3d-node'; el.innerHTML = `<i style="background:${hex(k.color)}"></i>${n.t}`;
    el.addEventListener('click', e => { e.stopPropagation(); select(n.id); });
    const lo = new CSS2DObject(el); lo.position.set(0, 2.1, 0); g.add(lo);
    body.userData.id = top.userData.id = n.id;
    nodes.set(n.id, { n, g, body, top, el, x, z: n.z });
  }
  // edges: arcs between platforms with packets flowing along them
  const edges = spec.edges.map(([a, b, label], i) => {
    const A = nodes.get(a), B = nodes.get(b); const same = A.x === B.x, back = B.x < A.x;
    const sx = same ? A.x + 4.75 : A.x + (back ? -4.75 : 4.75), ex = same ? B.x + 4.75 : B.x + (back ? 4.75 : -4.75);
    const p0 = new THREE.Vector3(sx, .7, A.z), p2 = new THREE.Vector3(ex, .7, B.z);
    const mid = new THREE.Vector3((sx + ex) / 2 + (same ? 3 : 0), back ? 5.5 : 2.4 + Math.abs(A.z - B.z) * .08, (A.z + B.z) / 2);
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9aa59a, transparent: true, opacity: .55 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .06, 6), mat); scene.add(tube);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.28, .7, 10), mat); arrow.position.copy(curve.getPoint(.97)); arrow.lookAt(curve.getPoint(1)); arrow.rotateX(Math.PI / 2); scene.add(arrow);
    const pk = []; for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshBasicMaterial({ color: KIND[A.n.kind].color, transparent: true })); scene.add(m); pk.push({ m, t: k / 3 }); }
    const el = document.createElement('div'); el.className = 'arch3d-edge'; el.textContent = label; const lo = new CSS2DObject(el); lo.position.copy(curve.getPoint(.5)).add(new THREE.Vector3(0, .5, 0)); scene.add(lo);
    return { i, a, b, curve, mat, arrow, pk, el, on: true };
  });

  let step = -1, playing = false, playTimer = 0, selected = null, ready = false;
  function applyStep() {
    const active = step < 0 ? null : new Set(spec.steps[step].e);
    const used = new Set(); if (active) active.forEach(i => { used.add(edges[i].a); used.add(edges[i].b); });
    edges.forEach(e => { e.on = !active || active.has(e.i); e.mat.opacity = e.on ? (active ? .95 : .5) : .1; e.mat.color.set(active && e.on ? 0xe0762b : (isDark() ? 0x7d8a80 : 0x9aa59a)); e.el.classList.toggle('on', !!active && e.on); e.pk.forEach(p => p.m.visible = e.on); });
    nodes.forEach(o => { const on = !active || used.has(o.n.id); o.el.classList.toggle('dim', !on); o.body.material.opacity = o.top.material.opacity = on ? 1 : .3; o.top.material.emissiveIntensity = active && on ? .6 : .15; });
    host.querySelectorAll('[data-step]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.step === step)));
    if (ready) frame(active ? [...used] : null);
    caption.innerHTML = step < 0 ? `<b>${spec.title}</b>　按「播放流程」依序看資料怎麼流動，或點任一步驟。` : `<b>${step + 1}. ${spec.steps[step].t}</b>　${spec.steps[step].d}`;
  }
  function select(id) {
    selected = id; const o = nodes.get(id); nodes.forEach(x => x.el.classList.toggle('sel', x.n.id === id));
    const k = KIND[o.n.kind]; info.hidden = false; info.querySelector('small').textContent = k.label; info.querySelector('small').style.background = hex(k.color);
    info.querySelector('b').textContent = o.n.t; info.querySelector('span').textContent = o.n.d;
  }
  info.querySelector('button').addEventListener('click', () => { info.hidden = true; nodes.forEach(x => x.el.classList.remove('sel')); });
  host.querySelector('.arch3d-steps').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('arch3d-play')) { playing = !playing; b.textContent = playing ? '❚❚ 暫停' : '▶ 播放流程'; if (playing) { step = step >= spec.steps.length - 1 ? 0 : step + 1; playTimer = 0; applyStep(); } return; }
    playing = false; host.querySelector('.arch3d-play').textContent = '▶ 播放流程'; step = +b.dataset.step; applyStep();
  });
  host.querySelector('.arch3d-zoom').addEventListener('click', e => { const z = +e.target.closest('button')?.dataset.z; if (!z) return; const dir = camera.position.clone().sub(controls.target); const len = THREE.MathUtils.clamp(dir.length() * (z > 0 ? 1.18 : .85), 18, 160); camera.position.copy(controls.target).add(dir.setLength(len)); });
  // click on platforms too
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects([...nodes.values()].flatMap(o => [o.body, o.top]))[0]; if (hit) select(hit.object.userData.id);
  });

  function theme() { laneMat.color.set(isDark() ? 0x233426 : 0xe7ebdf); nodes.forEach(o => o.body.material.color.set(isDark() ? 0x2a3a2e : 0xffffff)); applyStep(); }
  const onTheme = () => theme(); addEventListener('yk:theme', onTheme);
  // frame the whole diagram for the current shape of the box
  const DIR = new THREE.Vector3(0, .8, .6).normalize();
  const goal = { pos: null, target: null };
  // frame a set of nodes (all of them by default); the camera eases there in tick()
  function frame(ids, instant) {
    const list = ids ? ids.map(id => nodes.get(id)) : [...nodes.values()];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    list.forEach(o => { x0 = Math.min(x0, o.x - 5.5); x1 = Math.max(x1, o.x + 5.5); z0 = Math.min(z0, o.z - 2.5); z1 = Math.max(z1, o.z + 2.5); });
    if (!ids) { z0 -= 1.5; }
    const v = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const d = Math.max(((x1 - x0) / 2) / Math.tan(hf / 2), ((z1 - z0) * .6) / Math.tan(v / 2)) * .9;
    const target = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const az = controls.getAzimuthalAngle(), dir = DIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), az);
    goal.target = target; goal.pos = target.clone().addScaledVector(dir, Math.max(16, d));
    if (instant || reduced) { camera.position.copy(goal.pos); controls.target.copy(goal.target); goal.pos = goal.target = null; controls.update(); }
  }
  function fit() { frame(null, true); }
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w) return; renderer.setSize(w, h); lr.setSize(w, h); camera.aspect = w / h; camera.fov = w < 640 ? 50 : 36; camera.updateProjectionMatrix(); fit(); }
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  let visible = true, raf = 0, last = 0;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); }); io.observe(stage);
  function tick(now) {
    raf = 0; const dt = Math.min(.05, last ? (now - last) / 1000 : 0); last = now;
    if (!reduced) edges.forEach(e => { if (!e.on) return; const sp = step >= 0 ? .55 : .3; e.pk.forEach(p => { p.t = (p.t + dt * sp) % 1; p.m.position.copy(e.curve.getPoint(p.t)); }); });
    else edges.forEach(e => e.pk.forEach(p => p.m.position.copy(e.curve.getPoint(p.t))));
    if (playing) { playTimer += dt; if (playTimer > 4.5) { playTimer = 0; step = (step + 1) % spec.steps.length; applyStep(); } }
    if (goal.pos) { const k = 1 - Math.exp(-dt * 3); camera.position.lerp(goal.pos, k); controls.target.lerp(goal.target, k); if (camera.position.distanceTo(goal.pos) < .05) goal.pos = goal.target = null; }
    controls.update(); renderer.render(scene, camera); lr.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(tick); else last = 0;
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(tick); });
  theme(); ready = true; raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener('yk:theme', onTheme); renderer.dispose(); host.innerHTML = ''; delete host.dataset.mounted; };
}
