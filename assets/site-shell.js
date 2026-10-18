(() => {
  const siteRoot = new URL('../', document.currentScript.src);
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
    // Resolve from this script so /portfolio/ and nested /music/ both work.
    document.querySelectorAll('a[href]').forEach(link=>{
      const url=new URL(link.href);
      if(url.href===new URL('index.html#tools',siteRoot).href)link.href=new URL('tools.html',siteRoot).href;
    });
    if(document.body.classList.contains('yk-tool-page')) {
      function mountToolNavigation(){
        const registry=window.ToolRoom;if(!registry)return;
        const current=registry.tools.find(tool=>new URL(tool.path,siteRoot).pathname===location.pathname||new URL(tool.path,siteRoot).pathname+'index.html'===location.pathname);
        if(!current)return;
        let nav=document.querySelector('.yk-tool-nav');
        if(!nav){nav=document.createElement('nav');nav.className='yk-tool-nav';document.querySelector('.yk-site-nav')?.after(nav);}
        nav.setAttribute('data-i18n-ignore','');
        const render=()=>{
          const en=document.documentElement.lang==='en';nav.setAttribute('aria-label',en?'Tools in this category':'同類工具導覽');nav.replaceChildren();
          const all=document.createElement('a');all.href=new URL('tools.html',siteRoot).href;all.textContent=en?'← All tools':'← 全部工具';nav.append(all);
          const category=registry.categories.find(c=>c.id===current.group),group=document.createElement('a');group.href=new URL('tools.html?category='+category.id,siteRoot).href;group.textContent=en?category.en:category.title;nav.append(group);
          registry.tools.filter(tool=>tool.group===current.group).forEach(tool=>{const link=document.createElement('a');link.href=new URL(tool.path,siteRoot).href;link.textContent=en?tool.en.short:tool.short;if(tool.id===current.id)link.setAttribute('aria-current','page');nav.append(link);});
        };
        render();window.addEventListener('yk:language',render);
        window.addEventListener('storage',event=>{if(event.key==='yichi-language')setTimeout(render,0);});
      }
      if(window.ToolRoom)mountToolNavigation();else{
        const script=document.createElement('script');script.src=new URL('assets/tool-room.js?v=categories-1',siteRoot).href;script.onload=mountToolNavigation;document.head.append(script);
      }
    }
    document.querySelectorAll('.yk-content-nav').forEach(nav => {
      nav.setAttribute('aria-label', '主導覽');
      if (!nav.querySelector('a[href="index.html#games"]')) {
        const games = document.createElement('a');
        games.href = 'index.html#games';
        const number = document.createElement('span');
        number.textContent = '05';
        games.append(number, document.createTextNode('我的遊戲室'));
        nav.append(games);
      }
    });
    apply();
    const toolNav=document.querySelector('.yk-tool-nav'),activeTool=toolNav?.querySelector('[aria-current="page"]');
    if(toolNav&&activeTool&&matchMedia('(max-width:780px)').matches){const bounds=toolNav.getBoundingClientRect(),item=activeTool.getBoundingClientRect();toolNav.scrollLeft=Math.max(0,item.left-bounds.left-(toolNav.clientWidth-item.width)/2);}
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
