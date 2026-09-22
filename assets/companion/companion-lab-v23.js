(() => {
  const start = document.getElementById('start-companion');
  start.addEventListener('click', () => document.dispatchEvent(new Event('companion:open')));
  document.addEventListener('companion:state', event => {
    const state = event.detail;
    document.body.dataset.companionOpen = String(state.open);
    document.getElementById('live-state').textContent = state.open ? state.label : '等待召喚';
    start.querySelector('span').textContent = state.open ? '開啟角色選單' : '召喚小精靈';
    document.querySelectorAll('[data-step]').forEach(step => { step.dataset.active = String(state.open && step.dataset.step === state.mode); });
  });
})();
