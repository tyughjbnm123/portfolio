(() => {
  'use strict';
  const flows = {
    tap: {
      titles: ['點擊螢幕', '切換開關狀態', '顯示切換＋音效'],
      nodes: ['Screen Tap', 'Switch → Pulse', 'Visible / Audio Player'],
      explanation: '點擊切換圖像的顯示狀態；音效由另一條開關分支在開啟時觸發。這兩條連線共同形成點擊回饋。'
    },
    drag: {
      titles: ['在螢幕上拖曳', '換算平面座標', '改變圖像位置'],
      nodes: ['Screen Pan', 'Divide → Unpack → Pack', 'rectangle0 · 2D Position'],
      explanation: '取得手勢的水平與垂直位移，經數值換算並組合成座標，再連到圖像的 2D Position，讓圖像位置回應拖曳。'
    },
    pinch: {
      titles: ['雙指捏合', '組合縮放數值', '放大或縮小圖像'],
      nodes: ['Screen Pinch', 'Scale → Pack', 'rectangle0 · 2D Scale'],
      explanation: '將雙指捏合產生的 Scale 值組合成縮放向量，連到圖像的 2D Scale，調整它在畫面中占的大小。'
    },
    rotate: {
      titles: ['雙指旋轉', '換算旋轉數值', '改變圖像角度'],
      nodes: ['Screen Rotate', 'Multiply → Pack', 'rectangle0 · 3D Rotation'],
      explanation: '將手勢的 Rotation 值經 Multiply 換算，再組合成旋轉向量，連到圖像的旋轉屬性。'
    }
  };
  const buttons = [...document.querySelectorAll('[data-flow]')];
  const explanation = document.getElementById('ar-flow-explanation');
  buttons.forEach(button => button.addEventListener('click', () => {
    const flow = flows[button.dataset.flow];
    if (!flow || !explanation) return;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    flow.titles.forEach((title, index) => {
      document.querySelector(`[data-flow-title="${index}"]`).textContent = title;
      document.querySelector(`[data-flow-node="${index}"]`).textContent = flow.nodes[index];
    });
    explanation.textContent = flow.explanation;
  }));
})();
