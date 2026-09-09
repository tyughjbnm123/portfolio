(() => {
  const doc = document.documentElement;
  let mode = 'auto';
  try { mode = localStorage.getItem('yichi-color-scheme') || 'auto'; } catch {}
  if (!['auto','light','dark'].includes(mode)) mode='auto';
  const system = matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    const dark = mode === 'dark' || (mode === 'auto' && system.matches);
    doc.dataset.ykTheme = dark ? 'dark' : 'light';
    doc.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelectorAll('.yk-theme-toggle').forEach(b => {
      b.textContent = dark ? '☼' : '◐';
      b.setAttribute('aria-label',dark ? '切換至淺色' : '切換至深色');
      b.title = b.getAttribute('aria-label');
    });
    dispatchEvent(new Event('yk:theme'));
  }
  apply();
  system.addEventListener('change',apply);
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('.yk-theme-toggle').forEach(b => b.addEventListener('click',()=>{
      mode = doc.dataset.ykTheme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('yichi-color-scheme',mode); } catch {}
      apply();
    }));
    // Collapsible material settings remain keyboard accessible.
    const head = document.getElementById('mat-head');
    if (head) {
      head.tabIndex=0; head.setAttribute('role','button'); head.setAttribute('aria-controls','mat-body');
      const panel=document.getElementById('mat-panel');
      const sync=()=>head.setAttribute('aria-expanded',String(!panel.classList.contains('collapsed')));
      sync(); new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class']});
      head.addEventListener('keydown',e=>{if(e.target===head&&['Enter',' '].includes(e.key)){e.preventDefault();head.click();}});
    }
  });
})();
