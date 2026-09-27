/* Shared, local-only UI localization. User input and saved records are never translated. */
(() => {
  'use strict';
  const KEY='yichi-language', doc=document.documentElement, dict=window.YKEnglish||{};
  let language='zh';
  try {language=localStorage.getItem(KEY)==='en'?'en':'zh';} catch {}
  const originals=new WeakMap(),attributes=new WeakMap(),surfaces=new Set([doc]);
  const normal=s=>s.replace(/\s+/g,' ').trim();
  const entries=Object.keys(dict).sort((a,b)=>b.length-a.length);
  // Exact copy wins; phrase matching handles labels containing live counts and names.
  const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp(entries.filter(s=>s.length>1).map(escaped).join('|'),'g');
  function english(value){
    const source=String(value??''),key=normal(source);
    if(Object.hasOwn(dict,key))return (source.match(/^\s*/)?.[0]||'')+dict[key]+(source.match(/\s*$/)?.[0]||'');
    return source.replace(pattern,match=>dict[match])
      .replace(/第\s*(\d+)\s*列、第\s*(\d+)\s*格：/g,'Row $1, cell $2: ')
      .replace(/(\d+(?:\.\d+)?)\s*步/g,'$1 moves')
      .replace(/(\d+(?:\.\d+)?)\s*秒/g,'$1 s')
      .replace(/第\s*(\d+)\s*鏡/g,'Shot $1')
      .replace(/第\s*(\d+)\s*張/g,'Card $1')
      .replace(/(\d+)\s*張/g,'$1 cards')
      .replace(/(\d+)\s*鏡/g,'$1 shots')
      .replace(/(\d+)\s*位/g,'$1 people')
      .replace(/(\d+)\s*人/g,'$1 people')
      .replace(/(\d+)\s*分/g,'$1 pts')
      .replace(/第\s*(\d+)/g,'$1')
      .replace(/Edit card (\d+) shots/g,'Edit shot $1')
      .replace(/Go to shot (\d+) shots/g,'Go to shot $1')
      .replace(/(Move up|Move down|Remove)Point/g,'$1 point');
  }
  const t=value=>language==='en'?english(value):value;
  const ignore='script,style,textarea,input,pre,code,svg,math,[contenteditable],[data-i18n-ignore],[translate="no"],.scene-item-row>span,.pose-preset-btn';
  function text(node){
    if(!node.parentElement||node.parentElement.closest(ignore))return;
    const current=node.nodeValue,prior=originals.get(node);
    const source=prior&&current===prior.output?prior.source:current;
    const output=t(source);
    if(output!==current)node.nodeValue=output;
    if(source!==output||prior)originals.set(node,{source,output});
  }
  function element(el){
    if(el.closest('[data-i18n-ignore],[translate="no"]'))return;
    let saved=attributes.get(el);if(!saved){saved={};attributes.set(el,saved);}
    for(const attr of ['placeholder','title','aria-label','alt',...(el.matches('meta[name="description"],meta[property="og:title"],meta[property="og:description"]')?['content']:[])]){
      if(!el.hasAttribute(attr))continue;
      const current=el.getAttribute(attr),prior=saved[attr],source=prior&&current===prior.output?prior.source:current,output=t(source);
      if(current!==output)el.setAttribute(attr,output);
      saved[attr]={source,output};
    }
  }
  function translate(root){
    if(root.nodeType===3){text(root);return;}
    if(root.nodeType===1){element(root);if(root.matches(ignore))return;}
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(node){
      if(node.nodeType===1&&node.matches(ignore)) {element(node);return NodeFilter.FILTER_REJECT;}
      return NodeFilter.FILTER_ACCEPT;
    }});
    while(walker.nextNode()){const n=walker.currentNode;n.nodeType===3?text(n):element(n);}
  }
  let observer,button;
  function mountButton(){
    if(!button)return;
    const host=document.querySelector('.yk-site-nav-actions,.yk-nav,.game-nav,header.nav,.storyboard-bridge-actions');
    const target=host||document.body;
    if(target&&button.parentNode!==target)target.append(button);
    button.classList.toggle('yk-language-floating',!host);
  }
  const observe=()=>surfaces.forEach(root=>observer?.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','alt','placeholder','content']}));
  function apply(){
    observer?.disconnect();mountButton();doc.lang=language==='en'?'en':'zh-Hant';doc.dataset.language=language;
    if(button){button.textContent=language==='en'?'中文':'EN';button.lang=language==='en'?'zh-Hant':'en';button.title=button.getAttribute('aria-label')||'';button.setAttribute('aria-label',language==='en'?'切換至繁體中文':'Switch to English');button.title=button.getAttribute('aria-label');}
    surfaces.forEach(translate);observe();
  }
  function setLanguage(value,persist=true){
    language=value==='en'?'en':'zh';if(persist)try{localStorage.setItem(KEY,language);}catch{}
    apply();window.dispatchEvent(new CustomEvent('yk:language',{detail:{language}}));
    // Storage events do not reach same-document frames until the next task.
    document.querySelectorAll('iframe').forEach(frame=>{try{frame.contentWindow.YKLanguage?.set(language,false);}catch{}});
  }
  const data=value=>typeof value==='string'?t(value):Array.isArray(value)?value.map(data):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,data(v)])):value;
  window.YKLanguage={get language(){return language;},t,english,data,set:setLanguage,refresh:apply,register(root){surfaces.add(root);apply();}};
  doc.lang=language==='en'?'en':'zh-Hant';doc.dataset.language=language;
  window.addEventListener('storage',e=>{if(e.key===KEY)setLanguage(e.newValue,false);});
  // Native dialogs contain system copy but not form data.
  for(const name of ['alert','confirm','prompt']){const native=window[name].bind(window);window[name]=(message,...rest)=>native(t(message),...rest);}
  document.addEventListener('DOMContentLoaded',()=>{
    button=document.createElement('button');button.type='button';button.className='yk-language-toggle';button.dataset.i18nIgnore='';
    mountButton();
    button.addEventListener('click',()=>setLanguage(language==='en'?'zh':'en'));
    observer=new MutationObserver(records=>{
      observer.disconnect();
      const roots=new Set();for(const r of records){if(r.type==='childList')r.addedNodes.forEach(n=>roots.add(n));else roots.add(r.target);}
      roots.forEach(n=>{if(n.isConnected)translate(n);});mountButton();observe();
    });
    apply();
  });
})();
