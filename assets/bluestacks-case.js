(() => {
  'use strict';
  const scenarios = {
    leveling: { label: '自動練等', steps: [
      { title: '回到練等起點', short: '從固定畫面開始', kind: 'START / 固定起點', description: '先將遊戲放在預定的起始畫面，讓腳本的第一個操作有一致的位置與順序。', note: '設計重點：每一輪從相同狀態開始。' },
      { title: '執行練等操作', short: '重播預定輸入', kind: 'ACTION / 操作序列', description: '依腳本安排重播練等所需的輸入，把反覆點選或按鍵整理成固定的操作順序。', note: '設計重點：一次整理一段可以重複使用的操作。' },
      { title: '等待戰鬥與結算', short: '保留畫面轉換時間', kind: 'WAIT / 操作間隔', description: '在戰鬥、載入與結算之間保留等待時間，再銜接後續操作，讓輸入配合畫面轉換。', note: '設計重點：等待時間要配合實際遊戲節奏。' },
      { title: '銜接下一輪', short: '返回起點後重複', kind: 'LOOP / 下一輪', description: '將這輪的結束步驟接回固定起點，再依設定重複。流程偏離預期時，應先停止並調整。', note: '設計重點：結束位置必須能銜接下一輪的開始。' }
    ] },
    quests: { label: '任務操作', steps: [
      { title: '開啟任務入口', short: '從固定入口開始', kind: 'START / 任務入口', description: '先將遊戲停在預定入口，讓腳本從一致的位置開啟任務或選單。', note: '設計重點：先確定操作從哪個畫面開始。' },
      { title: '執行任務步驟', short: '依序完成預定輸入', kind: 'ACTION / 任務序列', description: '將任務中反覆出現的點選、確認與其他輸入整理成順序，交由腳本重播。', note: '設計重點：把固定操作與需要人工判斷的部分分清楚。' },
      { title: '銜接對話與結算', short: '等待轉場後繼續', kind: 'WAIT / 畫面銜接', description: '在對話或結算畫面之間安排等待與後續輸入，讓任務操作能按原定節奏接續。', note: '設計重點：畫面轉換時避免過早送出下一個操作。' },
      { title: '返回操作起點', short: '結束或銜接下一段', kind: 'RETURN / 流程收尾', description: '完成這段任務操作後，回到預定畫面，作為本輪結束或下一段腳本的起點。', note: '設計重點：每段腳本都有明確的開始與結束。' }
    ] }
  };
  const modeButtons = [...document.querySelectorAll('[data-bs-mode]')];
  const stepButtons = [...document.querySelectorAll('[data-bs-step]')];
  const play = document.getElementById('bs-play');
  const stop = document.getElementById('bs-stop');
  const state = document.getElementById('bs-play-state');
  const progress = document.querySelector('.bs-progress');
  let mode = 'leveling', stepIndex = 0, timer = null;
  const put = (id, text) => { document.getElementById(id).textContent = text; };
  function render() {
    const scenario = scenarios[mode], step = scenario.steps[stepIndex];
    modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.bsMode === mode)));
    stepButtons.forEach((button, index) => {
      button.querySelector('strong').textContent = scenario.steps[index].title;
      button.querySelector('small').textContent = scenario.steps[index].short;
      if (index === stepIndex) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const number = String(stepIndex + 1).padStart(2, '0');
    put('bs-scenario-label', scenario.label); put('bs-stage-count', `${number} / 04`); put('bs-stage-number', number);
    put('bs-step-kind', step.kind); put('bs-step-title', step.title); put('bs-step-description', step.description); put('bs-step-note', step.note);
    progress.setAttribute('aria-valuenow', String(stepIndex + 1));
    progress.setAttribute('aria-valuetext', `第 ${stepIndex + 1} 步，共 4 步：${step.title}`);
    document.getElementById('bs-progress-fill').style.width = `${(stepIndex + 1) * 25}%`;
  }
  function finish(message) {
    if (timer !== null) clearTimeout(timer);
    timer = null; play.disabled = false; stop.disabled = true; play.textContent = '播放流程'; state.textContent = message;
  }
  function tick() {
    if (stepIndex >= 3) { finish('示意播放完成'); return; }
    stepIndex++; render(); timer = setTimeout(tick, 1700);
  }
  modeButtons.forEach(button => button.addEventListener('click', () => {
    if (!scenarios[button.dataset.bsMode]) return;
    finish('點選步驟，或播放示意'); mode = button.dataset.bsMode; stepIndex = 0; render();
  }));
  stepButtons.forEach((button, index) => button.addEventListener('click', () => {
    finish('正在查看這個步驟'); stepIndex = index; render();
  }));
  play.addEventListener('click', () => {
    finish('示意播放中'); stepIndex = 0; render(); play.disabled = true; play.textContent = '播放中'; stop.disabled = false;
    timer = setTimeout(tick, 1700);
  });
  stop.addEventListener('click', () => finish('已停止示意，可點選其他步驟'));
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer !== null) finish('已停止示意'); });
  window.addEventListener('pagehide', () => finish('已停止示意'));
  render();
})();
