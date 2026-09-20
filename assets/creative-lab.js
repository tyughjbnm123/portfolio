(() => {
  'use strict';
  const phases={
    approach:{title:'先確認，這裡能不能互動。',description:'依玩家所在場景、距離與活動點占用情況，確認可使用的活動，再由玩家按鍵啟動。',note:'互動入口：場景、位置與可用性'},
    interact:{title:'讓活動在主遊戲中開始。',description:'環境分支會保存玩家狀態、預約點位，再處理對齊、動畫與必要道具；互動期間接管一般移動。',note:'執行期間：點位使用權與動作管理'},
    restore:{title:'結束後，把操作交還玩家。',description:'退出時釋放活動點、清理自有道具，並分項恢復所保存的狀態。指定歷史測試已有還原紀錄，完整回歸仍待補齊。',note:'驗證重點：退出後能否回到原本的遊戲'}
  };
  document.querySelectorAll('[data-phase-button]').forEach(button=>button.addEventListener('click',()=>{
    const data=phases[button.dataset.phaseButton];if(!data)return;
    document.querySelectorAll('[data-phase-button]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    for(const [id,value] of Object.entries({'cl-phase-title':data.title,'cl-phase-description':data.description,'cl-phase-note':data.note}))document.getElementById(id).textContent=value;
  }));
  document.querySelectorAll('[data-visual-filter]').forEach(button=>button.addEventListener('click',()=>{
    const kind=button.dataset.visualFilter;
    document.querySelectorAll('[data-visual-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    document.querySelectorAll('[data-visual-kind]').forEach(item=>item.hidden=kind!=='all'&&item.dataset.visualKind!==kind);
  }));
  const dialog=document.getElementById('cl-lightbox'),image=document.getElementById('cl-lightbox-image');
  let lastTrigger=null;
  document.querySelectorAll('.cl-art-link').forEach(link=>link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();lastTrigger=link;
    document.getElementById('cl-lightbox-title').textContent=link.dataset.artTitle;
    document.getElementById('cl-lightbox-caption').textContent=link.dataset.artCaption;
    image.alt=link.querySelector('img').alt;image.src=link.href;
    dialog.showModal();
  }));
  document.getElementById('cl-lightbox-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>lastTrigger?.focus({preventScroll:true}));
  dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
})();
